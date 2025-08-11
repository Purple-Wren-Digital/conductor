import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { User, UserRole } from "../ticket/types";

export interface ListUsersRequest {
  role?: Query<UserRole>;
}

export interface ListUsersResponse {
  users: User[];
}

// Retrieves all users with optional role filtering.
export const list = api<ListUsersRequest, ListUsersResponse>(
  { expose: true, method: "GET", path: "/users" },
  async (req) => {
    const where: any = {};
    
    if (req.role) {
      where.role = req.role;
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return { users };
  }
);
