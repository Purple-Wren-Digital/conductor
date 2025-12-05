import { api, APIError, Query } from "encore.dev/api";
import { db } from "../ticket/db";
import { getUserContext } from "../auth/user-context";

export interface ResolvedVolumeRequest {
  marketCenterIds?: Query<string[]>;
  creatorIds?: Query<string[]>;
  assigneeIds?: Query<string[]>;
  categoryIds?: Query<string[]>;
  dateFrom?: Query<string>;
  dateTo?: Query<string>;
}

export interface ResolvedVolumeResponse {
  ticketsResolved: {
    resolvedMonthYear: string;
    resolvedCount: number;
  }[];
  total: number;
}

interface TicketRow {
  id: string;
  resolved_at: Date | null;
}

export const resolvedByMonth = api<
  ResolvedVolumeRequest,
  ResolvedVolumeResponse
>(
  {
    expose: true,
    method: "GET",
    path: "/reports/resolved-by-month",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    // Convert arrays to filter params (null if empty)
    const categoryIds = req.categoryIds && req.categoryIds.length > 0 ? req.categoryIds : null;
    const assigneeIds = req.assigneeIds && req.assigneeIds.length > 0 ? req.assigneeIds : null;
    const creatorIds = req.creatorIds && req.creatorIds.length > 0 ? req.creatorIds : null;
    const marketCenterIds = req.marketCenterIds && req.marketCenterIds.length > 0 ? req.marketCenterIds : null;

    // Parse date filters
    let dateFrom: Date | null = null;
    let dateTo: Date | null = null;

    if (req.dateFrom) {
      const from = new Date(req.dateFrom);
      if (!isNaN(from.getTime())) dateFrom = from;
    }
    if (req.dateTo) {
      const to = new Date(req.dateTo);
      if (!isNaN(to.getTime())) dateTo = to;
    }

    // Default to last 6 months if no date range provided
    if (!dateFrom && !dateTo) {
      dateFrom = new Date();
      dateFrom.setDate(1);
      dateFrom.setMonth(dateFrom.getMonth() - 6);
    }

    let tickets: TicketRow[] = [];

    switch (userContext.role) {
      case "STAFF":
      case "STAFF_LEADER":
        if (!userContext.marketCenterId) {
          tickets = await db.queryAll<TicketRow>`
            SELECT t.id, t.resolved_at
            FROM tickets t
            WHERE t.status = 'RESOLVED'
              AND t.resolved_at IS NOT NULL
              AND (
                t.assignee_id = ${userContext.userId}
                OR t.creator_id = ${userContext.userId}
              )
              AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
              AND (${assigneeIds}::text[] IS NULL OR t.assignee_id = ANY(${assigneeIds}))
              AND (${creatorIds}::text[] IS NULL OR t.creator_id = ANY(${creatorIds}))
              AND (${dateFrom}::timestamp IS NULL OR t.resolved_at >= ${dateFrom})
              AND (${dateTo}::timestamp IS NULL OR t.resolved_at <= ${dateTo})
          `;
        } else {
          tickets = await db.queryAll<TicketRow>`
            SELECT DISTINCT t.id, t.resolved_at
            FROM tickets t
            LEFT JOIN ticket_categories tc ON t.category_id = tc.id
            LEFT JOIN users creator ON t.creator_id = creator.id
            LEFT JOIN users assignee ON t.assignee_id = assignee.id
            WHERE t.status = 'RESOLVED'
              AND t.resolved_at IS NOT NULL
              AND (
                tc.market_center_id = ${userContext.marketCenterId}
                OR creator.market_center_id = ${userContext.marketCenterId}
                OR assignee.market_center_id = ${userContext.marketCenterId}
              )
              AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
              AND (${assigneeIds}::text[] IS NULL OR t.assignee_id = ANY(${assigneeIds}))
              AND (${creatorIds}::text[] IS NULL OR t.creator_id = ANY(${creatorIds}))
              AND (${dateFrom}::timestamp IS NULL OR t.resolved_at >= ${dateFrom})
              AND (${dateTo}::timestamp IS NULL OR t.resolved_at <= ${dateTo})
          `;
        }
        break;
      case "ADMIN":
        if (marketCenterIds) {
          tickets = await db.queryAll<TicketRow>`
            SELECT DISTINCT t.id, t.resolved_at
            FROM tickets t
            LEFT JOIN ticket_categories tc ON t.category_id = tc.id
            LEFT JOIN users creator ON t.creator_id = creator.id
            LEFT JOIN users assignee ON t.assignee_id = assignee.id
            WHERE t.status = 'RESOLVED'
              AND t.resolved_at IS NOT NULL
              AND (
                tc.market_center_id = ANY(${marketCenterIds})
                OR creator.market_center_id = ANY(${marketCenterIds})
                OR assignee.market_center_id = ANY(${marketCenterIds})
              )
              AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
              AND (${assigneeIds}::text[] IS NULL OR t.assignee_id = ANY(${assigneeIds}))
              AND (${creatorIds}::text[] IS NULL OR t.creator_id = ANY(${creatorIds}))
              AND (${dateFrom}::timestamp IS NULL OR t.resolved_at >= ${dateFrom})
              AND (${dateTo}::timestamp IS NULL OR t.resolved_at <= ${dateTo})
          `;
        } else {
          tickets = await db.queryAll<TicketRow>`
            SELECT t.id, t.resolved_at
            FROM tickets t
            WHERE t.status = 'RESOLVED'
              AND t.resolved_at IS NOT NULL
              AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
              AND (${assigneeIds}::text[] IS NULL OR t.assignee_id = ANY(${assigneeIds}))
              AND (${creatorIds}::text[] IS NULL OR t.creator_id = ANY(${creatorIds}))
              AND (${dateFrom}::timestamp IS NULL OR t.resolved_at >= ${dateFrom})
              AND (${dateTo}::timestamp IS NULL OR t.resolved_at <= ${dateTo})
          `;
        }
        break;
      default:
        throw APIError.permissionDenied(
          "User not permitted to generate ticket reports"
        );
    }

    const ticketsResolved: {
      resolvedMonthYear: string;
      resolvedCount: number;
    }[] = [];

    // Sort the tickets into groups by MM/YYYY
    tickets.forEach((ticket) => {
      const resolvedDate = ticket.resolved_at;
      if (!resolvedDate) return;
      const date = new Date(resolvedDate);
      const month = date.getMonth() + 1; // Months are zero-based
      const year = date.getFullYear();
      const monthYearKey = `${month.toString().padStart(2, "0")}/${year}`;

      const existingGroup = ticketsResolved.find(
        (group) => group.resolvedMonthYear === monthYearKey
      );
      if (existingGroup) {
        existingGroup.resolvedCount += 1;
      } else {
        ticketsResolved.push({
          resolvedMonthYear: monthYearKey,
          resolvedCount: 1,
        });
      }
    });

    return { ticketsResolved, total: tickets?.length || 0 };
  }
);
