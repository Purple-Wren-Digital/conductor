import { api, APIError } from "encore.dev/api";
import { userRepository, ticketRepository } from "../ticket/db";
import type { User } from "../user/types";
import { getUserContext } from "../auth/user-context";

export interface GetUserRequest {
  id: string;
}

export interface GetUserResponse {
  user: User;
  resolvedTicketsCount: number;
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

    const user = await userRepository.findByIdWithSettings(req.id);

    if (!user) {
      throw APIError.notFound("user not found");
    }

    // Get market center if user has one
    let marketCenter;
    if (user.marketCenterId) {
      const { marketCenterRepository } = await import("../ticket/db");
      marketCenter = await marketCenterRepository.findById(user.marketCenterId);
    }

    const resolvedTicketsCount = await ticketRepository.count({
      assigneeId: user.id,
      status: ["RESOLVED"],
    });

    const safeUser = {
      ...user,
      marketCenter: marketCenter ?? undefined,
    };

    return { user: safeUser, resolvedTicketsCount } as GetUserResponse;
  }
);
