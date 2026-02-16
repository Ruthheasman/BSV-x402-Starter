import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { desc, eq, sql, count, sum, gte } from "drizzle-orm";
import {
  requestLogs,
  refundQueue,
  type InsertRequestLog,
  type InsertRefund,
  type RequestLog,
  type Refund,
} from "@shared/schema";

export interface IStorage {
  logRequest(log: InsertRequestLog): Promise<RequestLog>;
  addRefund(refund: InsertRefund): Promise<Refund>;
  getRecentRequests(limit?: number): Promise<RequestLog[]>;
  getPendingRefunds(): Promise<Refund[]>;
  getAllRefunds(limit?: number): Promise<Refund[]>;
  resolveRefund(id: number): Promise<Refund | null>;
  getUsageStats(): Promise<{
    totalRequests: number;
    totalSatoshisEarned: number;
    totalRefundsPending: number;
    totalRefundsSatoshis: number;
    requestsToday: number;
    satoshisToday: number;
    topEndpoints: Array<{ endpoint: string; count: number; satoshis: number }>;
  }>;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

export class DatabaseStorage implements IStorage {
  async logRequest(log: InsertRequestLog): Promise<RequestLog> {
    const [result] = await db.insert(requestLogs).values(log).returning();
    return result;
  }

  async addRefund(refund: InsertRefund): Promise<Refund> {
    const [result] = await db.insert(refundQueue).values(refund).returning();
    return result;
  }

  async getRecentRequests(limit = 50): Promise<RequestLog[]> {
    return db.select().from(requestLogs).orderBy(desc(requestLogs.timestamp)).limit(limit);
  }

  async getPendingRefunds(): Promise<Refund[]> {
    return db.select().from(refundQueue).where(eq(refundQueue.status, "pending")).orderBy(desc(refundQueue.timestamp));
  }

  async getAllRefunds(limit = 50): Promise<Refund[]> {
    return db.select().from(refundQueue).orderBy(desc(refundQueue.timestamp)).limit(limit);
  }

  async resolveRefund(id: number): Promise<Refund | null> {
    const [result] = await db
      .update(refundQueue)
      .set({ status: "resolved", resolvedAt: new Date() })
      .where(eq(refundQueue.id, id))
      .returning();
    return result || null;
  }

  async getUsageStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalStats] = await db
      .select({
        totalRequests: count(),
        totalSatoshisEarned: sum(requestLogs.satoshisPaid),
      })
      .from(requestLogs);

    const [todayStats] = await db
      .select({
        requestsToday: count(),
        satoshisToday: sum(requestLogs.satoshisPaid),
      })
      .from(requestLogs)
      .where(gte(requestLogs.timestamp, today));

    const [refundStats] = await db
      .select({
        totalRefundsPending: count(),
        totalRefundsSatoshis: sum(refundQueue.satoshis),
      })
      .from(refundQueue)
      .where(eq(refundQueue.status, "pending"));

    const topEndpoints = await db
      .select({
        endpoint: requestLogs.endpoint,
        count: count(),
        satoshis: sum(requestLogs.satoshisPaid),
      })
      .from(requestLogs)
      .groupBy(requestLogs.endpoint)
      .orderBy(desc(count()))
      .limit(10);

    return {
      totalRequests: Number(totalStats?.totalRequests || 0),
      totalSatoshisEarned: Number(totalStats?.totalSatoshisEarned || 0),
      totalRefundsPending: Number(refundStats?.totalRefundsPending || 0),
      totalRefundsSatoshis: Number(refundStats?.totalRefundsSatoshis || 0),
      requestsToday: Number(todayStats?.requestsToday || 0),
      satoshisToday: Number(todayStats?.satoshisToday || 0),
      topEndpoints: topEndpoints.map((e) => ({
        endpoint: e.endpoint,
        count: Number(e.count),
        satoshis: Number(e.satoshis || 0),
      })),
    };
  }
}

export const storage = new DatabaseStorage();
