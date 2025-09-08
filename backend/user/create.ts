import { api, APIError } from "encore.dev/api";
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
      },
    });

    console.log("New Prisma User", newUser);

    return {
      user: { ...newUser, name: newUser.name ?? "" },
    };
  }
);
