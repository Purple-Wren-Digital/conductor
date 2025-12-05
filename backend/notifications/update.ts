import { api, APIError } from "encore.dev/api";
import { notificationRepository } from "../ticket/db";
import { getUserContext } from "../auth/user-context";

export interface UpdateNotificationRequest {
  notificationId: string;
  email?: string;
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
    method: "PATCH",
    path: "/notifications/:notificationId/:email",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    if (
      !userContext?.email &&
      !req?.email &&
      userContext?.email !== req?.email
    ) {
      throw APIError.permissionDenied(
        "You do not have permission to access this user's notifications"
      );
    }

    if (!req.notificationId) {
      throw APIError.invalidArgument("Missing notification information");
    }

    const existingNotification = await notificationRepository.findById(req.notificationId);

    if (!existingNotification) {
      throw APIError.notFound("Notification not found");
    }
    if (existingNotification.userId !== userContext?.userId) {
      throw APIError.permissionDenied(
        "You can only edit your own notifications"
      );
    }

    const updatedNotification = await notificationRepository.markAsRead(existingNotification.id);

    return { success: updatedNotification?.read ?? false };
  }
);
