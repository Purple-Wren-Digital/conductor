import { api, APIError } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { prisma } from "../ticket/db";
import { Prisma } from "@prisma/client";
import { getUserContext } from "../auth/user-context";
import { MarketCenter } from "./types";

export interface ListMarketCentersRequest {
  id?: Query<string>;
  categoryId?: Query<string[]>;
  userIds?: Query<string[]>;

  query?: Query<string>;

  sortBy?: Query<"updatedAt" | "createdAt" | "urgency" | "status">;
  sortDir?: Query<"asc" | "desc">;

  limit?: Query<number>;
  offset?: Query<number>;
}

export interface ListMarketCentersResponse {
  marketCenters: MarketCenter[];
  total: number;
}

export const search = api<ListMarketCentersRequest, ListMarketCentersResponse>(
  {
    expose: true,
    method: "GET",
    path: "/marketCenters/search",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    // AGENT + STAFF

    if (
      (userContext.role === "AGENT" || userContext.role === "STAFF") &&
      userContext?.marketCenterId
    ) {
      const marketCenter = await prisma.marketCenter.findUnique({
        where: { id: userContext.marketCenterId },
        include: { users: true, ticketCategories: true },
      });

      if (!marketCenter) {
        throw APIError.notFound("Market center not found");
      }

      const totalTickets = await prisma.ticket.count({
        where: { category: { marketCenterId: marketCenter.id } },
      });

      return {
        marketCenters: [
          {
            ...marketCenter,
            totalTickets,
            users: marketCenter.users.map((user) => ({
              ...user,
              name: user.name ?? "",
            })),
          },
        ],
        total: 1,
      };
    }

    // ADMIN
    const limit = Math.min(Math.max(Number(req.limit ?? 50), 1), 200);
    const offset = Math.max(Number(req.offset ?? 0), 0);

    const sortBy: "updatedAt" | "createdAt" =
      (req.sortBy as any) ?? "updatedAt";

    const sortDir: Prisma.SortOrder = req.sortDir === "asc" ? "asc" : "desc";

    const orderBy: Prisma.MarketCenterOrderByWithRelationInput[] = [];

    switch (sortBy) {
      case "createdAt":
        orderBy.push({ createdAt: sortDir }, { id: "desc" });
        break;
      case "updatedAt":
        orderBy.push({ updatedAt: sortDir }, { id: "desc" });
        break;
      default:
        orderBy.push({ updatedAt: sortDir }, { id: "desc" });
        break;
    }

    let where: any = {};

    if (userContext.role === "ADMIN" && req?.id) {
      where.id = req.id;
    }

    if (req?.query) {
      where.OR = [
        { name: { contains: req.query, mode: Prisma.QueryMode.insensitive } },
        { id: { contains: req.query, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    if (req?.categoryId && req.categoryId?.length > 0) {
      where.ticketCategories = {
        some: {
          id: { in: req.categoryId },
        },
      };
    }

    if (req?.userIds && req?.userIds.length > 0) {
      where.users = {
        some: {
          id: {
            in: req.userIds as string[],
          },
        },
      };
    }

    const [marketCenters, total] = await Promise.all([
      prisma.marketCenter.findMany({
        where,
        include: { users: true, ticketCategories: true },
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.marketCenter.count({ where }),
    ]);

    const formattedMarketCenters = await Promise.all(
      marketCenters.map(async (mc) => {
        const totalTickets = await prisma.ticket.count({
          where: {
            category: {
              marketCenterId: mc.id,
            },
          },
        });

        return {
          ...mc,
          totalTickets,
          users: mc.users.map((user) => ({
            ...user,
            name: user.name ?? "",
          })),
        };
      })
    );
    return { marketCenters: formattedMarketCenters, total: total };
  }
);
