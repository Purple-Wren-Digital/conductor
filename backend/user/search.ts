import { api, Query } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { User, UserRole } from "../ticket/types";
import { getUserContext } from "../auth/user-context";
import { Prisma } from "@prisma/client";

export interface SearchUsersRequest {
  query?: string;
  role?: UserRole[];
  isActive?: boolean;
  marketCenterId?: string;

  hasTickets?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;

  sortBy?: Query<"updatedAt" | "createdAt" | "name">;
  sortDir?: Query<"asc" | "desc">;

  limit?: number;
  offset?: number;
}

export interface SearchUsersResponse {
  users: User[];
  total: number;
}

export const search = api<SearchUsersRequest, SearchUsersResponse>(
  {
    expose: true,
    method: "GET",
    path: "/users/search",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    if (userContext.role === "AGENT") {
      const baseWhere = {
        id: userContext?.userId,
        isActive: true,
      };
      let where: any = { ...baseWhere };

      if (req.query) {
        where = {
          OR: [
            { name: { contains: req.query, mode: "insensitive" } },
            { email: { contains: req.query, mode: "insensitive" } },
          ],
          ...where,
        };
      }

      const users = await prisma.user.findMany({
        where,
        take: 1,
      });

      const formattedUsers = users.map((user) => ({
        ...user,
        name: user.name ?? "",
      }));

      return {
        users: formattedUsers,
        total: users.length,
        hasMore: false,
      };
    }

    const limit = Math.min(Math.max(Number(req.limit ?? 50), 1), 200);
    const offset = Math.max(Number(req.offset ?? 0), 0);

    let where: any = {};

    if (req.query) {
      where.OR = [
        { name: { contains: req.query, mode: "insensitive" } },
        { email: { contains: req.query, mode: "insensitive" } },
      ];
    }

    if (userContext.role === "ADMIN" && req.marketCenterId) {
      where = { marketCenterId: req.marketCenterId };
    }

    if (userContext.role === "STAFF" && req?.marketCenterId) {
      where = { marketCenterId: userContext.marketCenterId };
    }

    if (req.role && req.role.length > 0) {
      where.role = { in: req.role };
    }

    if (req.isActive) {
      where.isActive = req.isActive;
    }

    // if (req.hasTickets !== undefined) {
    //   if (req.hasTickets) {
    //     where.OR = [
    //       ...(where.OR ?? []),
    //       { createdTickets: { some: {} } },
    //       { assignedTickets: { some: {} } },
    //     ];
    //   } else {
    //     where.AND = [
    //       ...(where.AND ?? []),
    //       { createdTickets: { none: {} } },
    //       { assignedTickets: { none: {} } },
    //     ];
    //   }
    // }

    const sortBy: "updatedAt" | "createdAt" | "name" | "id" =
      (req.sortBy as any) ?? "updatedAt";

    const sortDir: Prisma.SortOrder = req.sortDir === "asc" ? "asc" : "desc";

    const orderBy: Prisma.UserOrderByWithRelationInput[] = [];

    switch (sortBy) {
      case "createdAt":
        orderBy.push({ createdAt: sortDir });
        break;
      case "name":
        orderBy.push({ name: sortDir });
        break;
      case "id":
        orderBy.push({ id: sortDir });
        break;
      default:
        orderBy.push({ updatedAt: sortDir });
        break;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          _count: {
            select: {
              createdTickets: true,
              assignedTickets: true,
              comments: true,
            },
          },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where: { ...where } }),
    ]);

    const formattedUsers = users.map((user) => ({
      ...user,
      name: user.name ?? "",
    }));

    return {
      users: formattedUsers,
      total,
    };
  }
);
