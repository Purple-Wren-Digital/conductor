import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { User } from "../ticket/types";
import { getAuthData } from "~encore/auth";

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
    });

    if (!user) {
      throw APIError.notFound("user not found");
    }

    return { user: user } as GetUserResponse;
  }
);
