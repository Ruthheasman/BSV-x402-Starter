import { z } from "zod";
import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export interface EndpointConfig {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  price: number;
  description: string;
  handler: string;
  tier: "free" | "micro" | "standard" | "premium";
  accepts?: {
    contentType: string;
    body: Record<string, string>;
  };
  returns?: {
    contentType: string;
    body: Record<string, string>;
  };
}

export interface DiscoveryManifest {
  service: string;
  version: string;
  protocol: string;
  identity: string;
  endpoints: Array<{
    path: string;
    method: string;
    auth: boolean;
    payment: {
      satoshis: number;
      usd_approx: number;
      currency: string;
    } | null;
    description: string;
    accepts?: {
      "content-type": string;
      body: Record<string, string>;
    };
    returns?: {
      "content-type": string;
      body: Record<string, string>;
    };
  }>;
  pricing: {
    model: string;
    tiers: string;
    currency: string;
    note: string;
  };
  refunds: {
    supported: boolean;
    policy: string;
    description: string;
  };
}

export interface ServerStatus {
  status: "online" | "offline" | "error";
  uptime: number;
  version: string;
  service: string;
  endpoints: EndpointConfig[];
  walletConfigured: boolean;
  totalEndpoints: number;
  paidEndpoints: number;
  freeEndpoints: number;
}

export const requestLogs = pgTable("request_logs", {
  id: serial("id").primaryKey(),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  statusCode: integer("status_code").notNull(),
  satoshisPaid: integer("satoshis_paid").notNull().default(0),
  senderIdentityKey: text("sender_identity_key"),
  tier: text("tier").notNull().default("free"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  durationMs: integer("duration_ms"),
  error: text("error"),
});

export const refundQueue = pgTable("refund_queue", {
  id: serial("id").primaryKey(),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  satoshis: integer("satoshis").notNull(),
  senderIdentityKey: text("sender_identity_key"),
  error: text("error"),
  status: text("status").notNull().default("pending"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const insertRequestLogSchema = createInsertSchema(requestLogs).omit({ id: true, timestamp: true });
export const insertRefundSchema = createInsertSchema(refundQueue).omit({ id: true, timestamp: true, resolvedAt: true });

export type InsertRequestLog = z.infer<typeof insertRequestLogSchema>;
export type InsertRefund = z.infer<typeof insertRefundSchema>;
export type RequestLog = typeof requestLogs.$inferSelect;
export type Refund = typeof refundQueue.$inferSelect;

export const satsToUsd = (sats: number): number => {
  return Number((sats * 0.00006).toFixed(4));
};

export const formatSats = (sats: number): string => {
  if (sats === 0) return "Free";
  if (sats >= 1000) return `${(sats / 1000).toFixed(sats % 1000 === 0 ? 0 : 1)}k sats`;
  return `${sats} sats`;
};

export const formatUsd = (usd: number): string => {
  if (usd === 0) return "Free";
  if (usd < 0.01) return `<$0.01`;
  return `$${usd.toFixed(2)}`;
};
