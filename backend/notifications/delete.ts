import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
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
      const deleted = await prisma.notification.deleteMany({
        where: {
          id: { in: req.notificationIds },
          userId: req.userId,
        },
      });
      console.log(`🧹 Deleted ${deleted.count} notifications, as requested`);
      deletedCount = deleted.count;
    } else {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      const deleted = await prisma.notification.deleteMany({
        where: {
          read: true,
          userId: userContext.userId,
          createdAt: { lte: tenDaysAgo },
        },
      });

      console.log(
        `🧹 Deleted ${deleted.count} read notifications older than 10 days for user`
      );
      deletedCount = deleted.count;
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
