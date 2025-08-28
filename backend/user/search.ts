import { api } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { User, UserRole } from "../ticket/types";

export interface SearchUsersRequest {
  query?: string;
  role?: UserRole[];
  hasTickets?: boolean;
  limit?: number;
  offset?: number;
}

export interface SearchUsersResponse {
  users: User[];
  total: number;
  hasMore: boolean;
}

export const search = api<SearchUsersRequest, SearchUsersResponse>(
  {
    expose: true,
    method: "GET",
    path: "/users/search",
    auth: false, // true,
  },
  async (req) => {
    const currentUserRole = "ADMIN" as UserRole;

    const baseWhere: any = { isActive: true, deletedAt: null };

    if (currentUserRole === "AGENT") {
      const where: any = { ...baseWhere };

      if (req.query) {
        where.OR = [
          { name: { contains: req.query, mode: "insensitive" } },
          { email: { contains: req.query, mode: "insensitive" } },
        ];
      }

      where.id = "user_1";

      const users = await prisma.user.findMany({
        where,
        take: 1,
      });

      return {
        users,
        total: users.length,
        hasMore: false,
      };
    }

    const limit = req.limit ?? 50;
    const offset = req.offset ?? 0;

    const where: any = {};

    if (req.query) {
      where.OR = [
        { name: { contains: req.query, mode: "insensitive" } },
        { email: { contains: req.query, mode: "insensitive" } },
      ];
    }

    if (req.role && req.role.length > 0) {
      where.role = { in: req.role };
    }

    if (req.hasTickets !== undefined) {
      if (req.hasTickets) {
        where.OR = [
          ...(where.OR ?? []),
          { createdTickets: { some: {} } },
          { assignedTickets: { some: {} } },
        ];
      } else {
        where.AND = [
          ...(where.AND ?? []),
          { createdTickets: { none: {} } },
          { assignedTickets: { none: {} } },
        ];
      }
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { ...baseWhere, ...where },
        include: {
          _count: {
            select: {
              createdTickets: true,
              assignedTickets: true,
              comments: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where: { ...baseWhere, ...where } }),
    ]);

    return {
      users,
      total,
      hasMore: offset + limit < total,
    };
  }
);
