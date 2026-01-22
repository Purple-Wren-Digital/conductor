import { api, APIError, Query } from "encore.dev/api";
import { db, subscriptionRepository } from "../ticket/db";
import type { TicketStatus } from "../ticket/types";
import { getUserContext } from "../auth/user-context";
import { slaRepository } from "../shared/repositories";

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
  ticketTotal: number;
  response: {
    atRisk: number;
    overdue: number;
  };
  resolve: {
    atRisk: number;
    overdue: number;
  };
};

export interface UsersSLAResponse {
  assignees: UserSLAStats[];
  ticketTotal: number;
  assigneeTotal: number;
}

interface SLAResponseTicketRow {
  id: string;
  assignee_id: string | null;
  assignee_name: string | null;
  response_at_risk: number;
  response_breached: number;
}

interface SLAResolutionTicketRow {
  id: string;
  assignee_id: string | null;
  assignee_name: string | null;
  resolve_at_risk: number;
  resolve_breached: number;
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
      return {
        assignees: [] as UserSLAStats[],
        ticketTotal: 0,
        assigneeTotal: 0,
      };
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

    let responseTicketsFound: SLAResponseTicketRow[] = [];
    let resolutionTicketsFound: SLAResolutionTicketRow[] = [];

    switch (userContext.role) {
      case "STAFF":
      case "STAFF_LEADER":
        if (!userContext.marketCenterId) {
          responseTicketsFound = await db.queryAll<SLAResponseTicketRow>`
            SELECT
              t.assignee_id,
              u.name as assignee_name,
              COUNT(CASE WHEN sla_breached = false AND (first_response_at IS NULL OR first_response_at > sla_response_due_at) THEN 1 END)::int as response_at_risk,
              COUNT(CASE WHEN sla_breached = true THEN 1 END)::int as response_breached
            FROM tickets t
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE t.assignee_id = ${userContext.userId}
            AND (${assigneeIds}::text[] IS NULL OR t.assignee_id = ANY(${assigneeIds}))
            AND (${statusList}::text[] IS NULL OR t.status = ANY(${statusList}))
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
            AND sla_response_due_at IS NOT NULL
            GROUP BY t.assignee_id, u.name
          `;
          resolutionTicketsFound = await db.queryAll<SLAResolutionTicketRow>`
            SELECT
              t.assignee_id,
              u.name as assignee_name,
              COUNT(CASE WHEN sla_resolution_breached = false AND (resolved_at IS NULL OR resolved_at > sla_resolution_due_at) THEN 1 END)::int as resolve_at_risk,
              COUNT(CASE WHEN sla_resolution_breached = true THEN 1 END)::int as resolve_breached
            FROM tickets t
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE t.assignee_id = ${userContext.userId}
              AND (${assigneeIds}::text[] IS NULL OR t.assignee_id = ANY(${assigneeIds}))
              AND (${statusList}::text[] IS NULL OR t.status = ANY(${statusList}))
              AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
              AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
              AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
              AND sla_resolution_due_at IS NOT NULL
          `;
        } else {
          responseTicketsFound = await db.queryAll<SLAResponseTicketRow>`
            SELECT
              t.assignee_id,
              u.name as assignee_name,
              COUNT(CASE WHEN sla_breached = false AND (first_response_at IS NULL OR first_response_at > sla_response_due_at) THEN 1 END)::int as response_at_risk,
              COUNT(CASE WHEN sla_breached = true THEN 1 END)::int as response_breached
            FROM tickets t
            LEFT JOIN ticket_categories tc ON t.category_id = tc.id
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE (
              tc.market_center_id = ${userContext.marketCenterId}
              OR u.market_center_id = ${userContext.marketCenterId}
              OR creator.market_center_id = ${userContext.marketCenterId}
            )
            AND (${assigneeIds}::text[] IS NULL OR t.assignee_id = ANY(${assigneeIds}))
            AND (${statusList}::text[] IS NULL OR t.status = ANY(${statusList}))
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
            AND sla_response_due_at IS NOT NULL
            GROUP BY t.assignee_id, u.name
          `;
          resolutionTicketsFound = await db.queryAll<SLAResolutionTicketRow>`
            SELECT DISTINCT
              t.assignee_id,
              u.name as assignee_name,
              COUNT(CASE WHEN sla_resolution_breached = false AND (resolved_at IS NULL OR resolved_at > sla_resolution_due_at) THEN 1 END)::int as resolve_at_risk,
              COUNT(CASE WHEN sla_resolution_breached = true THEN 1 END)::int as resolve_breached
            FROM tickets t
            LEFT JOIN ticket_categories tc ON t.category_id = tc.id
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE (
              tc.market_center_id = ${userContext.marketCenterId}
              OR u.market_center_id = ${userContext.marketCenterId}
              OR creator.market_center_id = ${userContext.marketCenterId}
            )
            AND (${assigneeIds}::text[] IS NULL OR t.assignee_id = ANY(${assigneeIds}))
            AND (${statusList}::text[] IS NULL OR t.status = ANY(${statusList}))
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
            AND sla_resolution_due_at IS NOT NULL
          `;
        }
        break;
      case "ADMIN":
        if (isActive && marketCenterIds && marketCenterIds.length > 0) {
          responseTicketsFound = await db.queryAll<SLAResponseTicketRow>`
            SELECT DISTINCT
              t.assignee_id,
              u.name as assignee_name,
              COUNT(CASE WHEN sla_breached = false AND (first_response_at IS NULL OR first_response_at > sla_response_due_at) THEN 1 END)::int as response_at_risk,
              COUNT(CASE WHEN sla_breached = true THEN 1 END)::int as response_breached
            FROM tickets t
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE u.market_center_id = ANY(${marketCenterIds})
            AND (${assigneeIds}::text[] IS NULL OR t.assignee_id = ANY(${assigneeIds}))
            AND (${statusList}::text[] IS NULL OR t.status = ANY(${statusList}))
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
            AND sla_response_due_at IS NOT NULL
            GROUP BY t.assignee_id, u.name
          `;
          resolutionTicketsFound = await db.queryAll<SLAResolutionTicketRow>`
            SELECT DISTINCT
              t.assignee_id,
              u.name as assignee_name,
              COUNT(CASE WHEN sla_resolution_breached = false AND (resolved_at IS NULL OR resolved_at > sla_resolution_due_at) THEN 1 END)::int as resolve_at_risk,
              COUNT(CASE WHEN sla_resolution_breached = true THEN 1 END)::int as resolve_breached
            FROM tickets t
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE u.market_center_id = ANY(${marketCenterIds})
            AND (${assigneeIds}::text[] IS NULL OR t.assignee_id = ANY(${assigneeIds}))
            AND (${statusList}::text[] IS NULL OR t.status = ANY(${statusList}))
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
            AND sla_resolution_due_at IS NOT NULL
            GROUP BY t.assignee_id, u.name
          `;
        } else {
          // No subscription or inactive subscription - limit to own tickets
          responseTicketsFound = await db.queryAll<SLAResponseTicketRow>`
            SELECT
              t.assignee_id,
              u.name as assignee_name,
              COUNT(CASE WHEN sla_breached = false AND (first_response_at IS NULL OR first_response_at > sla_response_due_at) THEN 1 END)::int as response_at_risk,
              COUNT(CASE WHEN sla_breached = true THEN 1 END)::int as response_breached
            FROM tickets t
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE t.assignee_id = ${userContext.userId}
            AND (${assigneeIds}::text[] IS NULL OR t.assignee_id = ANY(${assigneeIds}))
            AND (${statusList}::text[] IS NULL OR t.status = ANY(${statusList}))
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
            AND sla_response_due_at IS NOT NULL
            GROUP BY t.assignee_id, u.name
          `;
          resolutionTicketsFound = await db.queryAll<SLAResolutionTicketRow>`
            SELECT
              t.assignee_id,
              u.name as assignee_name,
              COUNT(CASE WHEN sla_resolution_breached = false AND (resolved_at IS NULL OR resolved_at > sla_resolution_due_at) THEN 1 END)::int as resolve_at_risk,
              COUNT(CASE WHEN sla_resolution_breached = true THEN 1 END)::int as resolve_breached
            FROM tickets t
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE t.assignee_id = ${userContext.userId}
            AND (${assigneeIds}::text[] IS NULL OR t.assignee_id = ANY(${assigneeIds}))
            AND (${statusList}::text[] IS NULL OR t.status = ANY(${statusList}))
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
            AND sla_resolution_due_at IS NOT NULL
            GROUP BY t.assignee_id, u.name
          `;
        }
        break;
      default:
        throw APIError.permissionDenied(
          "User not permitted to generate ticket reports"
        );
    }
    const policies = await slaRepository.findAllPolicies();
    if (!policies || policies.length === 0) {
      return {
        assignees: [] as UserSLAStats[],
        ticketTotal: 0,
        assigneeTotal: 0,
      };
    }
    const allUserStats: UserSLAStats[] = [];

    // Evaluate RESPONSE SLAs
    for (const ticket of responseTicketsFound) {
      const assigneeId = ticket.assignee_id || "Unassigned";
      const assignee = allUserStats.find((user) => user.id === assigneeId);

      const assigneeName = ticket.assignee_id
        ? ticket.assignee_name || "No Name"
        : "Unassigned";
      const total = ticket.response_at_risk + ticket.response_breached;

      if (assignee) {
        assignee.response.atRisk += ticket.response_at_risk;
        assignee.response.overdue += ticket.response_breached;
        assignee.ticketTotal += total;
        continue;
      } else {
        allUserStats.push({
          id: assigneeId,
          name: assigneeName,
          response: {
            atRisk: ticket.response_at_risk,
            overdue: ticket.response_breached,
          },
          resolve: { atRisk: 0, overdue: 0 },
          ticketTotal: total,
        });
      }
    }

    // Evaluate RESOLVE SLAs
    for (const ticket of resolutionTicketsFound) {
      const assigneeId = ticket.assignee_id || "Unassigned";
      const assignee = allUserStats.find((user) => user.id === assigneeId);

      const assigneeName = ticket.assignee_id
        ? ticket.assignee_name || "No Name"
        : "Unassigned";
      const total = ticket.resolve_at_risk + ticket.resolve_breached;

      if (assignee) {
        assignee.resolve.atRisk += ticket.resolve_at_risk;
        assignee.resolve.overdue += ticket.resolve_breached;
        assignee.ticketTotal += total;
        continue;
      } else {
        allUserStats.push({
          id: assigneeId,
          name: assigneeName,
          response: { atRisk: 0, overdue: 0 },
          resolve: {
            atRisk: ticket.resolve_at_risk,
            overdue: ticket.resolve_breached,
          },
          ticketTotal: total,
        });
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
