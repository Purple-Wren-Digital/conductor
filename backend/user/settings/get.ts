import { api, APIError } from "encore.dev/api";
import { userRepository } from "../../ticket/db";
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

    const user = await userRepository.findByIdWithSettings(req.id);

    if (!user || !user.userSettings) {
      throw APIError.notFound("Could not find user settings");
    }

    const formattedSettings: UserSettings = {
      id: user.userSettings.id,
      userId: user.userSettings.userId,
      createdAt: user.userSettings.createdAt,
      updatedAt: user.userSettings.updatedAt,
      notificationPreferences:
        user.userSettings?.notificationPreferences &&
        user.userSettings?.notificationPreferences.length > 0
          ? user.userSettings.notificationPreferences.map((pref) => ({
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
