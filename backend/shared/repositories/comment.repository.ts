/**
 * Comment Repository - Raw SQL queries for comment operations
 */

import { db, fromTimestamp, toJson } from "../../ticket/db";
import type { Comment } from "../../ticket/types";
import type { User, UserRole } from "../../user/types";

// Database row types
interface CommentRow {
  id: string;
  content: string;
  ticket_id: string;
  user_id: string;
  internal: boolean;
  source: string;
  metadata: any;
  created_at: Date;
  updated_at: Date;
}

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  market_center_id: string | null;
  clerk_id: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    marketCenterId: row.market_center_id,
    clerkId: row.clerk_id,
    isActive: row.is_active,
    createdAt: fromTimestamp(row.created_at)!,
    updatedAt: fromTimestamp(row.updated_at)!,
  };
}

function rowToComment(row: CommentRow): Comment {
  return {
    id: row.id,
    content: row.content,
    ticketId: row.ticket_id,
    userId: row.user_id,
    internal: row.internal,
    source: row.source,
    metadata: row.metadata,
    createdAt: fromTimestamp(row.created_at)!,
    updatedAt: fromTimestamp(row.updated_at) ?? fromTimestamp(row.created_at)!,
  };
}

export const commentRepository = {
  // Find comment by ID
  async findById(id: string): Promise<Comment | null> {
    const row = await db.queryRow<CommentRow>`
      SELECT * FROM comments WHERE id = ${id}
    `;
    return row ? rowToComment(row) : null;
  },

  // Find comment by ID with user
  async findByIdWithUser(
    id: string
  ): Promise<(Comment & { user?: User }) | null> {
    const row = await db.queryRow<CommentRow>`
      SELECT * FROM comments WHERE id = ${id}
    `;

    if (!row) return null;

    const comment = rowToComment(row);

    const userRow = await db.queryRow<UserRow>`
      SELECT * FROM users WHERE id = ${row.user_id}
    `;

    if (userRow) {
      comment.user = rowToUser(userRow);
    }

    return comment;
  },

  // Find comments by ticket ID
  async findByTicketId(
    ticketId: string,
    options?: {
      includeInternal?: boolean;
      orderBy?: "asc" | "desc";
    }
  ): Promise<Comment[]> {
    const includeInternal = options?.includeInternal ?? true;
    const orderBy = options?.orderBy?.toUpperCase() === "DESC" ? "DESC" : "ASC";

    let sql: string;
    const values: any[] = [ticketId];

    if (includeInternal) {
      sql = `
        SELECT * FROM comments
        WHERE ticket_id = $1
        ORDER BY created_at ${orderBy}
      `;
    } else {
      sql = `
        SELECT * FROM comments
        WHERE ticket_id = $1 AND internal = false
        ORDER BY created_at ${orderBy}
      `;
    }

    const rows = await db.rawQueryAll<CommentRow>(sql, ...values);
    return rows.map(rowToComment);
  },

  // Find comments by ticket ID with users
  async findByTicketIdWithUsers(
    ticketId: string,
    options?: {
      includeInternal?: boolean;
      orderBy?: "asc" | "desc";
    }
  ): Promise<(Comment & { user?: User })[]> {
    const includeInternal = options?.includeInternal ?? true;
    const orderBy = options?.orderBy?.toUpperCase() === "DESC" ? "DESC" : "ASC";

    let sql: string;
    const values: any[] = [ticketId];

    const baseQuery = `
      SELECT
        c.*,
        u.email as user_email, u.name as user_name, u.role as user_role,
        u.market_center_id as user_market_center_id, u.clerk_id as user_clerk_id,
        u.is_active as user_is_active, u.created_at as user_created_at, u.updated_at as user_updated_at
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.ticket_id = $1
    `;

    if (includeInternal) {
      sql = `${baseQuery} ORDER BY c.created_at ${orderBy}`;
    } else {
      sql = `${baseQuery} AND c.internal = false ORDER BY c.created_at ${orderBy}`;
    }

    const rows = await db.rawQueryAll<
      CommentRow & {
        user_email: string | null;
        user_name: string | null;
        user_role: UserRole | null;
        user_market_center_id: string | null;
        user_clerk_id: string | null;
        user_is_active: boolean | null;
        user_created_at: Date | null;
        user_updated_at: Date | null;
      }
    >(sql, ...values);

    return rows.map((row) => {
      const comment = rowToComment(row);
      if (row.user_email) {
        comment.user = rowToUser({
          id: row.user_id,
          email: row.user_email,
          name: row.user_name,
          role: row.user_role!,
          market_center_id: row.user_market_center_id,
          clerk_id: row.user_clerk_id!,
          is_active: row.user_is_active!,
          created_at: row.user_created_at!,
          updated_at: row.user_updated_at!,
        });
      }
      return comment;
    });
  },

  // Create a new comment
  async create(data: {
    content: string;
    ticketId: string;
    userId: string;
    internal?: boolean;
    source?: "WEB" | "EMAIL" | "API";
    metadata?: Record<string, any>;
  }): Promise<Comment> {
    const row = await db.queryRow<CommentRow>`
      INSERT INTO comments (
        content, ticket_id, user_id, internal, source, metadata, created_at, updated_at
      ) VALUES (
        ${data.content},
        ${data.ticketId},
        ${data.userId},
        ${data.internal ?? false},
        ${data.source ?? "WEB"},
        ${toJson(data.metadata ?? { source: data.source ?? "WEB" })}::jsonb,
        NOW(),
        NOW()
      )
      RETURNING *
    `;
    return rowToComment(row!);
  },

  // Create comment and return with user
  async createWithUser(data: {
    content: string;
    ticketId: string;
    userId: string;
    internal?: boolean;
    source?: "WEB" | "EMAIL" | "API";
    metadata?: Record<string, any>;
  }): Promise<Comment & { user: User }> {
    const comment = await this.create(data);

    const userRow = await db.queryRow<UserRow>`
      SELECT * FROM users WHERE id = ${data.userId}
    `;

    return {
      ...comment,
      user: rowToUser(userRow!),
    };
  },

  // Update comment
  async update(
    id: string,
    data: Partial<{
      content: string;
      internal: boolean;
    }>
  ): Promise<Comment | null> {
    const updates: string[] = ["updated_at = NOW()"];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(data.content);
    }
    if (data.internal !== undefined) {
      updates.push(`internal = $${paramIndex++}`);
      values.push(data.internal);
    }

    values.push(id);

    const sql = `
      UPDATE comments
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const row = await db.rawQueryRow<CommentRow>(sql, ...values);
    return row ? rowToComment(row) : null;
  },

  // Delete comment
  async delete(id: string): Promise<boolean> {
    await db.exec`DELETE FROM comments WHERE id = ${id}`;
    return true;
  },

  // Count comments for ticket
  async countByTicketId(
    ticketId: string,
    options?: { internal?: boolean }
  ): Promise<number> {
    let sql =
      "SELECT COUNT(*)::int as count FROM comments WHERE ticket_id = $1";
    const values: any[] = [ticketId];

    if (options?.internal !== undefined) {
      sql += " AND internal = $2";
      values.push(options.internal);
    }

    const result = await db.rawQueryRow<{ count: number }>(sql, ...values);
    return result?.count ?? 0;
  },

  // Check if user has commented on ticket
  async userHasCommented(ticketId: string, userId: string): Promise<boolean> {
    const result = await db.queryRow<{ exists: boolean }>`
      SELECT EXISTS(SELECT 1 FROM comments WHERE ticket_id = ${ticketId} AND user_id = ${userId}) as exists
    `;
    return result?.exists ?? false;
  },
};
