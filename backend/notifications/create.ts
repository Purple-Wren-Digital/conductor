import { api, APIError } from "encore.dev/api";
import { Prisma } from "@prisma/client";
import { prisma } from "../ticket/db";
import { broadcastNotification } from "./stream";
import { sendEmailNotification } from "./channels/email/email";
import type { NotificationCategory, NotificationData } from "./types";
import { getUserContext } from "../auth/user-context";
import { Urgency } from "../ticket/types";

export interface CreateNotificationRequest {
  userId: string;
  category: NotificationCategory;
  type: string; // NotificationTypes;
  title: string;
  body: string;
  data?: NotificationData;
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
    // const notificationPreference =
    //   user.userSettings?.notificationPreferences &&
    //   user?.userSettings?.notificationPreferences.find((pref) => {
    //     pref.type.toLocaleUpperCase() === req.type.toLocaleUpperCase();
    //   });

    // let notificationsToCreate: any = [];

    // if (notificationPreference && notificationPreference?.inApp) {
    // notificationsToCreate.push({
    //   userId: user.id,
    //   channel: "IN_APP",
    //   category: req.category,
    //   type: req.type,
    //   title: req.title,
    //   body: req.body,
    //   data: req.data,
    //   priority: req?.priority ?? "MEDIUM",
    // });
    // }

    // if (notificationPreference && notificationPreference?.email) {
    // notificationsToCreate.push({
    //   userId: user.id,
    //   channel: "EMAIL",
    //   category: req.category,
    //   type: req.type,
    //   title: req.title,
    //   body: req.body,
    //   data: req.data,
    //   priority: req?.priority ?? "MEDIUM",
    // });
    // }
    // if (notificationPreference && notificationPreference?.push) {
    //   notificationsToCreate.push({
    //     userId: user.id,
    //     channel: "PUSH",
    //     category: req.category,
    //     type: req.type,
    //     title: req.title,
    //     body: req.body,
    //     data: req.data,
    //     priority: req?.priority ?? "MEDIUM",
    //   });
    // }

    // if (!notificationsToCreate || !notificationsToCreate.length) {
    //   throw APIError.permissionDenied(
    //     `All Notifications for "${req.type}" are disabled for this user`
    //   );
    // }

    // const created = await Promise.all(
    //   notificationsToCreate.map((notification: any) =>
    //     prisma.notification.create({ data: notification })
    //   )
    // );
    const createdNotifications = await prisma.notification.createManyAndReturn({
      data: [
        {
          userId: user.id,
          channel: "EMAIL",
          category: req.category,
          type: req.type,
          title: req.title,
          body: req.body,
          data: req?.data as Prisma.InputJsonValue,
          priority: req?.priority ?? "LOW",
        },
        {
          userId: user.id,
          channel: "IN_APP",
          category: req.category,
          type: req.type,
          title: req.title,
          body: req.body,
          data: req?.data as Prisma.InputJsonValue,
          priority: req?.priority ?? "LOW",
        },
      ],
    });

    console.log("Created Notifications for user", createdNotifications);

    if (!createdNotifications || !createdNotifications.length) {
      throw APIError.internal("Failed to create notification(s)");
    }
    await Promise.all(
      createdNotifications.map(async (notification) => {
        switch (notification.channel) {
          case "EMAIL":
            if (user?.email) {
              await sendEmailNotification({
                userEmail: "delivered@resend.dev", //TODO-PROD user.email
                notification: {
                  ...notification,
                  type: notification?.type,
                  priority: notification.priority ?? undefined,
                  data: notification?.data as NotificationData,
                },
              });
            }
            break;

          case "IN_APP":
            await broadcastNotification(user?.clerkId, notification);
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
