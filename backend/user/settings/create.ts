import { api, APIError } from "encore.dev/api";
import { prisma } from "../../../ticket/db";
import { getUserContext } from "../../../auth/user-context";
import { defaultNotificationPreferences } from "../../../utils";

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

    const existingUser = await prisma.user.findUnique({
      where: { id: req.id },
      include: { userSettings: { include: { notificationPreferences: true } } },
    });

    if (!existingUser || !existingUser.id) {
      throw APIError.notFound("User not found");
    }

    if (
      existingUser?.userSettings &&
      existingUser?.userSettings?.notificationPreferences &&
      existingUser?.userSettings?.notificationPreferences.length > 0
    ) {
      return { created: true };
    }

    if (!existingUser?.userSettings || !existingUser?.userSettings?.id) {
      await prisma.user.update({
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
      return { created: true };
    }
    // if no notificationPreferences, create them
    await prisma.userSettings.update({
      where: { id: existingUser?.userSettings?.id },
      data: {
        notificationPreferences: {
          create: defaultNotificationPreferences,
        },
      },
    });

    return { created: true };
  }
);
