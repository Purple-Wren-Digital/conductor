import { api, APIError } from "encore.dev/api";
import { prisma } from "../../ticket/db";
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
    path: "/users/:id/create/settings/notifications-default",
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
      include: { userSettings: true },
    });

    if (!existingUser || !existingUser.id) {
      throw APIError.notFound("User not found");
    }

    const result = await prisma.$transaction(async (p) => {
      // 1. Create userSettings to user (if needed)
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
      const existingPrefs = await p.notificationPreferences.findMany({
        where: { userSettingsId: user.userSettings.id },
        select: { type: true },
      });
      const existingTypes = new Set(existingPrefs.map((p) => p.type));
      const prefsToCreate = defaultNotificationPreferences.filter(
        (pref) => !existingTypes.has(pref.type)
      );

      const userSettingsDefault = await p.userSettings.update({
        where: { id: user.userSettings.id },
        data: {
          notificationPreferences: {
            create: prefsToCreate,
          },
        },
      });

      return { user, userSettingsDefault };
    });

    if (!result || !result?.user || !result?.userSettingsDefault) {
      throw APIError.notFound("User settings not created");
    }

    return { created: true };
  }
);
