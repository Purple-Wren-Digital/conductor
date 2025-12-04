import { api, APIError, Query } from "encore.dev/api";
import { db, fromTimestamp, fromJson } from "../../ticket/db";
import type { UserHistory } from "../../user/types";
import { mapHistorySnapshot } from "../../utils";

export interface GetUserHistoryRequest {
  id: string;

  orderBy: Query<"asc" | "desc">;

  limit?: number;
  offset?: number;
}

export interface GetUserHistoryResponse {
  userHistory: UserHistory[];
  total: number;
}

interface UserHistoryRow {
  id: string;
  user_id: string;
  market_center_id: string | null;
  action: string;
  field: string | null;
  previous_value: string | null;
  new_value: string | null;
  snapshot: any;
  changed_by_id: string | null;
  changed_at: Date;
}

export const getUserHistory = api<
  GetUserHistoryRequest,
  GetUserHistoryResponse
>(
  {
    expose: true,
    method: "GET",
    path: "/users/:id/history",
    auth: true,
  },
  async (req) => {
    const limit =
      req.limit && Math.min(Math.max(Number(req.limit ?? 50), 1), 200);
    const offset = req.offset && Math.max(Number(req.offset ?? 0), 0);
    const orderDir = req.orderBy === "asc" ? "ASC" : "DESC";

    const historySql = `
      SELECT uh.*
      FROM user_history uh
      WHERE uh.changed_by_id = $1 OR uh.user_id = $1
      ORDER BY uh.changed_at ${orderDir}
      LIMIT ${limit || 50}
      OFFSET ${offset || 0}
    `;

    const [historyRows, countResult] = await Promise.all([
      db.rawQueryAll<UserHistoryRow>(historySql, req.id),
      db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int as count
        FROM user_history
        WHERE changed_by_id = ${req.id} OR user_id = ${req.id}
      `,
    ]);

    const userHistory: UserHistory[] = historyRows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      marketCenterId: row.market_center_id,
      action: row.action,
      field: row.field,
      previousValue: row.previous_value,
      newValue: row.new_value,
      snapshot: row.snapshot ? fromJson(row.snapshot) : undefined,
      changedById: row.changed_by_id,
      changedAt: fromTimestamp(row.changed_at)!,
    }));

    return {
      userHistory: mapHistorySnapshot(userHistory),
      total: countResult?.count ?? 0,
    };
  }
);
