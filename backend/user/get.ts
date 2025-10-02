import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { User } from "../ticket/types";
import { getAuthData } from "~encore/auth";
import { mapTicketHistorySnapshot } from "../utils";

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
    const authData = await getAuthData();
    if (!authData) {
      throw APIError.unauthenticated("user not authenticated");
    }
    const user = await prisma.user.findUnique({
      where: { id: req.id },
      include: {
        marketCenter: true,
        ticketHistory: true, //{ changedBy: true},
        userHistory: true, //{ changedBy: true},
        otherUsersChanges: true,
      },
    });

    if (!user) {
      throw APIError.notFound("user not found");
    }

    console.log(JSON.stringify(user));

    const safeUser = {
      ...user,
      ticketHistory: mapTicketHistorySnapshot(user.ticketHistory),
      userHistory: mapTicketHistorySnapshot(user.userHistory),
      otherUsersChanges: mapTicketHistorySnapshot(user.otherUsersChanges),
      marketCenter: user.marketCenter ?? undefined,
    };

    return { user: safeUser } as GetUserResponse;
  }
);
