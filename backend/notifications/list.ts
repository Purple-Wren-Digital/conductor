import { api, APIError, Query } from "encore.dev/api";
import { db } from "../ticket/db";
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

    const notificationsRaw = await db.queryAll<{
      id: string;
      user_id: string;
      type: string;
      title: string;
      body: string;
      data: any;
      read: boolean;
      channel: string;
      category: string;
      priority: string | null;
      delivered_at: Date | null;
      created_at: Date;
    }>`
      SELECT id, user_id, type, title, body, data, read, channel, category, priority, delivered_at, created_at
      FROM notifications
      WHERE user_id = ${userContext.userId}
        AND channel = 'IN_APP'
      ORDER BY created_at DESC
    `;

    const notifications: Notification[] = notificationsRaw.map((n) => ({
      id: n.id,
      userId: n.user_id,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data as NotificationData,
      read: n.read,
      channel: n.channel as Notification["channel"],
      category: n.category as Notification["category"],
      priority: n?.priority as Notification["priority"],
      deliveredAt: n.delivered_at,
      createdAt: n.created_at,
    }));

    const unReadResult = await db.queryRow<{ count: number }>`
      SELECT COUNT(*)::int as count
      FROM notifications
      WHERE user_id = ${userContext.userId}
        AND channel = 'IN_APP'
        AND read = false
    `;
    const unReadAmount = unReadResult?.count ?? 0;

    return {
      notifications,
      unReadAmount,
    };
  }
);
