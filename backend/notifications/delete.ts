import { api, APIError } from "encore.dev/api";
import { db } from "../ticket/db";
import { getUserContext } from "../auth/user-context";

export interface DeleteNotificationsRequest {
  userId: string;
  notificationIds?: string[];
}

export interface DeleteNotificationsResponse {
  deletedCount: number;
  message: string;
}
export const deleteNotifications = api<
  DeleteNotificationsRequest,
  DeleteNotificationsResponse
>(
  {
    expose: true,
    method: "DELETE",
    path: "/notifications/:userId",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    if (!req?.userId && userContext?.userId !== req?.userId) {
      throw APIError.permissionDenied(
        "You do not have permission to access this user's notifications"
      );
    }
    let deletedCount: number = 0;
    if (req?.notificationIds && req?.notificationIds.length > 0) {
      const result = await db.queryRow<{ count: number }>`
        WITH deleted AS (
          DELETE FROM notifications
          WHERE id = ANY(${req.notificationIds})
            AND user_id = ${req.userId}
          RETURNING id
        )
        SELECT COUNT(*)::int as count FROM deleted
      `;
      deletedCount = result?.count ?? 0;
    } else {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      const result = await db.queryRow<{ count: number }>`
        WITH deleted AS (
          DELETE FROM notifications
          WHERE read = true
            AND user_id = ${userContext.userId}
            AND created_at <= ${tenDaysAgo}
          RETURNING id
        )
        SELECT COUNT(*)::int as count FROM deleted
      `;
      deletedCount = result?.count ?? 0;
    }

    return {
      deletedCount: deletedCount,
      message:
        deletedCount > 0
          ? `${deletedCount} notifications deleted`
          : "No unread notifications deleted",
    };
  }
);
