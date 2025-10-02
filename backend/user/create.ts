import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { User, UserRole } from "../ticket/types";
import { $Enums } from "@prisma/client";
import { getUserContext } from "../auth/user-context";
import { mapTicketHistorySnapshot } from "../utils";

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

    const result = await prisma.$transaction(async (u) => {
      const newUser = await u.user.create({
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
        include: {
          userHistory: true,
        },
      });

      const history = await u.userHistory.create({
        data: {
          userId: newUser.id,
          field: "Created (isActive)",
          previousValue: "false",
          newValue: "true",
          changedById: userContext.userId,
          snapshot: newUser,
        },
      });

      return { newUser, history };
    });

    return {
      user: {
        ...result.newUser,
        name: result.newUser.name ?? "",
        userHistory: mapTicketHistorySnapshot([result.history]),
      },
    };
  }
);
