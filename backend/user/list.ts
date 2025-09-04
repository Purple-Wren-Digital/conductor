import { api, APIError } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { User, UserRole } from "../ticket/types";
import { getAuthData } from "~encore/auth";

export interface ListUsersRequest {
  role?: Query<UserRole>;
}

export interface ListUsersResponse {
  users: User[];
}

export const list = api<ListUsersRequest, ListUsersResponse>(
  {
    expose: true,
    method: "GET",
    path: "/users",
    auth: true,
  },
  async (req) => {
    const authData = await getAuthData();
    if (!authData) {
      throw APIError.unauthenticated("user not authenticated");
    }
    const baseWhere: any = {
      isActive: true,
      deletedAt: null,
    };

    const where: any = { ...baseWhere };

    if (req.role) {
      where.role = req.role;
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { name: "asc" },
    });

    const formattedUsers = users.map((user) => ({
      ...user,
      name: user.name ?? "",
    }));

    return { users: formattedUsers };
  }
);
