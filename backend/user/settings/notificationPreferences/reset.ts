import { api, APIError } from "encore.dev/api";
import { userRepository, db } from "../../../ticket/db";
import { getUserContext } from "../../../auth/user-context";
import { defaultNotificationPreferences } from "../../../utils";

export interface ResetNotificationsRequest {
  id: string;
}

export interface ResetNotificationsResponse {
  reset: boolean;
}

export const resetNotificationPreferences = api<
  ResetNotificationsRequest,
  ResetNotificationsResponse
>(
  {
    expose: true,
    method: "PATCH",
    path: "/users/:id/settings/notificationPreferences/reset",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    const isEditingSelf = userContext?.userId === req.id;

    if (!isEditingSelf) {
      throw APIError.permissionDenied(
        "Insufficient permissions to update other users' notifications"
      );
    }

    const existingUser = await userRepository.findByIdWithSettings(req.id);

    if (!existingUser) {
      throw APIError.notFound("User not found");
    }

    // If no user settings or notification preferences, create them
    if (
      !existingUser?.userSettings ||
      !existingUser?.userSettings?.id ||
      !existingUser?.userSettings?.notificationPreferences ||
      !existingUser?.userSettings?.notificationPreferences.length
    ) {
      const newSettings = await userRepository.createUserSettings(existingUser.id);
      await userRepository.createNotificationPreferences(
        newSettings.id,
        defaultNotificationPreferences
      );
      return { reset: true };
    }

    // Delete existing notification preferences and create new ones
    await using tx = await db.begin();

    try {
      // Delete all existing notification preferences
      await tx.exec`
        DELETE FROM notification_preferences
        WHERE user_settings_id = ${existingUser.userSettings.id}
      `;

      // Create new default notification preferences
      for (const pref of defaultNotificationPreferences) {
        await tx.exec`
          INSERT INTO notification_preferences (
            id, user_settings_id, type, category, frequency, email, push, in_app, sms
          ) VALUES (
            gen_random_uuid()::text,
            ${existingUser.userSettings.id},
            ${pref.type},
            ${pref.category},
            ${pref.frequency},
            ${pref.email},
            ${pref.push},
            ${pref.inApp},
            ${pref.sms}
          )
        `;
      }
    } catch (error) {
      throw APIError.aborted("Failed to reset notification preferences");
    }

    return { reset: true };
  }
);
