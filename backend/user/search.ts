import { api, Query } from "encore.dev/api";
import { subscriptionRepository, userRepository } from "../ticket/db";
import type { User, UserRole } from "../user/types";
import { getUserContext } from "../auth/user-context";

export interface SearchUsersRequest {
  query?: string;
  role?: UserRole[];
  isActive?: boolean;
  marketCenterId?: string;

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

    // Agents and staff without market center can only see themselves
    if (
      userContext.role === "AGENT" ||
      ((userContext.role === "STAFF" || userContext.role === "STAFF_LEADER") &&
        !userContext?.marketCenterId)
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
    let marketCenterIds: string[] | undefined;

    if (userContext.role === "ADMIN" && userContext?.marketCenterId) {
      const accessibleMarketCenterIds =
        await subscriptionRepository.getAccessibleMarketCenterIds(
          userContext.marketCenterId
        );

      if (req?.marketCenterId) {
        const found = accessibleMarketCenterIds.find(
          (id) => id === req.marketCenterId
        );
        marketCenterIds = found ? [req.marketCenterId] : undefined;
      } else {
        marketCenterIds = accessibleMarketCenterIds;
      }
    }

    if (
      (userContext.role === "STAFF" || userContext.role === "STAFF_LEADER") &&
      userContext?.marketCenterId
    ) {
      marketCenterIds = [userContext.marketCenterId];
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
