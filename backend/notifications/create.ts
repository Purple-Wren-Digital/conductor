import { api, APIError } from "encore.dev/api";
import { Prisma } from "@prisma/client";
import { prisma } from "../ticket/db";
import { broadcastNotification } from "./stream";
import { sendEmailNotification } from "./channels/email/email";
import type {
  NotificationCategory,
  NotificationChannel,
  NotificationData,
  Notification,
} from "./types";
import { Urgency } from "../ticket/types";
export interface CreateNotificationRequest {
  userId: string;
  category: NotificationCategory;
  type: string;
  templateName?: string;
  title: string;
  body: string;
  data: NotificationData;
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
    console.log("****** START: Create/Send Notifications ******", req);

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ clerkId: req.userId }, { id: req.userId }],
        isActive: true,
      },
      include: {
        userSettings: { include: { notificationPreferences: true } },
      },
    });

    if (!user || !user?.id || !user?.clerkId) {
      throw APIError.notFound("User not found");
    }
    // USER PREFERENCE CHECKING
    const notificationTypeSettings =
      user.userSettings?.notificationPreferences?.find(
        (preference) => preference.type === req.type
      );

    let notificationsToCreate: any[] = [];

    if (notificationTypeSettings && notificationTypeSettings.inApp === true) {
      notificationsToCreate.push({
        userId: user.id,
        channel: "IN_APP" as NotificationChannel,
        category: req.category,
        type: req.type,
        title: req.title,
        body: req.body,
        data: req?.data ? (req?.data as Prisma.InputJsonValue) : undefined,
        priority: req?.priority ? (req.priority as Urgency) : "LOW",
        deliveredAt: null,
      });
    }
    if (notificationTypeSettings && notificationTypeSettings.email === true) {
      notificationsToCreate.push({
        userId: user.id,
        channel: "EMAIL" as NotificationChannel,
        category: req.category,
        type: req.type,
        title: req.title,
        body: req.body,
        data: req?.data ? (req?.data as Prisma.InputJsonValue) : undefined,
        priority: req?.priority ? (req.priority as Urgency) : "LOW",
        deliveredAt: null,
      });
    }

    if (notificationsToCreate.length === 0) {
      console.log(
        `User ${user.id} has opted out of all channels for notification type ${req.type}. Skipping notification creation.`
      );
      return { success: true };
    }

    const createdNotifications = await prisma.notification.createManyAndReturn({
      data: notificationsToCreate,
    });

    if (!createdNotifications || !createdNotifications.length) {
      throw APIError.internal("Failed to create notification(s)");
    }
    await Promise.all(
      createdNotifications.map(async (notification) => {
        const safeNotification: Notification = {
          ...notification,
          priority: notification?.priority ?? "LOW",
          data:
            typeof notification.data === "object" && notification.data !== null
              ? (notification.data as NotificationData)
              : undefined,
        };

        switch (safeNotification.channel) {
          case "EMAIL":
            if (user?.email) {
              await sendEmailNotification({
                userEmail: "delivered@resend.dev", //TODO-PROD user.email
                notification: {
                  ...safeNotification,
                  type: safeNotification?.type,
                  priority: safeNotification?.priority ?? undefined,
                  data: safeNotification?.data as NotificationData,
                },
              });
            }
            break;

          case "IN_APP":
            await broadcastNotification(user?.clerkId, safeNotification);
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
      })
    );
    console.log("****** END: Create/Send Notifications ******");

    return { success: true };
  }
);
