import type { Request, Response, NextFunction } from "express";
import { getWallet } from "../wallet";
import { getEndpointPrice } from "../config";

let authMiddleware: any = null;
let paymentMiddleware: any = null;

export async function setupMiddleware() {
  const wallet = getWallet();

  if (!wallet) {
    console.log(
      "[middleware] No wallet configured. Running in demo mode (no auth/payment enforcement)."
    );
    return;
  }

  try {
    const { createAuthMiddleware } = await import(
      "@bsv/auth-express-middleware"
    );
    authMiddleware = createAuthMiddleware({
      wallet,
      allowUnauthenticated: true,
    });
    console.log("[middleware] Auth middleware (BRC-103/104) initialized");
  } catch (error) {
    console.error("[middleware] Failed to initialize auth middleware:", error);
  }

  try {
    const { createPaymentMiddleware } = await import(
      "@bsv/payment-express-middleware"
    );
    paymentMiddleware = createPaymentMiddleware({
      wallet,
      calculateRequestPrice: async (req: Request) => {
        const price = getEndpointPrice(req.path, req.method);
        return price;
      },
    });
    console.log("[middleware] Payment middleware (BRC-29/105) initialized");
  } catch (error) {
    console.error(
      "[middleware] Failed to initialize payment middleware:",
      error
    );
  }
}

export function getAuthMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (authMiddleware) {
      return authMiddleware(req, res, next);
    }
    next();
  };
}

export function getPaymentMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (paymentMiddleware) {
      return paymentMiddleware(req, res, next);
    }
    next();
  };
}
