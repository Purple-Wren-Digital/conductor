/**
 * Notification Repository - Raw SQL queries for notification operations
 */

import { db, fromTimestamp, toJson, fromJson } from "../../ticket/db";
import type { Notification, NotificationCategory, NotificationChannel, NotificationData } from "../../notifications/types";
import type { Urgency } from "../../ticket/types";

// Database row types
interface NotificationRow {
  id: string;
  user_id: string;
  channel: NotificationChannel;
  category: NotificationCategory;
  priority: Urgency | null;
  type: string;
  title: string;
  body: string;
  data: any;
  read: boolean;
  delivered_at: Date | null;
  created_at: Date;
}

function rowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    channel: row.channel,
    category: row.category,
    priority: row.priority ?? undefined,
    type: row.type,
    title: row.title,
    body: row.body,
    data: fromJson<NotificationData>(row.data) ?? undefined,
    read: row.read,
    deliveredAt: fromTimestamp(row.delivered_at),
    createdAt: fromTimestamp(row.created_at)!,
  };
}

export const notificationRepository = {
  // Find notification by ID
  async findById(id: string): Promise<Notification | null> {
    const row = await db.queryRow<NotificationRow>`
      SELECT * FROM notifications WHERE id = ${id}
    `;
    return row ? rowToNotification(row) : null;
  },

  // Find notifications by user ID
  async findByUserId(userId: string, options?: {
    unreadOnly?: boolean;
    channel?: NotificationChannel;
    category?: NotificationCategory;
    limit?: number;
    offset?: number;
  }): Promise<Notification[]> {
    let sql = 'SELECT * FROM notifications WHERE user_id = $1';
    const values: any[] = [userId];
    let paramIndex = 2;

    if (options?.unreadOnly) {
      sql += ` AND read = false`;
    }

    if (options?.channel) {
      sql += ` AND channel = $${paramIndex++}`;
      values.push(options.channel);
    }

    if (options?.category) {
      sql += ` AND category = $${paramIndex++}`;
      values.push(options.category);
    }

    sql += ' ORDER BY created_at DESC';

    if (options?.limit) {
      sql += ` LIMIT ${Math.min(options.limit, 100)}`;
    }

    if (options?.offset) {
      sql += ` OFFSET ${Math.max(options.offset, 0)}`;
    }

    const rows = await db.rawQueryAll<NotificationRow>(sql, ...values);
    return rows.map(rowToNotification);
  },

  // Create a single notification
  async create(data: {
    userId: string;
    channel: NotificationChannel;
    category: NotificationCategory;
    type: string;
    title: string;
    body: string;
    data?: NotificationData;
    priority?: Urgency;
  }): Promise<Notification> {
    const row = await db.queryRow<NotificationRow>`
      INSERT INTO notifications (
        id, user_id, channel, category, type, title, body, data, priority, read, delivered_at, created_at
      ) VALUES (
        gen_random_uuid()::text,
        ${data.userId},
        ${data.channel},
        ${data.category},
        ${data.type},
        ${data.title},
        ${data.body},
        ${data.data ? toJson(data.data) : null}::jsonb,
        ${data.priority ?? null},
        false,
        null,
        NOW()
      )
      RETURNING *
    `;
    return rowToNotification(row!);
  },

  // Create many notifications
  async createMany(notifications: Array<{
    userId: string;
    channel: NotificationChannel;
    category: NotificationCategory;
    type: string;
    title: string;
    body: string;
    data?: NotificationData;
    priority?: Urgency;
  }>): Promise<Notification[]> {
    const results: Notification[] = [];

    for (const notification of notifications) {
      const created = await this.create(notification);
      results.push(created);
    }

    return results;
  },

  // Create many and return (like Prisma's createManyAndReturn)
  async createManyAndReturn(notifications: Array<{
    userId: string;
    channel: NotificationChannel;
    category: NotificationCategory;
    type: string;
    title: string;
    body: string;
    data?: any;
    priority?: Urgency;
  }>): Promise<Notification[]> {
    return this.createMany(notifications);
  },

  // Mark notification as read
  async markAsRead(id: string): Promise<Notification | null> {
    const row = await db.queryRow<NotificationRow>`
      UPDATE notifications
      SET read = true, delivered_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return row ? rowToNotification(row) : null;
  },

  // Mark all user notifications as read
  async markAllAsRead(userId: string): Promise<number> {
    const result = await db.queryRow<{ count: number }>`
      WITH updated AS (
        UPDATE notifications
        SET read = true, delivered_at = NOW()
        WHERE user_id = ${userId} AND read = false
        RETURNING id
      )
      SELECT COUNT(*)::int as count FROM updated
    `;
    return result?.count ?? 0;
  },

  // Delete notification
  async delete(id: string): Promise<boolean> {
    await db.exec`DELETE FROM notifications WHERE id = ${id}`;
    return true;
  },

  // Count unread notifications
  async countUnread(userId: string, channel?: NotificationChannel): Promise<number> {
    let sql = 'SELECT COUNT(*)::int as count FROM notifications WHERE user_id = $1 AND read = false';
    const values: any[] = [userId];

    if (channel) {
      sql += ' AND channel = $2';
      values.push(channel);
    }

    const result = await db.rawQueryRow<{ count: number }>(sql, ...values);
    return result?.count ?? 0;
  },
};
