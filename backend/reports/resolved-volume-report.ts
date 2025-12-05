import { api, APIError, Query } from "encore.dev/api";
import { prisma } from "../ticket/db";
import { Prisma } from "@prisma/client";
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
    let where: Prisma.TicketWhereInput = {
      status: "RESOLVED",
      resolvedAt: { not: null },
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

    if (req.assigneeIds && req.assigneeIds.length > 0) {
      where.assigneeId = { in: req.assigneeIds as string[] };
    }

    if (req.creatorIds && req.creatorIds.length > 0) {
      where.creatorId = { in: req.creatorIds as string[] };
    }

    if (req.dateFrom || req.dateTo) {
      const resolvedAt: Prisma.DateTimeFilter = {};
      if (req.dateFrom) {
        const from = new Date(req.dateFrom);
        if (!isNaN(from.getTime())) resolvedAt.gte = from;
      }
      if (req.dateTo) {
        const to = new Date(req.dateTo);
        if (!isNaN(to.getTime())) resolvedAt.lte = to;
      }
      if (Object.keys(resolvedAt).length > 0) {
        where.resolvedAt = resolvedAt;
      }
    } else {
      // Default to last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setDate(1);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      where.resolvedAt = { gte: sixMonthsAgo };
    }

    const tickets = await prisma.ticket.findMany({ where });

    const ticketsResolved: {
      resolvedMonthYear: string;
      resolvedCount: number;
    }[] = [];
    // Sort the tickets into groups by MM/YYYY
    tickets.forEach((ticket) => {
      const resolvedDate = ticket.resolvedAt;
      if (!resolvedDate) return;
      const month = resolvedDate.getMonth() + 1; // Months are zero-based
      const year = resolvedDate.getFullYear();
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
