import { api, APIError, Query } from "encore.dev/api";
import { userRepository } from "../ticket/db";
import type { User, UserRole } from "../user/types";
import { getUserContext } from "../auth/user-context";
import { getAccessibleMarketCenterIds } from "../auth/permissions";
// TODO: Accessible market centers based on subscription - primary market center ID in params for ADMIN ENTERPRISE users

export interface SearchUsersRequest {
  query?: string;
  role?: UserRole[];
  isActive?: boolean;
  marketCenterId?: string | "Unassigned";

  hasTickets?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;

  sortBy?: Query<"updatedAt" | "createdAt" | "name" | "role">;
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
    const accessibleMarketCenterIds =
      await getAccessibleMarketCenterIds(userContext);

    if (!accessibleMarketCenterIds.length) {
      return { users: [], total: 0 };
    }

    if (!userContext?.role) {
      throw APIError.permissionDenied("Unauthorized");
    }
    const isStaff =
      userContext.role === "STAFF" || userContext.role === "STAFF_LEADER";
    const isAdmin = userContext.role === "ADMIN";

    // Agents and staff without market center can only see themselves
    if (
      userContext.role === "AGENT" ||
      (isStaff && !userContext?.marketCenterId)
    ) {
      const user = await userRepository.findById(userContext.userId);

      if (!user || !user.isActive) {
        return { users: [], total: 0 };
      }

      // If query provided, check if it matches
      if (req.query) {
        const queryLower = req.query.toLowerCase();
        const nameMatch = user.name?.toLowerCase().includes(queryLower);
        const emailMatch = user.email.toLowerCase().includes(queryLower);
        if (!nameMatch && !emailMatch) {
          return { users: [], total: 0 };
        }
      }

      const formattedUser = {
        ...user,
        name: user.name ?? "",
      };

      return {
        users: [formattedUser],
        total: 1,
      };
    }

    // Determine market center filter based on subscription and role
    let marketCenterIds: string[] = [];

    const isUnassigned =
      req?.marketCenterId !== undefined && req?.marketCenterId === "Unassigned";

    const adminMarketCenterId: string | null =
      isAdmin && req?.marketCenterId !== undefined && !isUnassigned
        ? req.marketCenterId
        : null;

    const staffMarketCenterId =
      isStaff &&
      userContext?.marketCenterId &&
      !isUnassigned &&
      accessibleMarketCenterIds.find((id) => id === userContext?.marketCenterId)
        ? userContext.marketCenterId
        : null;

    if (isUnassigned) {
      marketCenterIds.push("Unassigned");
    }

    if (isAdmin && adminMarketCenterId && !isUnassigned) {
      marketCenterIds.push(adminMarketCenterId);
    }
    if (isAdmin && !adminMarketCenterId && !isUnassigned) {
      marketCenterIds = accessibleMarketCenterIds;
    }
    if (isStaff && staffMarketCenterId && !isUnassigned) {
      marketCenterIds.push(staffMarketCenterId);
    }

    const { users, total } = await userRepository.search({
      query: req.query,
      role: req.role,
      marketCenterIds:
        marketCenterIds && marketCenterIds.length > 0
          ? marketCenterIds
          : undefined,
      isActive: req.isActive,
      sortBy: req.sortBy as any,
      sortDir: req.sortDir as any,
      limit: req.limit,
      offset: req.offset,
    });

    const formattedUsers = users.map((user) => ({
      ...user,
      name: user.name ?? "N/A",
    }));

    return {
      users: formattedUsers,
      total,
    };
  }
);
