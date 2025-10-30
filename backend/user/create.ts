import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { User, UserRole } from "../user/types";
import { getUserContext } from "../auth/user-context";
import { defaultNotificationPreferences } from "../utils";
import { MarketCenter } from "../marketCenters/types";
import { $Enums } from "@prisma/client";

export interface CreateUserRequest {
  email: string;
  name: string;
  role?: UserRole;
  clerkId: string;
  marketCenterId?: string;
}

export interface CreateUserResponse {
  user?: User;
  success: boolean;
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
      // TODO: how to check duplicate emails for Auth0 Accounts (extension or custom?)
      return {
        user: { ...existingUser, name: existingUser.name ?? "" },
        success: false, // indicate user was not created
      };
    }

    let marketCenterAssignment: MarketCenter | null = null;
    if (req?.marketCenterId) {
      const marketCenter = await prisma.marketCenter.findUnique({
        where: { id: req.marketCenterId },
        include: { users: true },
      });
      if (!marketCenter) {
        APIError.notFound("Market Center not found");
      } else {
        marketCenterAssignment = marketCenter;
      }
    }

    let newUser: {
      id: string;
      email: string;
      clerkId: string;
      // auth0Id: string;
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

    const result = await prisma.$transaction(async (p) => {
      const newUser = await p.user.create({
        data: {
          email: req.email,
          name: req.name,
          role: req.role || "AGENT",
          isActive: true,
          clerkId: req.clerkId,
          userSettings: {
            create: {
              notificationPreferences: {
                create: defaultNotificationPreferences,
              },
            },
          },
          marketCenter: req?.marketCenterId
            ? {
                connect: { id: req.marketCenterId },
              }
            : undefined,
        },
        include: {
          userHistory: true,
          userSettings: true,
        },
      });

      const history = await p.userHistory.create({
        data: {
          userId: newUser.id,
          marketCenterId: newUser?.marketCenterId,
          action: "CREATE",
          field: "New User",
          previousValue: "",
          newValue: "Activated",
          changedById: userContext.userId,
          snapshot: newUser,
        },
      });

      return { newUser, history };
    });

    if (!result || !result?.newUser) {
      throw APIError.internal("New user not created");
    }

    return {
      success: true,
    };
  }
);
