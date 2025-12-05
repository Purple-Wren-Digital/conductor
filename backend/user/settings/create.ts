import { api, APIError } from "encore.dev/api";
import { userRepository } from "../../ticket/db";
import { getUserContext } from "../../auth/user-context";
import { defaultNotificationPreferences } from "../../utils";

export interface CreateNotificationsRequest {
  id: string;
}

export interface CreateNotificationsResponse {
  created: boolean;
}

export const createNotifications = api<
  CreateNotificationsRequest,
  CreateNotificationsResponse
>(
  {
    expose: true,
    method: "PUT",
    path: "/users/:id/settings",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    if (userContext.role !== "ADMIN") {
      throw APIError.permissionDenied(
        "You do not have permissions to create notifications"
      );
    }

    const existingUser = await userRepository.findByIdWithSettings(req.id);

    if (!existingUser || !existingUser.id) {
      throw APIError.notFound("User not found");
    }

    // Check if user settings and notification preferences already exist
    if (
      existingUser?.userSettings &&
      existingUser?.userSettings?.notificationPreferences &&
      existingUser?.userSettings?.notificationPreferences.length > 0
    ) {
      return { created: true };
    }

    // If no user settings exist, create them with notification preferences
    if (!existingUser?.userSettings || !existingUser?.userSettings?.id) {
      const newSettings = await userRepository.createUserSettings(existingUser.id);
      await userRepository.createNotificationPreferences(
        newSettings.id,
        defaultNotificationPreferences
      );
      return { created: true };
    }

    // If user settings exist but no notification preferences, create them
    await userRepository.createNotificationPreferences(
      existingUser.userSettings.id,
      defaultNotificationPreferences
    );

    return { created: true };
  }
);
