import { api } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { User, UserRole } from "../ticket/types";

export interface CreateUserRequest {
  email: string;
  name: string;
  role?: UserRole;
}

export interface CreateUserResponse {
  user: User;
}

// Creates a new user.
export const create = api<CreateUserRequest, CreateUserResponse>(
  { expose: true, method: "POST", path: "/users" },
  async (req) => {
    const user = await prisma.user.create({
      data: {
        email: req.email,
        name: req.name,
        role: req.role || "AGENT",
      },
    });

    return { user };
  }
);
