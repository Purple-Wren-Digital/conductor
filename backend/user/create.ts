import { api } from "encore.dev/api";
import { prisma } from "../ticket/db";
import { signUpWithAuth0 } from "../auth/auth";
import type { User, UserRole } from "../ticket/types";

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
    const user = await prisma.user.create({
      data: {
        email: req.email,
        name: req.name,
        role: req.role || "AGENT",
      },
    });

    console.log("New Prisma User", user);

    return {
      user: { ...user, name: user.name ?? "" },
    };
  }
);
