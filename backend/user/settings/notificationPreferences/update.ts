import { api, APIError } from "encore.dev/api";
import { userRepository, db } from "../../../ticket/db";
import { getUserContext } from "../../../auth/user-context";
import { NotificationPreferences } from "../../types";

export interface UpdateNotificationsRequest {
  id: string;
  // userSettingsId: string;
  notificationPreferences: NotificationPreferences[];
}

export interface UpdateNotificationsResponse {
  updated: boolean;
}

export const updateNotificationPreferences = api<
  UpdateNotificationsRequest,
  UpdateNotificationsResponse
>(
  {
    expose: true,
    method: "PATCH",
    path: "/users/:id/update/settings/notifications",
    auth: false,
  },
  async (req) => {
    const userContext = await getUserContext();

    if (userContext?.userId && req?.id && userContext?.userId !== req.id) {
      throw APIError.permissionDenied(
        "Insufficient permissions to update other users' notifications"
      );
    }

    const existingUser = await userRepository.findByIdWithSettings(req.id);

    if (!existingUser) {
      throw APIError.notFound("Existing user was not found");
    }

    if (!req.notificationPreferences || !req.notificationPreferences.length) {
      throw APIError.invalidArgument("Notifications Updates are Missing");
    }

    // Update notification preferences in a transaction
    await using tx = await db.begin();

    try {
      for (const pref of req.notificationPreferences) {
        if (!pref.id) {
          throw APIError.invalidArgument(
            "Each notification preference must include an id"
          );
        }

        await tx.exec`
          UPDATE notification_preferences
          SET
            frequency = ${pref.frequency},
            email = ${pref.email},
            push = ${pref.push},
            in_app = ${pref.inApp},
            sms = false
          WHERE id = ${pref.id}
        `;
      }
    } catch (error) {
      throw APIError.internal("User settings not updated");
    }

    return { updated: true };
  }
);
