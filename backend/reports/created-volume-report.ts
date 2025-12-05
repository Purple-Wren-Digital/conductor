import { api, APIError, Query } from "encore.dev/api";
import { prisma } from "../ticket/db";
import { Prisma } from "@prisma/client";
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

export const createdByMonth = api<CreatedVolumeRequest, CreatedVolumeResponse>(
  {
    expose: true,
    method: "GET",
    path: "/reports/created-by-month",
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
      const createdAt: Prisma.DateTimeFilter = {};
      if (req.dateFrom) {
        const from = new Date(req.dateFrom);
        if (!isNaN(from.getTime())) createdAt.gte = from;
      }
      if (req.dateTo) {
        const to = new Date(req.dateTo);
        if (!isNaN(to.getTime())) createdAt.lte = to;
      }
      if (Object.keys(createdAt).length > 0) {
        where.createdAt = createdAt;
      }
    } else {
      // Default to last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setDate(1);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      where.createdAt = { gte: sixMonthsAgo };
    }

    const tickets = await prisma.ticket.findMany({ where });

    const ticketsCreated: {
      createdMonthYear: string;
      createdCount: number;
    }[] = [];
    // Sort the tickets into groups by MM/YYYY
    tickets.forEach((ticket) => {
      const createdDate = ticket.createdAt;
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
