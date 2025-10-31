import { api, APIError, Query } from "encore.dev/api";
import { prisma } from "../ticket/db";
import { getUserContext } from "../auth/user-context";
import { Notification, NotificationData } from "./types";

export interface ListInAppNotificationsRequest {
  email: string;

  limit?: Query<number>;
  offset?: Query<number>;
}

export interface ListInAppNotificationsResponse {
  notifications: Notification[];
  unReadAmount: number;
}
export const listInApp = api<
  ListInAppNotificationsRequest,
  ListInAppNotificationsResponse
>(
  {
    expose: true,
    method: "GET",
    path: "/notifications/in-app/:email",
    auth: true,
  },
  async (req) => {
    console.log("********* START - List In-App Notifications *********");
    const userContext = await getUserContext();
    // const limit = Math.min(Math.max(Number(req.limit ?? 50), 1), 200);
    // const offset = Math.max(Number(req.offset ?? 0), 0);
    if (
      !userContext?.email &&
      !req?.email &&
      userContext?.email !== req?.email
    ) {
      throw APIError.permissionDenied(
        "You do not have permission to access this user's notifications"
      );
    }

    let where: any = { userId: userContext.userId, channel: "IN_APP" };

    const result = await prisma.$transaction(async (p) => {
      const notificationsRaw = await p.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
      const notifications = notificationsRaw.map((n) => ({
        ...n,
        priority: n?.priority ?? undefined,
        data: n.data as NotificationData,
      }));

      where.read = false;
      const unReadAmount = await p.notification.count({ where });
      return { notifications, unReadAmount };
    });

    console.log(
      "IN APP NOTIFICATIONS",
      result?.unReadAmount,
      result?.notifications
    );

    return {
      notifications: result.notifications,
      unReadAmount: result.unReadAmount ?? 0,
    };
  }
);
