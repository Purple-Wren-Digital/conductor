import { api, APIError } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { userRepository } from "../ticket/db";
import type { User, UserRole } from "../user/types";
import { getUserContext } from "../auth/user-context";
import { getAccessibleMarketCenterIds } from "../auth/permissions";

export interface ListUsersRequest {
  role?: Query<UserRole[]>;
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

    if (!userContext?.role || userContext?.role === "AGENT") {
      const user = await userRepository.findById(userContext.userId);

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

    // Build search parameters
    const searchParams: any = {
      sortBy: "name" as const,
      sortDir: "asc" as const,
    };

    if (req?.role && req?.role.length > 0) {
      searchParams.role = req.role;
    }

    // Determine market center filter based on subscription and role

    const accessibleMarketCenterIds =
      await getAccessibleMarketCenterIds(userContext);

    if (
      !accessibleMarketCenterIds.length
    ) {
      return { users: [] };
    }

    if (userContext.role === "ADMIN") {
      searchParams.marketCenterIds = accessibleMarketCenterIds;
    }

    if (
      (userContext.role === "STAFF" || userContext.role === "STAFF_LEADER") &&
      userContext?.marketCenterId &&
      accessibleMarketCenterIds.find((id) => id === userContext?.marketCenterId)
    ) {
      searchParams.marketCenterIds = [userContext.marketCenterId];
    }

    const { users } = await userRepository.search(searchParams);

    const formattedUsers = users.map((user) => ({
      ...user,
      name: user.name ?? "",
    }));

    return { users: formattedUsers };
  }
);
