import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { User, UserRole } from "../ticket/types";
import { $Enums } from "@prisma/client";
import { getUserContext } from "../auth/user-context";
import { mapHistorySnapshot } from "../utils";

export interface CreateUserRequest {
  email: string;
  name: string;
  role?: UserRole;
  clerkId: string;
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

    if (!req?.clerkId) {
      throw APIError.invalidArgument("Missing data");
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: req.email },
    });

    if (existingUser) {
      // TODO: how to check duplicate emails for Clerk Accounts (extension or custom?)
      return { user: { ...existingUser, name: existingUser.name ?? "" } };
    }

    let newUser: {
      id: string;
      email: string;
      clerkId: string;
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
      clerkId: string;
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
          clerkId: req.clerkId,
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
          marketCenterId: newUser?.marketCenterId,
          action: "CREATE",
          field: "isActive",
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
        userHistory: mapHistorySnapshot([result.history]),
      },
    };
  }
);
