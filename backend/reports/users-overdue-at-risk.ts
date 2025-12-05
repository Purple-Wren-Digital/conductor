import { api, APIError, Query } from "encore.dev/api";
import { db } from "../ticket/db";
import type { TicketStatus } from "../ticket/types";
import { getUserContext } from "../auth/user-context";
import { getTicketSlaStatus } from "./utils";

export interface UsersSLARequest {
  marketCenterIds?: Query<string[]>;
  assigneeIds?: Query<string[]>;
  status?: Query<TicketStatus[]>;
  categoryIds?: Query<string[]>;
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

    // Convert arrays to filter params (null if empty)
    const categoryIds = req.categoryIds && req.categoryIds.length > 0 ? req.categoryIds : null;
    const assigneeIds = req.assigneeIds && req.assigneeIds.length > 0 ? req.assigneeIds : null;
    const statusList = req.status && req.status.length > 0 ? req.status : null;
    const marketCenterIds = req.marketCenterIds && req.marketCenterIds.length > 0 ? req.marketCenterIds : null;

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
            )
            AND (${assigneeIds}::text[] IS NULL OR t.assignee_id = ANY(${assigneeIds}))
            AND (${statusList}::text[] IS NULL OR t.status = ANY(${statusList}))
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
          `;
        }
        break;
      case "ADMIN":
        if (marketCenterIds) {
          ticketsFound = await db.queryAll<TicketRow>`
            SELECT DISTINCT t.id, t.created_at, t.resolved_at, t.due_date,
                   t.assignee_id, assignee.name as assignee_name
            FROM tickets t
            LEFT JOIN users assignee ON t.assignee_id = assignee.id
            WHERE assignee.market_center_id = ANY(${marketCenterIds})
            AND (${assigneeIds}::text[] IS NULL OR t.assignee_id = ANY(${assigneeIds}))
            AND (${statusList}::text[] IS NULL OR t.status = ANY(${statusList}))
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
          `;
        } else {
          ticketsFound = await db.queryAll<TicketRow>`
            SELECT t.id, t.created_at, t.resolved_at, t.due_date,
                   t.assignee_id, assignee.name as assignee_name
            FROM tickets t
            LEFT JOIN users assignee ON t.assignee_id = assignee.id
            WHERE (${assigneeIds}::text[] IS NULL OR t.assignee_id = ANY(${assigneeIds}))
            AND (${statusList}::text[] IS NULL OR t.status = ANY(${statusList}))
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
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
      const assignee = allUserStats.find(
        (user) => user.id === assigneeId
      );

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
