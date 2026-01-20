import { api, APIError, Query } from "encore.dev/api";
import { db, subscriptionRepository } from "../ticket/db";
import type { TicketStatus } from "../ticket/types";
import { getUserContext } from "../auth/user-context";
import { getTicketSlaStatus } from "./utils";

export interface UsersSLARequest {
  marketCenterIds?: Query<string[]>;
  assigneeIds?: Query<string[]>;
  status?: Query<TicketStatus[]>;
  categoryIds?: Query<string[]>;
  dateFrom?: Query<string>;
  dateTo?: Query<string>;
}

type UserSLAStats = {
  id: string;
  name: string;
  atRisk: number;
  overdue: number;
  ticketTotal: number;
};

export interface UsersSLAResponse {
  assignees: UserSLAStats[];
  ticketTotal: number;
  assigneeTotal: number;
}

interface TicketRow {
  id: string;
  created_at: Date;
  resolved_at: Date | null;
  due_date: Date | null;
  assignee_id: string | null;
  assignee_name: string | null;
}

export const slaComplianceByUsers = api<UsersSLARequest, UsersSLAResponse>(
  {
    expose: true,
    method: "GET",
    path: "/reports/sla-compliance-by-users",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    const accessibleMarketCenterIds =
      await subscriptionRepository.getAccessibleMarketCenterIds(
        userContext?.marketCenterId
      );
    if (!accessibleMarketCenterIds || !accessibleMarketCenterIds.length) {
      return { assignees: [], ticketTotal: 0, assigneeTotal: 0 };
    }
    const subscription = await subscriptionRepository.findByMarketCenterId(
      userContext?.marketCenterId
    );
    const isActive = subscription && subscription?.status === "ACTIVE";

    // Convert arrays to filter params (null if empty)
    const categoryIds =
      req.categoryIds && req.categoryIds.length > 0 ? req.categoryIds : null;
    const assigneeIds =
      req.assigneeIds && req.assigneeIds.length > 0 ? req.assigneeIds : null;
    const statusList = req.status && req.status.length > 0 ? req.status : null;

    let marketCenterIds: string[] = [];
    if (
      userContext.role === "ADMIN" &&
      userContext?.marketCenterId &&
      isActive
    ) {
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
            SELECT t.id, t.created_at, t.resolved_at, t.due_date,
                   t.assignee_id, assignee.name as assignee_name
            FROM tickets t
            LEFT JOIN users assignee ON t.assignee_id = assignee.id
            WHERE t.assignee_id = ${userContext.userId}
            AND (${assigneeIds}::text[] IS NULL OR t.assignee_id = ANY(${assigneeIds}))
            AND (${statusList}::text[] IS NULL OR t.status = ANY(${statusList}))
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
          `;
        } else {
          ticketsFound = await db.queryAll<TicketRow>`
            SELECT DISTINCT t.id, t.created_at, t.resolved_at, t.due_date,
                   t.assignee_id, assignee.name as assignee_name
            FROM tickets t
            LEFT JOIN ticket_categories tc ON t.category_id = tc.id
            LEFT JOIN users assignee ON t.assignee_id = assignee.id
            WHERE (
              tc.market_center_id = ${userContext.marketCenterId}
              OR assignee.market_center_id = ${userContext.marketCenterId}
              OR creator.market_center_id = ${userContext.marketCenterId}
            )
            AND (${assigneeIds}::text[] IS NULL OR t.assignee_id = ANY(${assigneeIds}))
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
            SELECT DISTINCT t.id, t.created_at, t.resolved_at, t.due_date,
                   t.assignee_id, assignee.name as assignee_name
            FROM tickets t
            LEFT JOIN users assignee ON t.assignee_id = assignee.id
            WHERE assignee.market_center_id = ANY(${marketCenterIds})
            AND (${assigneeIds}::text[] IS NULL OR t.assignee_id = ANY(${assigneeIds}))
            AND (${statusList}::text[] IS NULL OR t.status = ANY(${statusList}))
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
          `;
        } else {
          // No subscription or inactive subscription - limit to own tickets
          ticketsFound = await db.queryAll<TicketRow>`
            SELECT t.id, t.created_at, t.resolved_at, t.due_date,
                   t.assignee_id, assignee.name as assignee_name
            FROM tickets t
            LEFT JOIN users assignee ON t.assignee_id = assignee.id
            WHERE t.assignee_id = ${userContext.userId}
            AND (${assigneeIds}::text[] IS NULL OR t.assignee_id = ANY(${assigneeIds}))
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

    const allUserStats: UserSLAStats[] = [];

    for (const ticket of ticketsFound) {
      const slaStatus = getTicketSlaStatus({
        createdAt: ticket.created_at,
        resolvedAt: ticket.resolved_at ? ticket.resolved_at : undefined,
        dueDate: ticket.due_date ? ticket.due_date : undefined,
      });
      if (slaStatus === "compliant" || slaStatus === "onTrack") continue;

      const assigneeId = ticket.assignee_id || "Unassigned";
      const assignee = allUserStats.find((user) => user.id === assigneeId);

      const assigneeName = ticket.assignee_id
        ? ticket.assignee_name || "No Name"
        : "Unassigned";

      switch (slaStatus) {
        case "atRisk":
          if (assignee) {
            assignee.atRisk += 1;
            assignee.ticketTotal += 1;
          } else {
            allUserStats.push({
              id: assigneeId,
              name: assigneeName,
              atRisk: 1,
              overdue: 0,
              ticketTotal: 1,
            });
          }
          break;
        case "overdue":
          if (assignee) {
            assignee.overdue += 1;
            assignee.ticketTotal += 1;
          } else {
            allUserStats.push({
              id: assigneeId,
              name: assigneeName,
              atRisk: 0,
              overdue: 1,
              ticketTotal: 1,
            });
          }
          break;
      }
    }

    let ticketTotal = 0;
    if (allUserStats.length > 0) {
      allUserStats.forEach((user) => {
        ticketTotal += user.ticketTotal;
      });
    }
    return {
      assignees: allUserStats,
      ticketTotal: ticketTotal,
      assigneeTotal: allUserStats.length,
    };
  }
);
