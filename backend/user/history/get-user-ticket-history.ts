import { api, APIError } from "encore.dev/api";
import { db, fromTimestamp, fromJson } from "../../ticket/db";
import { TicketHistory } from "../../ticket/types";
import { mapHistorySnapshot } from "../../utils";

export interface GetUserTicketHistoryRequest {
  id: string;

  orderBy: string;

  limit?: number;
  offset?: number;
}

export interface GetUserTicketHistoryResponse {
  ticketHistory: TicketHistory[];
  total: number;
}

interface TicketHistoryRow {
  id: string;
  ticket_id: string;
  changed_by_id: string;
  action: string;
  field: string | null;
  previous_value: string | null;
  new_value: string | null;
  snapshot?: {} | null; // Ticket as it was in this moment
  changed_at: Date;
}

export const getUserTicketHistory = api<
  GetUserTicketHistoryRequest,
  GetUserTicketHistoryResponse
>(
  {
    expose: true,
    method: "GET",
    path: "/users/:id/history/tickets",
    auth: true,
  },
  async (req) => {
    const limit =
      req.limit && Math.min(Math.max(Number(req.limit ?? 50), 1), 200);
    const offset = req.offset && Math.max(Number(req.offset ?? 0), 0);
    const orderDir = req.orderBy === "asc" ? "ASC" : "DESC";

    const historySql = `
      SELECT th.*, t.title as ticket_title
      FROM ticket_history th
      LEFT JOIN tickets t ON th.ticket_id = t.id
      WHERE th.changed_by_id = $1
      ORDER BY th.changed_at ${orderDir}
      LIMIT ${limit || 50}
      OFFSET ${offset || 0}
    `;

    const [historyRows, countResult] = await Promise.all([
      db.rawQueryAll<TicketHistoryRow>(historySql, req.id),
      db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int as count
        FROM ticket_history
        WHERE changed_by_id = ${req.id}
      `,
    ]);

    const ticketHistory: TicketHistory[] = historyRows.map((row) => ({
      id: row.id,
      ticketId: row.ticket_id,
      changedById: row.changed_by_id,
      action: row.action,
      field: row.field,
      previousValue: row.previous_value,
      newValue: row.new_value,
      snapshot: row?.snapshot ? fromJson(row.snapshot) : undefined,
      changedAt: fromTimestamp(row.changed_at)!,
    }));

    return {
      ticketHistory: mapHistorySnapshot(ticketHistory),
      total: countResult?.count ?? 0,
    };
  }
);
