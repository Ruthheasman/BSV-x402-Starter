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

const startTime = Date.now();

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

  function wrapWithRefund(handlerFn: (req: Request, res: Response) => void) {
    return async (req: Request, res: Response) => {
      const payment = (req as any).payment;
      const satoshisPaid = payment?.satoshisPaid || 0;
      const senderKey = (req as any).auth?.identityKey;

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
        }
        return originalJson(body);
      }) as any;

      try {
        await Promise.resolve(handlerFn(req, res));
      } catch (error: any) {
        console.error(
          `[refund] Handler threw after payment of ${satoshisPaid} sats:`,
          error.message || error
        );

        if (satoshisPaid > 0) {
          console.log(
            `[refund] Refund eligible: ${satoshisPaid} sats to ${senderKey || "unknown"}`
          );
        }

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

    const wrappedHandler = endpoint.price > 0 ? wrapWithRefund(handler) : handler;
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
