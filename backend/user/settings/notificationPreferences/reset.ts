import { api, APIError } from "encore.dev/api";
import { prisma } from "../../../ticket/db";
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

    const existingUser = await prisma.user.findUnique({
      where: { id: req.id },
      include: { userSettings: { include: { notificationPreferences: true } } },
    });

    if (!existingUser) {
      throw APIError.notFound("User not found");
    }

    if (
      !existingUser?.userSettings ||
      !existingUser?.userSettings?.id ||
      !existingUser?.userSettings?.notificationPreferences ||
      !existingUser?.userSettings?.notificationPreferences.length
    ) {
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          userSettings: {
            create: {
              notificationPreferences: {
                create: defaultNotificationPreferences,
              },
            },
          },
        },
        include: {
          userSettings: {
            include: {
              notificationPreferences: true,
            },
          },
        },
      });
      return { reset: true };
    }

    // Reset existing Notification Preferences if they exist
    const updatedPreferences = await Promise.all(
      existingUser.userSettings.notificationPreferences.map((pref) =>
        prisma.notificationPreferences.update({
          where: { id: pref.id },
          data: { email: true, inApp: true, push: true, sms: false },
        })
      )
    );
    // Fetch the user (or userSettings) with includes so you can inspect final state
    // const updatedUser = await prisma.user.findUnique({
    //   where: { id: existingUser.id },
    //   include: {
    //     userSettings: { include: { notificationPreferences: true } },
    //   },
    // });

    return { reset: true };
  }
);
