import { api, APIError, Query } from "encore.dev/api";
import { prisma } from "../../ticket/db";
import type { UserSettings, NotificationPreferences } from "../../user/types";
import { getUserContext } from "../../auth/user-context";
export interface GetUserSettingsRequest {
  id: string;
  userId: string;
}

export interface GetUserSettingsResponse {
  userSettings: UserSettings[];
}

export const getUserHistory = api<GetUserSettingsRequest>(
  //   GetUserSettingsResponse
  {
    expose: true,
    method: "GET",
    path: "/settings/users/:userId/:id",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    if (userContext?.userId !== req.userId)
      throw APIError.permissionDenied(
        "Must logged in to your account to update your settings"
      );

    const settings = await prisma.userHistory.findUnique({
      where: { id: req.id },
    });
    console.log("USER SETTINGS FOUND", settings);
  }
);
