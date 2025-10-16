import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { User } from "../ticket/types";
import { getAuthData } from "~encore/auth";

export interface GetUserRequest {
  email: string;
}

export interface GetUserResponse {
  user: User;
}

export const getByEmail = api<GetUserRequest, GetUserResponse>(
  {
    expose: true,
    method: "GET",
    path: "/users/email/:email",
    auth: true,
  },
  async (req) => {
    const authData = await getAuthData();
    if (!authData) {
      throw APIError.unauthenticated("user not authenticated");
    }
    const user = await prisma.user.findUnique({
      where: { email: req.email },
      include: { marketCenter: true },
    });

    if (!user) {
      throw APIError.notFound("user not found");
    }

    return { user: user } as GetUserResponse;
  }
);
