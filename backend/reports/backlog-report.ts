import { api, APIError, Query } from "encore.dev/api";
import { db, subscriptionRepository } from "../ticket/db";
import type { TicketStatus } from "../ticket/types";
import { getUserContext } from "../auth/user-context";

export interface BacklogRequest {
  marketCenterIds?: Query<string[]>;
  status?: Query<TicketStatus[]>;
  categoryIds?: Query<string[]>;
  dateFrom?: Query<string>;
  dateTo?: Query<string>;
}

export interface BacklogResponse {
  created: number;
  unassigned: number;
  total: number;
}

interface TicketRow {
  id: string;
  status: string;
}

export const backlog = api<BacklogRequest, BacklogResponse>(
  {
    expose: true,
    method: "GET",
    path: "/reports/ticket-backlog",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    const subscription = await subscriptionRepository.findByMarketCenterId(
      userContext?.marketCenterId
    );
    const isActive = subscription && subscription?.status === "ACTIVE";

    let ticketsFound: TicketRow[] = [];

    // Convert arrays to filter params (null if empty)
    const categoryIds =
      req.categoryIds && req.categoryIds.length > 0 ? req.categoryIds : null;

    let marketCenterIds: string[] = [];
    if (
      userContext.role === "ADMIN" &&
      userContext?.marketCenterId &&
      isActive
    ) {
      const accessibleMarketCenterIds =
        await subscriptionRepository.getAccessibleMarketCenterIds(
          userContext.marketCenterId
        );
      if (req.marketCenterIds && req.marketCenterIds.length > 0) {
        const filteredMCIds = req.marketCenterIds.filter((id) =>
          accessibleMarketCenterIds.includes(id)
        );
        marketCenterIds = filteredMCIds;
      } else {
        marketCenterIds = accessibleMarketCenterIds;
      }
    }

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

    switch (userContext.role) {
      case "STAFF":
      case "STAFF_LEADER":
        if (!userContext?.marketCenterId) {
          // User without market center - see tickets they're assigned to, created, or unassigned
          ticketsFound = await db.queryAll<TicketRow>`
            SELECT t.id, t.status
            FROM tickets t
            WHERE t.status IN ('CREATED', 'UNASSIGNED')
              AND (
                t.assignee_id = ${userContext.userId}
                OR t.assignee_id IS NULL
                OR t.creator_id = ${userContext.userId}
              )
              AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
              AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
              AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
          `;
        } else {
          // User with market center - see tickets in their market center scope
          ticketsFound = await db.queryAll<TicketRow>`
            SELECT DISTINCT t.id, t.status
            FROM tickets t
            LEFT JOIN ticket_categories tc ON t.category_id = tc.id
            LEFT JOIN users creator ON t.creator_id = creator.id
            LEFT JOIN users assignee ON t.assignee_id = assignee.id
            WHERE t.status IN ('CREATED', 'UNASSIGNED')
              AND (
                tc.market_center_id = ${userContext.marketCenterId}
                OR creator.market_center_id = ${userContext.marketCenterId}
                OR assignee.market_center_id = ${userContext.marketCenterId}
                OR t.assignee_id IS NULL
              )
              AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
              AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
              AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
          `;
        }
        break;
      case "ADMIN":
        if (isActive && marketCenterIds && marketCenterIds.length > 0) {
          ticketsFound = await db.queryAll<TicketRow>`
            SELECT DISTINCT t.id, t.status
            FROM tickets t
            LEFT JOIN ticket_categories tc ON t.category_id = tc.id
            LEFT JOIN users creator ON t.creator_id = creator.id
            LEFT JOIN users assignee ON t.assignee_id = assignee.id
            WHERE t.status IN ('CREATED', 'UNASSIGNED')
              AND (
                tc.market_center_id = ANY(${marketCenterIds})
                OR creator.market_center_id = ANY(${marketCenterIds})
                OR assignee.market_center_id = ANY(${marketCenterIds})
                OR t.assignee_id IS NULL
              )
              AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
              AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
              AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
          `;
        } else {
          // No subscription or inactive subscription - limit to own tickets
          ticketsFound = await db.queryAll<TicketRow>`
            SELECT t.id, t.status
            FROM tickets t
            WHERE t.status IN ('CREATED', 'UNASSIGNED')
              AND (
                t.assignee_id = ${userContext.userId}
                OR t.assignee_id IS NULL
                OR t.creator_id = ${userContext.userId}
              )
              AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
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

    return {
      created: ticketsFound.filter((t) => t.status === "CREATED").length,
      unassigned: ticketsFound.filter((t) => t.status === "UNASSIGNED").length,
      total: ticketsFound.length,
    };
  }
);
