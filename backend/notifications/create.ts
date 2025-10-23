import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import { sendEmailNotification } from "./channels/email";
import { sendPushNotification } from "./channels/push";
import { broadcastNotification } from "./channels/websocket";
import type { NotificationCategory, NotificationChannel } from "./types";
import { getUserContext } from "../auth/user-context";
// Payload
export interface CreateNotificationRequest {
  userId: string;
  channel: NotificationChannel;
  category: NotificationCategory;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}
export const create = api<CreateNotificationRequest>(
  {
    expose: true,
    method: "POST",
    path: "/notifications/create/:userId",
    auth: true,
  },
  async (req) => {
    await getUserContext();

    const user = await prisma.user.findUnique({
      where: {
        id: req.userId,
        isActive: true,
      },
      include: {
        userSettings: { include: { notificationPreferences: true } },
      },
    });

    if (!user || !user.id) {
      throw APIError.notFound("User not found");
    }
    const notificationPreference =
      user.userSettings?.notificationPreferences &&
      user?.userSettings?.notificationPreferences.find((pref) => {
        pref.type.toLocaleUpperCase() === req.type.toLocaleUpperCase();
      });

    let channelAllowed: boolean = true;

    if (
      req.channel === "IN_APP" &&
      (!notificationPreference || !notificationPreference?.inApp)
    ) {
      channelAllowed = false;
    }

    if (
      req.channel === "EMAIL" &&
      (!notificationPreference || !notificationPreference?.email)
    ) {
      channelAllowed = false;
    }

    if (
      req.channel === "PUSH" &&
      (!notificationPreference || !notificationPreference?.push)
    ) {
      channelAllowed = false;
    }

    if (!channelAllowed) {
      throw APIError.permissionDenied(
        `${req.channel} Notifications for ${req.type} are disabled for this user`
      );
    }

    const notification = await prisma.notification.create({
      data: {
        userId: req.userId,
        channel: req.channel,
        category: req.category,
        type: req.type,
        title: req.title,
        body: req.body,
        data: req.data,
      },
    });

    if (!notification) {
      throw APIError.internal("Failed to create notification");
    }

    switch (notification.channel) {
      // case "EMAIL":
      //   if (user?.email) {
      //     await sendEmailNotification({
      //       to: ["delivered@resend.dev"], // [user.id]
      //       subject: notification.title,
      //       html: `<p>${notification.body}</p>`, // TODO: Resend templates on backend
      //     });
      //   }
      //   break;

      case "IN_APP":
        await broadcastNotification(notification.userId, notification);
        break;

      // case "PUSH":
      //   // TODO: Firebase Web Push Notifications
      //   await sendPushNotification({
      //     token: req.userId, // user?.userSettings?.browserPushToken
      //     userId: req.userId,
      //     title: req.title,
      //     body: req.body,
      //   });
      //   break;
    }

    return notification;
  }
);
