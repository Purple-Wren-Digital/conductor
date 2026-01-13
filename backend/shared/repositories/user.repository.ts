/**
 * User Repository - Raw SQL queries for user operations
 */

import {
  db,
  fromTimestamp,
  toTimestamp,
  fromJson,
  toJson,
} from "../../ticket/db";
import type {
  User,
  UserRole,
  UserSettings,
  NotificationPreferences,
  UserHistory,
} from "../../user/types";

// Database row types (snake_case from PostgreSQL)
interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  is_active: boolean;
  market_center_id: string | null;
  clerk_id: string;
}

interface UserSettingsRow {
  id: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

interface NotificationPreferencesRow {
  id: string;
  user_settings_id: string;
  type: string;
  category: string;
  frequency: string;
  email: boolean;
  push: boolean;
  in_app: boolean;
  sms: boolean;
}

// Transform database row to User type
function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: fromTimestamp(row.created_at)!,
    updatedAt: fromTimestamp(row.updated_at)!,
    isActive: row.is_active,
    marketCenterId: row.market_center_id,
    clerkId: row.clerk_id,
  };
}

export const userRepository = {
  // Find user by ID
  async findById(id: string): Promise<User | null> {
    const row = await db.queryRow<UserRow>`
      SELECT * FROM users WHERE id = ${id}
    `;
    return row ? rowToUser(row) : null;
  },

  // Find user by Clerk ID
  async findByClerkId(clerkId: string): Promise<User | null> {
    const row = await db.queryRow<UserRow>`
      SELECT * FROM users WHERE clerk_id = ${clerkId} AND is_active = true
    `;
    return row ? rowToUser(row) : null;
  },

  // Find user by email
  async findByEmail(email: string): Promise<User | null> {
    const row = await db.queryRow<UserRow>`
      SELECT * FROM users WHERE email = ${email}
    `;
    return row ? rowToUser(row) : null;
  },

  async findExistingEmails(emails: string[]): Promise<string[]> {
    if (emails.length === 0) return [];

    const rows = await db.queryAll<{ email: string }>`
      SELECT email
      FROM users
      WHERE email = ANY(${emails})
    `;

    return rows ? rows.map((r) => r.email) : [];
  },

  // Find user by ID or Clerk ID
  async findByIdOrClerkId(idOrClerkId: string): Promise<User | null> {
    const row = await db.queryRow<UserRow>`
      SELECT * FROM users WHERE id = ${idOrClerkId} OR clerk_id = ${idOrClerkId}
    `;
    return row ? rowToUser(row) : null;
  },

  // Find user with settings
  async findByIdWithSettings(
    id: string
  ): Promise<(User & { userSettings?: UserSettings }) | null> {
    const userRow = await db.queryRow<UserRow>`
      SELECT * FROM users WHERE id = ${id}
    `;

    if (!userRow) return null;

    const user = rowToUser(userRow);

    const settingsRow = await db.queryRow<UserSettingsRow>`
      SELECT * FROM user_settings WHERE user_id = ${id}
    `;

    if (settingsRow) {
      const prefsRows = await db.queryAll<NotificationPreferencesRow>`
        SELECT * FROM notification_preferences WHERE user_settings_id = ${settingsRow.id}
      `;

      user.userSettings = {
        id: settingsRow.id,
        userId: settingsRow.user_id,
        createdAt: fromTimestamp(settingsRow.created_at)!,
        updatedAt: fromTimestamp(settingsRow.updated_at)!,
        notificationPreferences: prefsRows.map((p) => ({
          id: p.id,
          userSettingsId: p.user_settings_id,
          type: p.type,
          category: p.category as any,
          frequency: p.frequency as any,
          email: p.email,
          push: p.push,
          inApp: p.in_app,
          sms: p.sms,
        })),
      };
    }

    return user;
  },

  // Find users by role
  async findByRole(
    role: UserRole,
    options?: { activeOnly?: boolean }
  ): Promise<User[]> {
    const activeOnly = options?.activeOnly ?? true;

    if (activeOnly) {
      const rows = await db.queryAll<UserRow>`
        SELECT * FROM users
        WHERE role = ${role} AND is_active = true
        ORDER BY name ASC
      `;
      return rows.map(rowToUser);
    } else {
      const rows = await db.queryAll<UserRow>`
        SELECT * FROM users
        WHERE role = ${role}
        ORDER BY name ASC
      `;
      return rows.map(rowToUser);
    }
  },

  // Find users by market center
  async findByMarketCenterId(marketCenterId: string): Promise<User[]> {
    const rows = await db.queryAll<UserRow>`
      SELECT * FROM users
      WHERE market_center_id = ${marketCenterId} AND is_active = true
      ORDER BY name ASC
    `;
    return rows.map(rowToUser);
  },

  // Find users by market center and role
  async findByMarketCenterIdAndRole(
    marketCenterId: string,
    role: UserRole,
    options?: { activeOnly?: boolean; excludeUserId?: string }
  ): Promise<User[]> {
    const activeOnly = options?.activeOnly ?? true;

    if (activeOnly) {
      const rows = await db.queryAll<UserRow>`
        SELECT * FROM users
        WHERE market_center_id = ${marketCenterId}
          AND role = ${role}
          AND is_active = true
        ORDER BY name ASC
      `;
      return rows.map(rowToUser);
    } else {
      const rows = await db.queryAll<UserRow>`
        SELECT * FROM users
        WHERE market_center_id = ${marketCenterId}
          AND role = ${role}
        ORDER BY name ASC
      `;
      return rows.map(rowToUser);
    }
  },

  // Find user by ID with their market center
  async findByIdWithMarketCenter(
    id: string
  ): Promise<(User & { marketCenter?: any }) | null> {
    const userRow = await db.queryRow<UserRow>`
      SELECT * FROM users WHERE id = ${id}
    `;

    if (!userRow) return null;

    const user: User & { marketCenter?: any } = rowToUser(userRow);

    if (userRow.market_center_id) {
      const mcRow = await db.queryRow<{
        id: string;
        name: string;
        settings: any;
        created_at: Date;
        updated_at: Date;
      }>`
        SELECT * FROM market_centers WHERE id = ${userRow.market_center_id}
      `;

      if (mcRow) {
        user.marketCenter = {
          id: mcRow.id,
          name: mcRow.name,
          settings: mcRow.settings,
          createdAt: fromTimestamp(mcRow.created_at)!,
          updatedAt: fromTimestamp(mcRow.updated_at)!,
        };
      }
    }

    return user;
  },

  // Create a new user
  async create(data: {
    email: string;
    name?: string | null;
    role?: UserRole;
    clerkId: string;
    marketCenterId?: string | null;
    isActive?: boolean;
  }): Promise<User> {
    const row = await db.queryRow<UserRow>`
      INSERT INTO users (email, name, role, clerk_id, market_center_id, is_active, created_at, updated_at)
      VALUES (
        ${data.email},
        ${data.name ?? null},
        ${data.role ?? "AGENT"},
        ${data.clerkId},
        ${data.marketCenterId ?? null},
        ${data.isActive ?? true},
        NOW(),
        NOW()
      )
      RETURNING *
    `;
    return rowToUser(row!);
  },

  // Update user
  async update(
    id: string,
    data: Partial<{
      email: string;
      name: string | null;
      role: UserRole;
      clerkId: string;
      marketCenterId: string | null;
      isActive: boolean;
    }>
  ): Promise<User | null> {
    // Build dynamic update query
    const updates: string[] = ["updated_at = NOW()"];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }
    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(data.role);
    }
    if (data.clerkId !== undefined) {
      updates.push(`clerk_id = $${paramIndex++}`);
      values.push(data.clerkId);
    }
    if (data.marketCenterId !== undefined) {
      updates.push(`market_center_id = $${paramIndex++}`);
      values.push(data.marketCenterId);
    }
    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(data.isActive);
    }

    values.push(id);

    const sql = `
      UPDATE users
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const row = await db.rawQueryRow<UserRow>(sql, ...values);
    return row ? rowToUser(row) : null;
  },

  // Count users
  async count(where?: {
    marketCenterId?: string;
    isActive?: boolean;
  }): Promise<number> {
    let sql = "SELECT COUNT(*)::int as count FROM users WHERE 1=1";
    const values: any[] = [];
    let paramIndex = 1;

    if (where?.marketCenterId) {
      sql += ` AND market_center_id = $${paramIndex++}`;
      values.push(where.marketCenterId);
    }
    if (where?.isActive !== undefined) {
      sql += ` AND is_active = $${paramIndex++}`;
      values.push(where.isActive);
    }

    const result = await db.rawQueryRow<{ count: number }>(sql, ...values);
    return result?.count ?? 0;
  },

  // Search users with filtering and pagination
  async search(params: {
    query?: string;
    role?: UserRole[];
    marketCenterIds?: string[];
    isActive?: boolean;
    sortBy?: "updatedAt" | "createdAt" | "name" | "role";
    sortDir?: "asc" | "desc";
    limit?: number;
    offset?: number;
  }): Promise<{ users: User[]; total: number }> {
    const conditions: string[] = ["1=1"];
    const values: any[] = [];
    let paramIndex = 1;

    if (params.query) {
      conditions.push(
        `(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`
      );
      values.push(`%${params.query}%`);
      paramIndex++;
    }

    if (params.role && params.role.length > 0) {
      const placeholders = params.role
        .map((_, i) => `$${paramIndex + i}`)
        .join(", ");
      conditions.push(`role IN (${placeholders})`);
      values.push(...params.role);
      paramIndex += params.role.length;
    }

    if (params?.marketCenterIds && params?.marketCenterIds.length > 0) {
      const includesUnassigned =
        params?.marketCenterIds &&
        params?.marketCenterIds.includes("Unassigned");

      if (includesUnassigned) {
        const moreMarketCenterIds = params?.marketCenterIds.filter(
          (id) => id !== "Unassigned"
        );

        if (moreMarketCenterIds && moreMarketCenterIds.length > 0) {
          conditions.push(`market_center_id IS NULL`);
          const placeholders = moreMarketCenterIds
            .map((_, i) => `$${paramIndex + i}`)
            .join(", ");
          conditions.push(
            `(market_center_id IS NULL OR market_center_id IN (${placeholders}))`
          );
          values.push(...moreMarketCenterIds);
          paramIndex += moreMarketCenterIds.length;
        }

        if (!moreMarketCenterIds || !moreMarketCenterIds.length) {
          conditions.push(`market_center_id IS NULL`);
        }
      }

      if (!includesUnassigned) {
        const placeholders = params.marketCenterIds
          .map((_, i) => `$${paramIndex + i}`)
          .join(", ");
        conditions.push(`market_center_id IN (${placeholders})`);
        values.push(...params.marketCenterIds);
        paramIndex += params.marketCenterIds.length;
      }
    }

    if (params.isActive !== undefined) {
      conditions.push(`is_active = $${paramIndex++}`);
      values.push(params.isActive);
    }

    const whereClause = conditions.join(" AND ");

    // Column mapping for sort
    const columnMap: Record<string, string> = {
      updatedAt: "updated_at",
      createdAt: "created_at",
      name: "name",
      role: "role",
    };
    const sortColumn = columnMap[params.sortBy ?? "updatedAt"] ?? "updated_at";
    const sortDir = params.sortDir?.toUpperCase() === "ASC" ? "ASC" : "DESC";
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
    const offset = Math.max(params.offset ?? 0, 0);

    // Get total count
    const countSql = `SELECT COUNT(*)::int as count FROM users WHERE ${whereClause}`;
    const countResult = await db.rawQueryRow<{ count: number }>(
      countSql,
      ...values
    );
    const total = countResult?.count ?? 0;

    // Get users
    const sql = `
      SELECT * FROM users
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${sortDir}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const rows = await db.rawQueryAll<UserRow>(sql, ...values);

    return {
      users: rows.map(rowToUser),
      total,
    };
  },

  // Create user settings
  async createUserSettings(userId: string): Promise<UserSettings> {
    const row = await db.queryRow<UserSettingsRow>`
      INSERT INTO user_settings (user_id, created_at, updated_at)
      VALUES (${userId}, NOW(), NOW())
      RETURNING *
    `;

    return {
      id: row!.id,
      userId: row!.user_id,
      createdAt: fromTimestamp(row!.created_at)!,
      updatedAt: fromTimestamp(row!.updated_at)!,
    };
  },

  // Create notification preferences
  async createNotificationPreferences(
    userSettingsId: string,
    preferences: Array<{
      type: string;
      category: string;
      frequency: string;
      email?: boolean;
      push?: boolean;
      inApp?: boolean;
      sms?: boolean;
    }>
  ): Promise<void> {
    for (const pref of preferences) {
      await db.exec`
        INSERT INTO notification_preferences (
          id, user_settings_id, type, category, frequency, email, push, in_app, sms
        ) VALUES (
          gen_random_uuid()::text,
          ${userSettingsId},
          ${pref.type},
          ${pref.category},
          ${pref.frequency},
          ${pref.email ?? true},
          ${pref.push ?? false},
          ${pref.inApp ?? true},
          ${pref.sms ?? false}
        )
      `;
    }
  },

  // Create user history record
  async createHistory(data: {
    userId: string;
    marketCenterId?: string | null;
    action: string;
    field?: string | null;
    previousValue?: string | null;
    newValue?: string | null;
    snapshot?: any;
    changedById?: string | null;
  }): Promise<void> {
    await db.exec`
      INSERT INTO user_history (
        id, user_id, market_center_id, action, field, previous_value, new_value, snapshot, changed_by_id, changed_at
      ) VALUES (
        gen_random_uuid()::text,
        ${data.userId},
        ${data.marketCenterId ?? null},
        ${data.action},
        ${data.field ?? null},
        ${data.previousValue ?? null},
        ${data.newValue ?? null},
        ${data.snapshot ? toJson(data.snapshot) : null}::jsonb,
        ${data.changedById ?? null},
        NOW()
      )
    `;
  },
};
