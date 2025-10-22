import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { Notification, NotificationData } from "./types";
import { getUserContext } from "../auth/user-context";

export interface UpdateNotificationRequest {
  userId: string;
  notificationId: string;
}

export interface UpdateNotificationResponse {
  notification: Notification;
}

export const update = api<
  UpdateNotificationRequest,
  UpdateNotificationResponse
>(
  {
    expose: true,
    method: "PUT",
    path: "/notifications/:notificationId/:userId",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    const userId = userContext?.userId;

    const existingNotification = await prisma.notification.findFirst({
      where: {
        id: req.notificationId,
        userId: req.userId,
      },
    });

    if (!existingNotification) {
      throw APIError.notFound("Notification not found");
    }

    if (existingNotification.userId !== userId) {
      throw APIError.permissionDenied(
        "You can only edit your own notifications"
      );
    }

    const updatedNotificationRaw = await prisma.notification.update({
      where: { id: existingNotification.id },
      data: { read: true },
    });

    const updatedNotification = {
      ...updatedNotificationRaw,
      priority: updatedNotificationRaw?.priority ?? undefined,
      data: updatedNotificationRaw.data as NotificationData,
    };

    return { notification: updatedNotification };
  }
);
