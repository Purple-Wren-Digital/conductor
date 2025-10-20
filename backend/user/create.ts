import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { User, UserRole } from "../user/types";
import { getUserContext } from "../auth/user-context";
import {
  defaultNotificationPreferences,
  handleUserCreationNotification,
} from "../utils";
import { MarketCenter } from "../marketCenters/types";

export interface CreateUserRequest {
  email: string;
  name: string;
  role?: UserRole;
  auth0Id: string;
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

    if (!req?.auth0Id) {
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

    const result = await prisma.$transaction(async (p) => {
      const newUser = await p.user.create({
        data: {
          email: req.email,
          name: req.name,
          role: req.role || "AGENT",
          isActive: true,
          auth0Id: req.auth0Id,
          userSettings: {
            create: {},
          },
          marketCenter: req?.marketCenterId
            ? {
                connect: { id: req.marketCenterId }, // relation connect
              }
            : undefined,
        },
        include: {
          userHistory: true,
          userSettings: true,
        },
      });
      // let userSettingsDefault = undefined;
      // if (newUser && newUser?.userSettings && newUser?.userSettings?.id) {
      const userSettingsDefault = await p.userSettings.update({
        where: { id: newUser?.userSettings?.id },
        data: {
          notificationPreferences: {
            create: defaultNotificationPreferences,
          },
        },
        include: {
          notificationPreferences: true,
          user: false,
        },
      });

      //   userSettingsDefault = userSettingsUpdate ?? undefined;
      // }

      const history = await p.userHistory.create({
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

      // 🔔 Generate notifications dynamically
      await handleUserCreationNotification({
        newUser,
        userContext,
        marketCenterAssignment,
      });

      return { newUser, userSettingsDefault, history };
    });

    if (!result || !result?.newUser) {
      throw APIError.internal("New user not created");
    }

    return {
      success: true,
    };
  }
);
