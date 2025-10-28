import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { User } from "../user/types";
import { getUserContext } from "../auth/user-context";

export interface GetUserRequest {
  id: string;
}

export interface GetUserResponse {
  user: User;
}

export const get = api<GetUserRequest, GetUserResponse>(
  {
    expose: true,
    method: "GET",
    path: "/users/:id",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    if (!userContext) {
      throw APIError.unauthenticated("User not authenticated");
    }
    const user = await prisma.user.findUnique({
      where: { id: req.id },
      include: {
        marketCenter: true,
        userSettings: {
          include: {
            notificationPreferences: true,
          },
        },
      },
    });

    if (!user) {
      throw APIError.notFound("user not found");
    }

    const safeUser = {
      ...user,
      marketCenter: user.marketCenter ?? undefined,
      userSettings: user.userSettings ?? undefined,
    };

    return { user: safeUser } as GetUserResponse;
  }
);
