import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { User, UserRole } from "../ticket/types";
import { getUserContext } from "../auth/user-context";
// import { getUserScopeFilter } from "../auth/permissions";

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
    await getUserContext();

    // const userScopeFilter = getUserScopeFilter(userContext);

    // const baseWhere: any = {
    //   ...userScopeFilter,
    //   isActive: true,
    //   deletedAt: null,
    // };

    let where: any = {};

    if (req.role) {
      where.role = req.role;
    }
    if (req.isActive) {
      where.isActive = req.isActive;
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
