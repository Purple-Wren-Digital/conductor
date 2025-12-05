import { api, APIError, Query } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { TicketStatus } from "../ticket/types";
import { Prisma } from "@prisma/client";
import { getUserContext } from "../auth/user-context";

export interface BacklogRequest {
  marketCenterIds?: Query<string[]>;
  status?: Query<TicketStatus[]>;
  categoryIds?: Query<string[]>;
}

export interface BacklogResponse {
  created: number;
  unassigned: number;
  total: number;
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

    let where: Prisma.TicketWhereInput = {
      status: { in: ["CREATED", "ASSIGNED"] },
    };

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

    if (req.categoryIds && req.categoryIds.length > 0) {
      where.categoryId = { in: req.categoryIds as string[] };
    }

    const ticketsFound = await prisma.ticket.findMany({ where });

    return {
      created: ticketsFound.filter((t) => t.status === "CREATED").length,
      unassigned: ticketsFound.filter((t) => t.status === "UNASSIGNED").length,
      total: ticketsFound.length,
    };
  }
);
