import { api, APIError } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { prisma } from "../ticket/db";
import { Prisma } from "@prisma/client";
import { getUserContext } from "../auth/user-context";
import { MarketCenter } from "./types";
import { canManageMarketCenters } from "../auth/permissions";

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
    const canManage = canManageMarketCenters(userContext);

    if (!canManage) {
      throw APIError.permissionDenied("Only Admin can update market centers");
    }

    const limit = Math.min(Math.max(Number(req.limit ?? 50), 1), 200);
    const offset = Math.max(Number(req.offset ?? 0), 0);

    let where: any = {};

    if (req?.query) {
      where.OR = [
        { name: { contains: req.query, mode: Prisma.QueryMode.insensitive } },
        { id: { contains: req.query, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    if (req?.id) {
      where.id = req.id;
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

    const formattedMarketCenters = marketCenters.map((mc) => ({
      ...mc,
      users: mc.users.map((user) => ({
        ...user,
        name: user.name ?? "",
      })),
    }));
    return { marketCenters: formattedMarketCenters, total: total };
  }
);
