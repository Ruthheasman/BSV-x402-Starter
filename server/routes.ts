import type { Express, Request, Response } from "express";
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
        automatic: true,
        description:
          "Automatic refund if service fails after payment",
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

  for (const endpoint of endpoints) {
    const handler = handlers[endpoint.handler];
    if (!handler) {
      console.warn(
        `[routes] No handler found for "${endpoint.handler}" (${endpoint.method} ${endpoint.path})`
      );
      continue;
    }

    const middlewares =
      endpoint.price > 0 ? [authMw, paymentMw, handler] : [handler];

    const method = endpoint.method.toLowerCase() as
      | "get"
      | "post"
      | "put"
      | "delete";
    app[method](endpoint.path, ...middlewares);
  }

  return httpServer;
}
