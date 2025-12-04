import { api, APIError } from "encore.dev/api";
import { userRepository } from "../ticket/db";
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

    // First find user by email
    const userByEmail = await userRepository.findByEmail(req.email);

    if (!userByEmail) {
      throw APIError.notFound("user not found");
    }

    // Then get user with market center
    const user = await userRepository.findByIdWithMarketCenter(userByEmail.id);

    if (!user) {
      throw APIError.notFound("user not found");
    }

    return { user: user } as GetUserByEmailResponse;
  }
);
