import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { prisma } from "../ticket/db";
import type { User, UserRole } from "../ticket/types";
// import { signUpWithAuth0 } from "../auth/auth";

export interface CreateUserRequest {
  email: string;
  name: string;
  role?: UserRole;
}

export interface CreateUserResponse {
  user: User;
}

export const create = api<CreateUserRequest, CreateUserResponse>(
  { expose: true, method: "POST", path: "/users", auth: false },
  async (req) => {
    const authData = await getAuthData();
    if (!authData || !authData.userID) {
      throw APIError.unauthenticated("User not authenticated");
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: req.email },
    });

    if (existingUser) {
      // TODO: how to check duplicate emails for Auth0 Accounts (extension or custom?)
      return { user: { ...existingUser, name: existingUser.name ?? "" } };
    }

    const newUser = await prisma.user.create({
      data: {
        email: req.email,
        name: req.name,
        role: req.role || "AGENT",
        isActive: true,
        auth0Id: authData.userID,
      },
    });

    return {
      user: { ...newUser, name: newUser.name ?? "" },
    };
  }
);
