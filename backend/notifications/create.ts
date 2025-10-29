import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import { broadcastNotification } from "./channels/websocket";
import { sendEmailNotification } from "./channels/email/email";
import type {
  NotificationCategory,
  NotificationChannel,
  NotificationData,
  NotificationTrigger,
} from "./types";
import { getUserContext } from "../auth/user-context";
import { Urgency } from "../ticket/types";

export interface CreateNotificationRequest {
  userId: string;
  trigger: NotificationTrigger;
  channel: NotificationChannel; // channels: NotificationChannel[]
  category: NotificationCategory;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: Urgency;
}

export interface CreateNotificationResponse {
  success: boolean;
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

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ clerkId: req.userId }, { id: req.userId }],
        isActive: true,
      },
      include: {
        userSettings: { include: { notificationPreferences: true } },
      },
    });

    if (!user || !user?.id) {
      throw APIError.notFound("User not found");
    }
    // const notificationPreference =
    //   user.userSettings?.notificationPreferences &&
    //   user?.userSettings?.notificationPreferences.find((pref) => {
    //     pref.type.toLocaleUpperCase() === req.type.toLocaleUpperCase();
    //   });

    // let channelAllowed: boolean = true;

    // if (
    //   req.channel === "IN_APP" && req.category !== "ACCOUNT" &&
    //   (!notificationPreference || !notificationPreference?.inApp)
    // ) {
    //   channelAllowed = false;
    // }

    // if (
    //   req.channel === "EMAIL" && req.category !== "ACCOUNT" &&
    //   (!notificationPreference || !notificationPreference?.email)
    // ) {
    //   channelAllowed = false;
    // }

    // if (
    //   req.channel === "PUSH" && req.category !== "ACCOUNT" &&
    //   (!notificationPreference || !notificationPreference?.push)
    // ) {
    //   channelAllowed = false;
    // }

    // if (!channelAllowed) {
    //   console.log(
    //     `${req.channel} Notifications for ${req.type} are disabled for this user`
    //   );
    //   return;
    // throw APIError.permissionDenied(
    //   `${req.channel} Notifications for ${req.type} are disabled for this user`
    // );
    // }

    // console.log(`${req.channel} Allowed?`, channelAllowed);

    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        channel: req.channel,
        category: req.category,
        type: req.type,
        title: req.title,
        body: req.body,
        data: req.data,
        priority: req?.priority ?? "MEDIUM",
      },
    });

    if (!notification || !notification?.channel) {
      throw APIError.internal("Failed to create notification(s)");
    }

    switch (notification.channel) {
      case "EMAIL":
        if (user?.email) {
          await sendEmailNotification({
            userEmail: "delivered@resend.dev", //TODO-PROD user.email
            notification: {
              ...notification,
              priority: notification.priority ?? undefined,
              data: notification?.data as NotificationData,
            },
          });
        } else {
          throw APIError.notFound("User email not found");
        }
        break;

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
