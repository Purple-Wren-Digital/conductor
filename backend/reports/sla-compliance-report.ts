import { api, APIError, Query } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { TicketStatus } from "../ticket/types";
import { Prisma } from "@prisma/client";
import { getUserContext } from "../auth/user-context";
import { getTicketSlaStatus } from "./utils";

export interface SLARequest {
  marketCenterIds?: Query<string[]>;
  status?: Query<TicketStatus[]>;
  categoryIds?: Query<string[]>;
}

export interface SLAResponse {
  compliant: number;
  onTrack: number;
  atRisk: number;
  overdue: number;
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

    let where: Prisma.TicketWhereInput = {};

    switch (userContext.role) {
      case "STAFF":
      case "STAFF_LEADER":
        if (!userContext.marketCenterId) {
          where = {
            OR: [
              { assigneeId: userContext.userId },
              { creatorId: userContext.userId },
            ],
          };
        } else {
          const baseScope: Prisma.TicketWhereInput = {
            OR: [
              { category: { marketCenterId: userContext.marketCenterId } },
              { creator: { marketCenterId: userContext.marketCenterId } },
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
            { category: { marketCenterId: { in: req.marketCenterIds } } },
            { creator: { marketCenterId: { in: req.marketCenterIds } } },
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

    if (req.status && req.status.length > 0) {
      where.status = { in: req.status as TicketStatus[] };
    }
    if (req.categoryIds && req.categoryIds.length > 0) {
      where.categoryId = { in: req.categoryIds as string[] };
    }

    const ticketsFound = await prisma.ticket.findMany({
      where,
    });
    const report = {
      compliant: 0,
      onTrack: 0,
      atRisk: 0,
      overdue: 0,
    };

    for (const ticket of ticketsFound) {
      const slaStatus = getTicketSlaStatus({
        createdAt: ticket.createdAt,
        resolvedAt: ticket?.resolvedAt ? ticket.resolvedAt : undefined,
        dueDate: ticket?.dueDate ? ticket.dueDate : undefined,
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
