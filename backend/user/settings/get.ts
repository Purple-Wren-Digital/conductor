import { api, APIError } from "encore.dev/api";
import { prisma } from "../../ticket/db";
import type { UserSettings } from "../../user/types";
import { getUserContext } from "../../auth/user-context";

export interface GetUserSettingsRequest {
  id: string; // user id
}

export interface GetUserSettingsResponse {
  settings: UserSettings;
}

export const getUserSettings = api<
  GetUserSettingsRequest,
  GetUserSettingsResponse
>(
  {
    expose: true,
    method: "GET",
    path: "/users/:id/settings",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    if (!userContext?.userId || !req?.id || userContext?.userId !== req?.id) {
      throw APIError.permissionDenied(
        "You do not have permission to access this user's settings"
      );
    }

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: req.id },
      include: {
        notificationPreferences: true,
      },
    });

    if (!userSettings) {
      throw APIError.notFound("Could not find user settings");
    }
    const formattedSettings: UserSettings = {
      id: userSettings.id,
      userId: userSettings.userId,
      createdAt: userSettings.createdAt,
      updatedAt: userSettings.updatedAt,
      notificationPreferences:
        userSettings?.notificationPreferences &&
        userSettings?.notificationPreferences.length > 0
          ? userSettings.notificationPreferences.map((pref) => ({
              id: pref.id,
              type: pref.type,
              category: pref.category,
              frequency: pref.frequency,
              email: pref.email,
              inApp: pref.inApp,
              push: pref.push,
              sms: pref.sms,
              userSettingsId: pref.userSettingsId,
            }))
          : undefined,
    };

    return { settings: formattedSettings };
  }
);
