import { api, APIError, Query } from "encore.dev/api";
import { db, fromTimestamp, fromJson } from "../../ticket/db";
import { userRepository, marketCenterRepository } from "../../ticket/db";
import { mapHistorySnapshot } from "../../utils";
import { MarketCenterHistory } from "../types";

export interface GetMarketCenterHistoryRequest {
  id: string;

  orderBy: Query<"asc" | "desc">;

  limit?: number;
  offset?: number;
}

export interface GetMarketCenterHistoryResponse {
  marketCenterHistory: MarketCenterHistory[];
  total: number;
}

interface MarketCenterHistoryRow {
  id: string;
  market_center_id: string;
  action: string;
  field: string | null;
  previous_value: string | null;
  new_value: string | null;
  snapshot: any;
  changed_by_id: string | null;
  changed_at: Date;
}

export const getUserHistory = api<
  GetMarketCenterHistoryRequest,
  GetMarketCenterHistoryResponse
>(
  {
    expose: true,
    method: "GET",
    path: "/marketCenter/:id/history",
    auth: true,
  },
  async (req) => {
    const limit =
      req.limit && Math.min(Math.max(Number(req.limit ?? 50), 1), 200);
    const offset = req.offset && Math.max(Number(req.offset ?? 0), 0);
    const orderDir = req.orderBy === "asc" ? "ASC" : "DESC";

    // Build SQL query dynamically
    let sql = `
      SELECT * FROM market_center_history
      WHERE market_center_id = $1
      ORDER BY changed_at ${orderDir}
    `;
    const values: any[] = [req.id];

    if (limit) {
      sql += ` LIMIT ${limit}`;
    }
    if (offset) {
      sql += ` OFFSET ${offset}`;
    }

    const [historyRows, totalRow] = await Promise.all([
      db.rawQueryAll<MarketCenterHistoryRow>(sql, ...values),
      db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int as count FROM market_center_history
        WHERE market_center_id = ${req.id}
      `
    ]);

    // Fetch related data for each history record
    const history = await Promise.all(
      historyRows.map(async (row) => {
        const changedBy = row.changed_by_id
          ? await userRepository.findById(row.changed_by_id)
          : null;
        const marketCenter = await marketCenterRepository.findById(row.market_center_id);

        return {
          id: row.id,
          marketCenterId: row.market_center_id,
          action: row.action,
          field: row.field ?? undefined,
          previousValue: row.previous_value ?? undefined,
          newValue: row.new_value ?? undefined,
          snapshot: fromJson(row.snapshot) ?? undefined,
          changedAt: fromTimestamp(row.changed_at)!,
          changedById: row.changed_by_id ?? undefined,
          changedBy: changedBy ?? undefined,
          marketCenter: marketCenter ?? undefined,
        };
      })
    );

    return {
      marketCenterHistory: mapHistorySnapshot(history),
      total: totalRow?.count ?? 0,
    };
  }
);
