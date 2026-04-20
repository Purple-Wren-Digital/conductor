import { api, APIError } from "encore.dev/api";
import {
  userRepository,
  notificationRepository,
  marketCenterRepository,
} from "../ticket/db";
import { broadcastNotification } from "./stream";
import { sendEmailNotification } from "./channels/email/email";
import type {
  NotificationCategory,
  NotificationChannel,
  NotificationData,
  Notification,
} from "./types";
import { Urgency } from "../ticket/types";
import { MarketCenterNotificationPreferences } from "../settings/types";
import { defaultMarketCenterNotificationPreferences } from "../marketCenters/notification-preferences/utils";
import { notificationsSent, notificationErrors, caughtErrors } from "./metrics";
import log from "encore.dev/log";

export interface CreateNotificationRequest {
  userId: string;
  templateName?: string;
  category: NotificationCategory;
  type: string;
  email:
    | {
        title: string;
        body: string;
      }
    | "Notifications deactivated";
  inApp:
    | {
        title: string;
        body: string;
      }
    | "Notifications deactivated";
  data?: NotificationData;
  priority?: Urgency;
}

export interface CreateNotificationResponse {
  success: boolean;
}

export async function sendNotification(req: CreateNotificationRequest) {
  const user = await userRepository.findByIdWithSettings(req.userId);

  // Also try to find by clerkId if not found
  let foundUser = user;
  if (!foundUser) {
    foundUser = await userRepository.findByIdWithSettings(req.userId);
  }

  if (!foundUser || !foundUser?.id || !foundUser?.clerkId) {
    throw APIError.notFound("User not found");
  }

  if (!foundUser.isActive) {
    throw APIError.canceled("User is inactive");
  }

  let marketCenterNotificationPreferences: MarketCenterNotificationPreferences[] =
    defaultMarketCenterNotificationPreferences;

  if (foundUser?.marketCenterId) {
    const mc = await marketCenterRepository.findById(foundUser.marketCenterId);
    if (mc && mc?.settings && mc?.settings?.notificationPreferences) {
      marketCenterNotificationPreferences = mc.settings.notificationPreferences;
    } else {
      marketCenterNotificationPreferences =
        defaultMarketCenterNotificationPreferences;
    }
  }

  // USER PREFERENCE CHECKING
  const userTypeSettings =
    foundUser.userSettings?.notificationPreferences?.find(
      (preference) => preference.type === req.type
    );

  const marketCenterTypeSettings = marketCenterNotificationPreferences.find(
    (preference) => preference.type === req.type
  );

  let notificationsToCreate: Array<{
    userId: string;
    channel: NotificationChannel;
    category: NotificationCategory;
    type: string;
    title: string;
    body: string;
    data?: NotificationData;
    priority?: Urgency;
  }> = [];

  // Default to true if preferences are not set (opt-out model, not opt-in)
  const inAppEnabled =
    (marketCenterTypeSettings?.inApp ?? true) &&
    (userTypeSettings?.inApp ?? true);

  const emailEnabled =
    (marketCenterTypeSettings?.email ?? true) &&
    (userTypeSettings?.email ?? true);

  if (inAppEnabled && req.inApp !== "Notifications deactivated") {
    notificationsToCreate.push({
      userId: foundUser.id,
      channel: "IN_APP",
      category: req.category,
      type: req.type,
      title: req.inApp.title,
      body: req.inApp.body,
      data: req?.data ?? undefined,
      priority: req?.priority ?? "LOW",
    });
  }
  if (emailEnabled && req.email !== "Notifications deactivated") {
    notificationsToCreate.push({
      userId: foundUser.id,
      channel: "EMAIL",
      category: req.category,
      type: req.type,
      title: req.email.title,
      body: req.email.body,
      data: req?.data ?? undefined,
      priority: req?.priority ?? "LOW",
    });
  }

  if (notificationsToCreate.length === 0) {
    return { success: true };
  }

  const createdNotifications = await notificationRepository.createManyAndReturn(
    notificationsToCreate
  );

  if (!createdNotifications || !createdNotifications.length) {
    throw APIError.internal("Failed to create notification(s)");
  }

  await Promise.all(
    createdNotifications.map(async (notification) => {
      const safeNotification: Notification = {
        ...notification,
        priority: notification?.priority ?? "LOW",
        data: notification.data ?? undefined,
      };

      try {
        switch (safeNotification.channel) {
          case "EMAIL":
            if (foundUser?.email) {
              await sendEmailNotification({
                userEmail: foundUser.email,
                notification: {
                  ...safeNotification,
                  type: safeNotification?.type,
                  priority: safeNotification?.priority ?? undefined,
                  data: safeNotification?.data as NotificationData,
                },
                marketCenterId: foundUser.marketCenterId,
                recipientName: foundUser.name ?? undefined,
              });
              notificationsSent.with({ channel: "EMAIL" }).increment();
            }
            break;

          case "IN_APP":
            await broadcastNotification(foundUser?.clerkId!, safeNotification);
            notificationsSent.with({ channel: "IN_APP" }).increment();
            break;
        }
      } catch (err) {
        notificationErrors.with({ channel: safeNotification.channel ?? "UNKNOWN" }).increment();
        caughtErrors.with({ source: "notification" }).increment();
        log.error("failed to send notification", {
          channel: safeNotification.channel,
          userId: foundUser?.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })
  );
}

export const create = api<CreateNotificationRequest>(
  {
    expose: true,
    method: "POST",
    path: "/notifications/create/:userId",
    auth: true,
  },
  async (req) => {
    await sendNotification(req);
    return { success: true };
  }
);
