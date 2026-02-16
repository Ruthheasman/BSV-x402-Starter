import { z } from "zod";

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
    automatic: boolean;
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
