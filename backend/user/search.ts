import { api } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { User, UserRole } from "../ticket/types";

export interface SearchUsersRequest {
  query?: string;        // Search in name and email
  role?: UserRole[];     // Filter by roles
  hasTickets?: boolean;  // Only users with/without tickets
  limit?: number;        // Max results (default 50)
  offset?: number;       // Pagination offset
}

export interface SearchUsersResponse {
  users: User[];
  total: number;
  hasMore: boolean;
}

export const search = api<SearchUsersRequest, SearchUsersResponse>(
  { expose: true, method: "GET", path: "/users/search", auth: true },
  async (req) => {
    // TODO: Implement auth context
    const currentUserRole = "ADMIN" as UserRole;

    // Only staff and admins can search users
    if (currentUserRole === "AGENT") {
      // Agents can only search for their own profile
      const where: any = {};
      if (req.query) {
        where.OR = [
          { name: { contains: req.query, mode: 'insensitive' } },
          { email: { contains: req.query, mode: 'insensitive' } },
        ];
      }
      // Limit to just the current user (when auth is implemented)
      where.id = "user_1"; // TODO: Use actual current user ID

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

    const limit = req.limit || 50;
    const offset = req.offset || 0;

    // Build dynamic where clause
    const where: any = {};

    // Text search in name and email
    if (req.query) {
      where.OR = [
        { name: { contains: req.query, mode: 'insensitive' } },
        { email: { contains: req.query, mode: 'insensitive' } },
      ];
    }

    // Role filter
    if (req.role && req.role.length > 0) {
      where.role = { in: req.role };
    }

    // Has tickets filter
    if (req.hasTickets !== undefined) {
      if (req.hasTickets) {
        where.OR = [
          { createdTickets: { some: {} } },
          { assignedTickets: { some: {} } },
        ];
      } else {
        where.AND = [
          { createdTickets: { none: {} } },
          { assignedTickets: { none: {} } },
        ];
      }
    }

    // Execute search with pagination
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
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      hasMore: offset + limit < total,
    };
  }
);