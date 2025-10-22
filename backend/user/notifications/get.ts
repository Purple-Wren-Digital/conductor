import { api, APIError } from "encore.dev/api";
import { prisma } from "../../ticket/db";
import type { NotificationPreferences } from "../../user/types";
import { getUserContext } from "../../auth/user-context";

export interface GetUserRequest {
  id: string; // user id
  userSettingsId: string;
}

export interface GetUserResponse {
  notificationPreferences: NotificationPreferences[];
}

export const getUserNotificationPreferences = api<GetUserRequest>(
  {
    expose: true,
    method: "GET",
    path: "/users/:id/settings/notifications/:userSettingsId",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    if (!userContext?.userId || !req?.id || userContext?.userId !== req?.id) {
      throw APIError.permissionDenied(
        "You do not have permission to access these notification settings"
      );
    }

    const userSettings = await prisma.userSettings.findUnique({
      where: { id: req.userSettingsId },
      include: {
        notificationPreferences: true,
      },
    });

    if (!userSettings || !userSettings?.notificationPreferences) {
      throw APIError.notFound("Could not find notification preferences");
    }

    return { notificationPreferences: userSettings };
  }
);
