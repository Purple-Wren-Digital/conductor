import { api, APIError } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { prisma } from "../ticket/db";
import { Prisma, TicketCategory } from "@prisma/client";
import { getUserContext } from "../auth/user-context";
import { MarketCenter } from "./types";
import { canManageMarketCenters } from "../auth/permissions";

export interface ListMarketCentersRequest {
  id?: Query<string>;
  // name?: Query<string>;
  category?: Query<string[]>; // TicketCategory.name[]

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

export const list = api<ListMarketCentersRequest, ListMarketCentersResponse>(
  {
    expose: true,
    method: "GET",
    path: "/marketCenters",
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

    // if (req.name) {
    //   where.name = req.name;
    // }

    if (req.id) {
      where.id = req.id;
    }

    // if (req.category && req.category?.length > 0) {
    //   where.ticketCategories = {
    //     some: {
    //       name: { in: req.category },
    //     },
    //   };
    // }

    if (req.query) {
      console.log("SEARCH INPUT QUERY", req.query);
      // const searchCondition = {
      //   OR: [
      //     { name: { contains: req.query, mode: Prisma.QueryMode.insensitive } },
      //   ],
      // };

      // where.OR = searchCondition.OR;
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
