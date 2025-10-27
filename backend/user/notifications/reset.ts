import { api, APIError } from "encore.dev/api";
import { prisma } from "../../ticket/db";
import { getUserContext } from "../../auth/user-context";
import { defaultNotificationPreferences } from "../../utils";
import { NotificationPreferences } from "../types";

export interface ResetNotificationsRequest {
  id: string;
}

export interface resetNotificationsResponse {
  reset: boolean;
}

export const resetNotifications = api<
  ResetNotificationsRequest,
  resetNotificationsResponse
>(
  {
    expose: true,
    method: "PATCH",
    path: "/users/:id/settings/reset/notifications-default",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    // Permission checks
    const isEditingSelf = userContext?.userId === req.id;
    // const canModifyUsers = await canManageTeam(userContext);

    if (!isEditingSelf) {
      throw APIError.permissionDenied(
        "Insufficient permissions to update other users' notifications"
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: req.id },
      include: { userSettings: true },
    });

    if (!existingUser || !existingUser.id) {
      throw APIError.notFound("User not found");
    }

    console.log("Existing User", existingUser);

    const result = await prisma.$transaction(async (p) => {
      let user = existingUser;
      if (!existingUser || !existingUser?.userSettings) {
        const updatedUser = await p.user.update({
          where: { id: req.id },
          data: {
            userSettings: {
              create: {},
            },
          },
          include: { userSettings: true },
        });
        user = updatedUser;
      }
      if (!user || !user?.userSettings || !user?.userSettings?.id) {
        throw APIError.unimplemented("User settings not created");
      }
      const userSettingsDefault = await p.userSettings.update({
        where: { id: user.userSettings.id },
        data: {
          notificationPreferences: {
            create: defaultNotificationPreferences,
          },
        },
      });

      return { user, userSettingsDefault };
    });

    if (!result || !result?.user || !result?.userSettingsDefault) {
      throw APIError.notFound("User settings not created");
    }

    return { reset: true };
  }
);
