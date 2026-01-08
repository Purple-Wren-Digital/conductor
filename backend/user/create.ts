import { api, APIError } from "encore.dev/api";
import { userRepository, marketCenterRepository } from "../ticket/db";
import type { User, UserRole } from "../user/types";
import { getUserContext } from "../auth/user-context";
import { defaultNotificationPreferences } from "../utils";
import { MarketCenter } from "../marketCenters/types";

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

    const existingUser = await userRepository.findByEmail(req.email);

    if (existingUser) {
      // TODO: how to check duplicate emails for Auth0 Accounts (extension or custom?)
      return {
        user: { ...existingUser, name: existingUser.name ?? "" },
        success: false, // indicate user was not created
      };
    }

    let marketCenterAssignment: MarketCenter | null = null;
    if (req?.marketCenterId) {
      const marketCenter = await marketCenterRepository.findByIdWithUsers(
        req.marketCenterId
      );
      if (!marketCenter) {
        APIError.notFound("Market Center not found");
      } else {
        marketCenterAssignment = marketCenter;
      }
    }

    // Create user
    const newUser = await userRepository.create({
      email: req.email,
      name: req.name,
      role: req.role || "AGENT",
      isActive: true,
      clerkId: req.clerkId,
      marketCenterId: req?.marketCenterId ?? null,
    });

    // Create user settings with notification preferences
    const userSettings = await userRepository.createUserSettings(newUser.id);

    // Create notification preferences
    await userRepository.createNotificationPreferences(
      userSettings.id,
      defaultNotificationPreferences
    );

    // Create user history
    await userRepository.createHistory({
      userId: newUser.id,
      marketCenterId: newUser.marketCenterId,
      action: "CREATE",
      field: "user",
      newValue: "Activated",
      changedById: userContext.userId,
      snapshot: newUser,
    });

    return {
      success: true,
    };
  }
);
