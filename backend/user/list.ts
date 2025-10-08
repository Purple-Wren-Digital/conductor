import { api, APIError } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { User, UserRole } from "../ticket/types";
import { getUserContext } from "../auth/user-context";

export interface ListUsersRequest {
  role?: Query<UserRole>;
  isActive?: Query<boolean>;
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
    const userContext = await getUserContext();

    if (userContext?.role === "AGENT") {
      const user = await prisma.user.findUnique({
        where: { id: userContext.userId },
      });

      return {
        users: user
          ? [
              {
                ...user,
                name: user.name ?? "",
              },
            ]
          : [],
      };
    }

    let where: any = {};

    if (req?.role) {
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
