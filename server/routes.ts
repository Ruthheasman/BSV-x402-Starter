import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import {
  setupMiddleware,
  getAuthMiddleware,
  getPaymentMiddleware,
} from "./middleware/payment-setup";
import { endpoints, SERVICE_NAME, SERVICE_VERSION } from "./config";
import { handlers } from "./services/example";
import { getPublicKey, isWalletConfigured } from "./wallet";
import { satsToUsd } from "@shared/schema";
import { storage } from "./storage";
import crypto from "crypto";

const startTime = Date.now();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || null;

function generateAdminToken(password: string): string {
  return crypto.createHash("sha256").update(`admin-token:${password}`).digest("hex").slice(0, 32);
}

function adminAuth(req: Request, res: Response, next: NextFunction) {
  if (!ADMIN_PASSWORD) {
    return next();
  }
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token as string | undefined;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : queryToken;
  const expectedToken = generateAdminToken(ADMIN_PASSWORD);
  if (token === expectedToken) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupMiddleware();

  const authMw = getAuthMiddleware();
  const paymentMw = getPaymentMiddleware();

  app.get("/.well-known/x402-info", (_req: Request, res: Response) => {
    const manifest = {
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      protocol: "bsv-x402",
      identity: getPublicKey(),
      endpoints: endpoints.map((e) => ({
        path: e.path,
        method: e.method,
        auth: e.price > 0,
        payment:
          e.price > 0
            ? {
                satoshis: e.price,
                usd_approx: satsToUsd(e.price),
                currency: "BSV",
              }
            : null,
        description: e.description,
        ...(e.accepts
          ? {
              accepts: {
                "content-type": e.accepts.contentType,
                body: e.accepts.body,
              },
            }
          : {}),
        ...(e.returns
          ? {
              returns: {
                "content-type": e.returns.contentType,
                body: e.returns.body,
              },
            }
          : {}),
      })),
      pricing: {
        model: "per-request",
        tiers:
          "micro ($0.06), standard ($0.30-0.50), premium ($1.25-2.00)",
        currency: "satoshis",
        note: "Prices reflect real AI generation costs with 3x margin",
      },
      refunds: {
        supported: true,
        policy: "manual-on-failure",
        description:
          "If a handler fails after payment, the error response includes refund eligibility details (amount and sender key). Refunds are logged server-side and processed manually by the operator.",
      },
    };

    res.json(manifest);
  });

  app.get("/api/status", (_req: Request, res: Response) => {
    const uptime = (Date.now() - startTime) / 1000;
    res.json({
      status: "online",
      uptime,
      version: SERVICE_VERSION,
      service: SERVICE_NAME,
      endpoints,
      walletConfigured: isWalletConfigured(),
      totalEndpoints: endpoints.length,
      paidEndpoints: endpoints.filter((e) => e.price > 0).length,
      freeEndpoints: endpoints.filter((e) => e.price === 0).length,
    });
  });

  app.post("/api/admin/login", (req: Request, res: Response) => {
    if (!ADMIN_PASSWORD) {
      return res.json({ token: null, requiresPassword: false });
    }
    const { password } = req.body || {};
    if (!password) {
      return res.json({ token: null, requiresPassword: true });
    }
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Invalid password" });
    }
    res.json({ token: generateAdminToken(ADMIN_PASSWORD), requiresPassword: true });
  });

  app.get("/api/admin/stats", adminAuth, async (_req: Request, res: Response) => {
    try {
      const stats = await storage.getUsageStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/requests", adminAuth, async (req: Request, res: Response) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const requests = await storage.getRecentRequests(limit);
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/refunds", adminAuth, async (_req: Request, res: Response) => {
    try {
      const refunds = await storage.getAllRefunds();
      res.json(refunds);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/refunds/:id/resolve", adminAuth, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const refund = await storage.resolveRefund(id);
      if (!refund) {
        return res.status(404).json({ error: "Refund not found" });
      }
      res.json(refund);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  function wrapWithLogging(
    handlerFn: (req: Request, res: Response) => void,
    endpointConfig: typeof endpoints[0]
  ) {
    return async (req: Request, res: Response) => {
      const requestStart = Date.now();
      const payment = (req as any).payment;
      const satoshisPaid = payment?.satoshisPaid || 0;
      const senderKey = (req as any).auth?.identityKey || null;

      const originalJson = res.json.bind(res);
      let responseStatusCode = 200;

      const originalStatus = res.status.bind(res);
      res.status = (code: number) => {
        responseStatusCode = code;
        return originalStatus(code);
      };

      res.json = ((body: any) => {
        if (responseStatusCode >= 400 && satoshisPaid > 0) {
          console.log(
            `[refund] Handler returned ${responseStatusCode} after payment of ${satoshisPaid} sats to ${senderKey || "unknown"}`
          );
          if (body && typeof body === "object") {
            body.refund = {
              status: "eligible",
              satoshis: satoshisPaid,
              senderIdentityKey: senderKey || null,
            };
          }

          storage.addRefund({
            endpoint: endpointConfig.path,
            method: endpointConfig.method,
            satoshis: satoshisPaid,
            senderIdentityKey: senderKey,
            error: body?.error || body?.description || `HTTP ${responseStatusCode}`,
            status: "pending",
          }).catch((err) => console.error("[refund] Failed to persist refund:", err.message));
        }

        const durationMs = Date.now() - requestStart;
        storage.logRequest({
          endpoint: endpointConfig.path,
          method: endpointConfig.method,
          statusCode: responseStatusCode,
          satoshisPaid,
          senderIdentityKey: senderKey,
          tier: endpointConfig.tier,
          durationMs,
          error: responseStatusCode >= 400 ? (body?.error || body?.description || null) : null,
        }).catch((err) => console.error("[log] Failed to persist request log:", err.message));

        return originalJson(body);
      }) as any;

      try {
        await Promise.resolve(handlerFn(req, res));
      } catch (error: any) {
        const durationMs = Date.now() - requestStart;
        console.error(
          `[refund] Handler threw after payment of ${satoshisPaid} sats:`,
          error.message || error
        );

        if (satoshisPaid > 0) {
          storage.addRefund({
            endpoint: endpointConfig.path,
            method: endpointConfig.method,
            satoshis: satoshisPaid,
            senderIdentityKey: senderKey,
            error: error.message || "Handler threw an exception",
            status: "pending",
          }).catch((err) => console.error("[refund] Failed to persist refund:", err.message));
        }

        storage.logRequest({
          endpoint: endpointConfig.path,
          method: endpointConfig.method,
          statusCode: 500,
          satoshisPaid,
          senderIdentityKey: senderKey,
          tier: endpointConfig.tier,
          durationMs,
          error: error.message || "Handler threw an exception",
        }).catch((err) => console.error("[log] Failed to persist request log:", err.message));

        if (!res.headersSent) {
          originalStatus(500);
          originalJson({
            status: "error",
            code: "ERR_HANDLER_FAILED",
            description: error.message || "The service encountered an error processing your request.",
            refund: satoshisPaid > 0
              ? {
                  status: "eligible",
                  satoshis: satoshisPaid,
                  senderIdentityKey: senderKey || null,
                }
              : undefined,
          });
        }
      }
    };
  }

  for (const endpoint of endpoints) {
    const handler = handlers[endpoint.handler];
    if (!handler) {
      console.warn(
        `[routes] No handler found for "${endpoint.handler}" (${endpoint.method} ${endpoint.path})`
      );
      continue;
    }

    const wrappedHandler = wrapWithLogging(handler, endpoint);
    const middlewares =
      endpoint.price > 0 ? [authMw, paymentMw, wrappedHandler] : [wrappedHandler];

    const method = endpoint.method.toLowerCase() as
      | "get"
      | "post"
      | "put"
      | "delete";
    app[method](endpoint.path, ...middlewares);
  }

  return httpServer;
}
