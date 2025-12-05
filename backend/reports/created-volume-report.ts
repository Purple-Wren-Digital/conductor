import { api, APIError, Query } from "encore.dev/api";
import { db } from "../ticket/db";
import { getUserContext } from "../auth/user-context";

export interface CreatedVolumeRequest {
  marketCenterIds?: Query<string[]>;
  creatorIds?: Query<string[]>;
  assigneeIds?: Query<string[]>;
  categoryIds?: Query<string[]>;
  dateFrom?: Query<string>;
  dateTo?: Query<string>;
}

export interface CreatedVolumeResponse {
  ticketsCreated: {
    createdMonthYear: string;
    createdCount: number;
  }[];
  total: number;
}

interface TicketRow {
  id: string;
  created_at: Date;
}

export const createdByMonth = api<CreatedVolumeRequest, CreatedVolumeResponse>(
  {
    expose: true,
    method: "GET",
    path: "/reports/created-by-month",
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
            SELECT t.id, t.created_at
            FROM tickets t
            WHERE (
              t.assignee_id = ${userContext.userId}
              OR t.creator_id = ${userContext.userId}
            )
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${assigneeIds}::text[] IS NULL OR t.assignee_id = ANY(${assigneeIds}))
            AND (${creatorIds}::text[] IS NULL OR t.creator_id = ANY(${creatorIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
          `;
        } else {
          tickets = await db.queryAll<TicketRow>`
            SELECT DISTINCT t.id, t.created_at
            FROM tickets t
            LEFT JOIN ticket_categories tc ON t.category_id = tc.id
            LEFT JOIN users creator ON t.creator_id = creator.id
            LEFT JOIN users assignee ON t.assignee_id = assignee.id
            WHERE (
              tc.market_center_id = ${userContext.marketCenterId}
              OR creator.market_center_id = ${userContext.marketCenterId}
              OR assignee.market_center_id = ${userContext.marketCenterId}
            )
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${assigneeIds}::text[] IS NULL OR t.assignee_id = ANY(${assigneeIds}))
            AND (${creatorIds}::text[] IS NULL OR t.creator_id = ANY(${creatorIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
          `;
        }
        break;
      case "ADMIN":
        if (marketCenterIds) {
          tickets = await db.queryAll<TicketRow>`
            SELECT DISTINCT t.id, t.created_at
            FROM tickets t
            LEFT JOIN ticket_categories tc ON t.category_id = tc.id
            LEFT JOIN users creator ON t.creator_id = creator.id
            LEFT JOIN users assignee ON t.assignee_id = assignee.id
            WHERE (
              tc.market_center_id = ANY(${marketCenterIds})
              OR creator.market_center_id = ANY(${marketCenterIds})
              OR assignee.market_center_id = ANY(${marketCenterIds})
            )
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${assigneeIds}::text[] IS NULL OR t.assignee_id = ANY(${assigneeIds}))
            AND (${creatorIds}::text[] IS NULL OR t.creator_id = ANY(${creatorIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
          `;
        } else {
          tickets = await db.queryAll<TicketRow>`
            SELECT t.id, t.created_at
            FROM tickets t
            WHERE (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${assigneeIds}::text[] IS NULL OR t.assignee_id = ANY(${assigneeIds}))
            AND (${creatorIds}::text[] IS NULL OR t.creator_id = ANY(${creatorIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
          `;
        }
        break;
      default:
        throw APIError.permissionDenied(
          "User not permitted to generate ticket reports"
        );
    }

    const ticketsCreated: {
      createdMonthYear: string;
      createdCount: number;
    }[] = [];

    // Sort the tickets into groups by MM/YYYY
    tickets.forEach((ticket) => {
      const createdDate = new Date(ticket.created_at);
      const month = createdDate.getMonth() + 1; // Months are zero-based
      const year = createdDate.getFullYear();
      const monthYearKey = `${month.toString().padStart(2, "0")}/${year}`;

      const existingGroup = ticketsCreated.find(
        (group) => group.createdMonthYear === monthYearKey
      );
      if (existingGroup) {
        existingGroup.createdCount += 1;
      } else {
        ticketsCreated.push({
          createdMonthYear: monthYearKey,
          createdCount: 1,
        });
      }
    });

    return { ticketsCreated, total: tickets?.length || 0 };
  }
);
