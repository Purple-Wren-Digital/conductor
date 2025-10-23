import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { Notification, NotificationData } from "./types";
import { getUserContext } from "../auth/user-context";

export interface UpdateNotificationRequest {
  userId: string;
  notificationId: string;
}

export interface UpdateNotificationResponse {
  success: boolean;
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

    if (!req.userId || !req.notificationId) {
      throw APIError.invalidArgument("Missing notification information");
    }

    console.log("MARK AS READ PARAMS", "Notification ID:", req.notificationId);

    const existingNotification = await prisma.notification.findUnique({
      where: { id: req.notificationId },
    });

    if (!existingNotification) {
      throw APIError.notFound("Notification not found");
    }
    if (existingNotification.userId !== userContext?.userId) {
      throw APIError.permissionDenied(
        "You can only edit your own notifications"
      );
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: existingNotification.id },
      data: { read: true },
    });

    return { success: updatedNotification?.read };
  }
);
