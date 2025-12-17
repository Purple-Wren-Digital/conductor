import { api, APIError } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { subscriptionRepository, userRepository } from "../ticket/db";
import type { User, UserRole } from "../user/types";
import { getUserContext } from "../auth/user-context";

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

    if (userContext?.role === "AGENT") {
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

    if (userContext.role === "ADMIN" && userContext?.marketCenterId) {
      const accessibleMarketCenterIds =
        await subscriptionRepository.getAccessibleMarketCenterIds(
          userContext.marketCenterId
        );

      searchParams.marketCenterIds = accessibleMarketCenterIds;
    }

    if (
      (userContext.role === "STAFF" || userContext.role === "STAFF_LEADER") &&
      userContext?.marketCenterId
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
