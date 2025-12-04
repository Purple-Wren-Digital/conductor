import { api, APIError } from "encore.dev/api";
import { db, fromTimestamp, fromJson } from "./db";
import { TicketHistory, User } from "../ticket/types";
import { mapHistorySnapshot } from "../utils";

export interface GetTicketHistoryRequest {
  id: string;

  orderBy: string;

  limit?: number;
  offset?: number;
}

export interface GetTicketHistoryResponse {
  ticketHistory: TicketHistory[];
  total: number;
}

interface TicketHistoryRow {
  id: string;
  ticket_id: string;
  action: string;
  field: string | null;
  previousValue: string | null;
  newValue: string | null;
  snapshot: string | null;
  changed_at: Date;
  changed_by_id: string;
  // joined user fields
  user_clerk_id: string;
  user_email: string;
  user_name: string;
  user_image_url: string | null;
  user_role: string;
  user_is_active: boolean;
}

export const getTicketHistory = api<
  GetTicketHistoryRequest,
  GetTicketHistoryResponse
>(
  {
    expose: true,
    method: "GET",
    path: "/tickets/:id/history",
    auth: true,
  },
  async (req) => {
    const limit =
      req.limit && Math.min(Math.max(Number(req.limit ?? 50), 1), 200);
    const offset = req.offset && Math.max(Number(req.offset ?? 0), 0);
    const isDescending = req.orderBy === "desc";

    // Query for history with joined user data
    // Note: ORDER BY direction must be hardcoded since Encore's SQL doesn't support raw interpolation
    const history = isDescending
      ? await db.queryAll<TicketHistoryRow>`
          SELECT
            th.id,
            th.ticket_id,
            th.action,
            th.field,
            th.previous_value as "previousValue",
            th.new_value as "newValue",
            th.snapshot::text as snapshot,
            th.changed_at as changed_at,
            th.changed_by_id,
            u.clerk_id as user_clerk_id,
            u.email as user_email,
            u.name as user_name,
            u.image_url as user_image_url,
            u.role as user_role,
            u.is_active as user_is_active
          FROM ticket_history th
          LEFT JOIN users u ON u.id = th.changed_by_id
          WHERE th.ticket_id = ${req.id}
          ORDER BY th.changed_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `
      : await db.queryAll<TicketHistoryRow>`
          SELECT
            th.id,
            th.ticket_id,
            th.action,
            th.field,
            th.previous_value as "previousValue",
            th.new_value as "newValue",
            th.snapshot::text as snapshot,
            th.changed_at as changed_at,
            th.changed_by_id,
            u.clerk_id as user_clerk_id,
            u.email as user_email,
            u.name as user_name,
            u.image_url as user_image_url,
            u.role as user_role,
            u.is_active as user_is_active
          FROM ticket_history th
          LEFT JOIN users u ON u.id = th.changed_by_id
          WHERE th.ticket_id = ${req.id}
          ORDER BY th.changed_at ASC
          LIMIT ${limit}
          OFFSET ${offset}
        `;

    // Count total records
    const totalResult = await db.queryRow<{ count: number }>`
      SELECT COUNT(*)::int as count
      FROM ticket_history
      WHERE ticket_id = ${req.id}
    `;
    const total = totalResult?.count ?? 0;

    // Transform rows to TicketHistory format
    const ticketHistory: TicketHistory[] = history.map(row => ({
      id: row.id,
      ticketId: row.ticket_id,
      action: row.action,
      field: row.field,
      previousValue: row.previousValue,
      newValue: row.newValue,
      snapshot: row.snapshot ? fromJson(row.snapshot) : undefined,
      changedAt: fromTimestamp(row.changed_at),
      changedById: row.changed_by_id,
      changedBy: row.user_clerk_id ? {
        id: row.changed_by_id,
        clerkId: row.user_clerk_id,
        email: row.user_email,
        name: row.user_name,
        imageUrl: row.user_image_url,
        role: row.user_role as any,
        isActive: row.user_is_active,
        createdAt: new Date(), // Not queried but required by User type
        updatedAt: new Date(), // Not queried but required by User type
      } as User : undefined,
    }));

    return {
      ticketHistory: mapHistorySnapshot(ticketHistory),
      total,
    };
  }
);
