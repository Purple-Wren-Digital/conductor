import { api, APIError } from "encore.dev/api";
import { prisma } from "../../../ticket/db";
import { getUserContext } from "../../../auth/user-context";
import { defaultNotificationPreferences } from "../../../utils";
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

    const existingUser = await prisma.user.findUnique({
      where: { id: req.id },
      include: {
        userSettings: {
          include: {
            notificationPreferences: true,
          },
        },
      },
    });

    if (!existingUser) {
      throw APIError.notFound("Existing user was not found");
    }

    if (!req.notificationPreferences || !req.notificationPreferences.length) {
      throw APIError.invalidArgument("Notifications Updates are Missing");
    }

    const notificationsUpdate = await prisma.$transaction(
      req.notificationPreferences.map((pref) => {
        if (!pref.id) {
          throw APIError.invalidArgument(
            "Each notification preference must include an id"
          );
        }
        return prisma.notificationPreferences.update({
          where: { id: pref.id },
          data: {
            frequency: pref.frequency,
            email: pref.email,
            push: pref.push,
            inApp: pref.inApp,
            sms: false, // pref.sms
          },
        });
      })
    );

    if (!notificationsUpdate) {
      throw APIError.internal("User settings not updated");
    }

    return { updated: true };
  }
);
