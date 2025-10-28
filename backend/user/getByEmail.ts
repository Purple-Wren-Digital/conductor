import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { User } from "../user/types";
import { getAuthData } from "~encore/auth";

export interface GetUserByEmailRequest {
  email: string;
}

export interface GetUserByEmailResponse {
  user: User;
}

export const getByEmail = api<GetUserByEmailRequest, GetUserByEmailResponse>(
  {
    expose: true,
    method: "GET",
    path: "/users/email/:email",
    auth: true,
  },
  async (req) => {
    const authData = await getAuthData();

    if (!authData) {
      throw APIError.unauthenticated("User not authenticated");
    }

    const user = await prisma.user.findUnique({
      where: { email: req.email },
      include: { marketCenter: true },
    });

    if (!user) {
      throw APIError.notFound("user not found");
    }

    return { user: user } as GetUserByEmailResponse;
  }
);
