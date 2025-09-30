import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { User, UserRole } from "../ticket/types";
import { $Enums } from "@prisma/client";
import { getUserContext } from "../auth/user-context";

export interface CreateUserRequest {
  email: string;
  name: string;
  role?: UserRole;
  auth0Id: string;
  marketCenterId?: string;
}

export interface CreateUserResponse {
  user: User;
}

export const create = api<CreateUserRequest, CreateUserResponse>(
  { expose: true, method: "POST", path: "/users", auth: true },
  async (req) => {

    const userContext = await getUserContext();
    if (userContext?.role !== "ADMIN") {
      throw APIError.permissionDenied("Only admin can create users");
    }

    if (!req?.auth0Id) {
      throw APIError.invalidArgument("Missing data");
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: req.email },
    });

    if (existingUser) {
      // TODO: how to check duplicate emails for Auth0 Accounts (extension or custom?)
      return { user: { ...existingUser, name: existingUser.name ?? "" } };
    }

    let newUser: {
      id: string;
      email: string;
      auth0Id: string;
      name: string | null;
      role: $Enums.UserRole;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
      isActive: boolean;
      marketCenterId: string | null;
    } = {} as {
      id: string;
      email: string;
      auth0Id: string;
      name: string | null;
      role: $Enums.UserRole;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
      isActive: boolean;
      marketCenterId: string | null;
    };

    newUser = await prisma.user.create({
      data: {
        email: req.email,
        name: req.name,
        role: req.role || "AGENT",
        isActive: true,
        auth0Id: req.auth0Id,
        marketCenter: req?.marketCenterId
          ? {
              connect: { id: req.marketCenterId }, // relation connect
            }
          : undefined,
      },
    });

    return {
      user: { ...newUser, name: newUser.name ?? "" },
    };
  }
);
