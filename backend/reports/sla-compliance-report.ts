import { api, APIError, Query } from "encore.dev/api";
import { db, subscriptionRepository } from "../ticket/db";
import type { TicketStatus } from "../ticket/types";
import { getUserContext } from "../auth/user-context";
import { getTicketSlaStatus } from "./utils";

export interface SLARequest {
  marketCenterIds?: Query<string[]>;
  status?: Query<TicketStatus[]>;
  categoryIds?: Query<string[]>;
  dateFrom?: Query<string>;
  dateTo?: Query<string>;
}

export interface SLAResponse {
  compliant: number;
  onTrack: number;
  atRisk: number;
  overdue: number;
}

interface TicketRow {
  id: string;
  created_at: Date;
  resolved_at: Date | null;
  due_date: Date | null;
}

export const slaCompliance = api<SLARequest, SLAResponse>(
  {
    expose: true,
    method: "GET",
    path: "/reports/sla-compliance",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    const subscription = await subscriptionRepository.findByMarketCenterId(
      userContext?.marketCenterId
    );
    const isActive = subscription && subscription?.status === "ACTIVE";

    // Convert arrays to filter params (null if empty)
    const categoryIds =
      req.categoryIds && req.categoryIds.length > 0 ? req.categoryIds : null;
    const statusList = req.status && req.status.length > 0 ? req.status : null;

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

    let ticketsFound: TicketRow[] = [];

    switch (userContext.role) {
      case "STAFF":
      case "STAFF_LEADER":
        if (!userContext.marketCenterId) {
          ticketsFound = await db.queryAll<TicketRow>`
            SELECT t.id, t.created_at, t.resolved_at, t.due_date
            FROM tickets t
            WHERE (
              t.assignee_id = ${userContext.userId}
              OR t.creator_id = ${userContext.userId}
              OR t.assignee_id IS NULL
            )
            AND (${statusList}::text[] IS NULL OR t.status = ANY(${statusList}))
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
          `;
        } else {
          ticketsFound = await db.queryAll<TicketRow>`
            SELECT DISTINCT t.id, t.created_at, t.resolved_at, t.due_date
            FROM tickets t
            LEFT JOIN ticket_categories tc ON t.category_id = tc.id
            LEFT JOIN users creator ON t.creator_id = creator.id
            LEFT JOIN users assignee ON t.assignee_id = assignee.id
            WHERE (
              tc.market_center_id = ${userContext.marketCenterId}
              OR creator.market_center_id = ${userContext.marketCenterId}
              OR assignee.market_center_id = ${userContext.marketCenterId}
              OR t.assignee_id IS NULL
            )
            AND (${statusList}::text[] IS NULL OR t.status = ANY(${statusList}))
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
          `;
        }
        break;
      case "ADMIN":
        if (isActive && marketCenterIds && marketCenterIds.length > 0) {
          ticketsFound = await db.queryAll<TicketRow>`
            SELECT DISTINCT t.id, t.created_at, t.resolved_at, t.due_date
            FROM tickets t
            LEFT JOIN ticket_categories tc ON t.category_id = tc.id
            LEFT JOIN users creator ON t.creator_id = creator.id
            LEFT JOIN users assignee ON t.assignee_id = assignee.id
            WHERE (
              tc.market_center_id = ANY(${marketCenterIds})
              OR creator.market_center_id = ANY(${marketCenterIds})
              OR assignee.market_center_id = ANY(${marketCenterIds})
              OR t.assignee_id IS NULL
            )
            AND (${statusList}::text[] IS NULL OR t.status = ANY(${statusList}))
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
          `;
        } else {
          // No subscription or inactive subscription - limit to own tickets
          ticketsFound = await db.queryAll<TicketRow>`
            SELECT t.id, t.created_at, t.resolved_at, t.due_date
            FROM tickets t
            WHERE (
              t.assignee_id = ${userContext.userId}
              OR t.creator_id = ${userContext.userId}
              OR t.assignee_id IS NULL
            )
            AND (${statusList}::text[] IS NULL OR t.status = ANY(${statusList}))
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

    const report = {
      compliant: 0,
      onTrack: 0,
      atRisk: 0,
      overdue: 0,
    };

    for (const ticket of ticketsFound) {
      const slaStatus = getTicketSlaStatus({
        createdAt: ticket.created_at,
        resolvedAt: ticket.resolved_at ? ticket.resolved_at : undefined,
        dueDate: ticket.due_date ? ticket.due_date : undefined,
      });
      report[slaStatus]++;
    }

    return {
      compliant: report.compliant,
      onTrack: report.onTrack,
      atRisk: report.atRisk,
      overdue: report.overdue,
    };
  }
);
