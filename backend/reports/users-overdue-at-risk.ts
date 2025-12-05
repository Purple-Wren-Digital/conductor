import { api, APIError, Query } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { TicketStatus } from "../ticket/types";
import { Prisma } from "@prisma/client";
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

export const slaComplianceByUsers = api<UsersSLARequest, UsersSLAResponse>(
  {
    expose: true,
    method: "GET",
    path: "/reports/sla-compliance-by-users",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    let where: Prisma.TicketWhereInput = {};

    switch (userContext.role) {
      case "STAFF":
      case "STAFF_LEADER":
        if (!userContext.marketCenterId) {
          where.assigneeId = userContext.userId;
        } else {
          const baseScope: Prisma.TicketWhereInput = {
            OR: [
              { category: { marketCenterId: userContext.marketCenterId } },
              { assignee: { marketCenterId: userContext.marketCenterId } },
            ],
          };

          where = baseScope;
        }
        break;
      case "ADMIN":
        const baseScopeAdmin: Prisma.TicketWhereInput = {};
        if (req.marketCenterIds && req.marketCenterIds.length > 0) {
          baseScopeAdmin.OR = [
            { assignee: { marketCenterId: { in: req.marketCenterIds } } },
          ];
        }
        where = baseScopeAdmin;
        break;
      default:
        throw APIError.permissionDenied(
          "User not permitted to generate ticket reports"
        );
    }

    if (req.assigneeIds && req.assigneeIds.length > 0) {
      where.assigneeId = { in: req.assigneeIds as string[] };
    }

    if (req.status && req.status.length > 0) {
      where.status = { in: req.status as TicketStatus[] };
    }
    if (req.categoryIds && req.categoryIds.length > 0) {
      where.categoryId = { in: req.categoryIds as string[] };
    }

    const ticketsFound = await prisma.ticket.findMany({
      where,
      include: { assignee: { select: { id: true, name: true } } },
    });

    const allUserStats: UserSLAStats[] = [];

    for (const ticket of ticketsFound) {
      const slaStatus = getTicketSlaStatus({
        createdAt: ticket.createdAt,
        resolvedAt: ticket?.resolvedAt ? ticket.resolvedAt : undefined,
        dueDate: ticket?.dueDate ? ticket.dueDate : undefined,
      });
      if (slaStatus === "compliant" || slaStatus === "onTrack") continue;

      const assignee = allUserStats.find(
        (user) => user?.id === ticket?.assigneeId || user?.id === "Unassigned"
      );

      switch (slaStatus) {
        case "atRisk":
          if (assignee) {
            assignee.atRisk += 1;
            assignee.ticketTotal += 1;
          }
          if (!assignee) {
            allUserStats.push({
              id: ticket?.assigneeId ? ticket.assigneeId : "Unassigned",
              name:
                ticket?.assigneeId && ticket?.assignee?.name
                  ? ticket.assignee.name
                  : ticket?.assigneeId && !ticket?.assignee?.name
                    ? "No Name"
                    : "Unassigned",
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
          }
          if (!assignee) {
            allUserStats.push({
              id: ticket?.assigneeId ? ticket.assigneeId : "Unassigned",
              name:
                ticket?.assigneeId && ticket?.assignee?.name
                  ? ticket.assignee.name
                  : ticket?.assigneeId && !ticket?.assignee?.name
                    ? "No Name"
                    : "Unassigned",
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
