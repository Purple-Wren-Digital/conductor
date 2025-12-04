/**
 * Settings Audit Log Repository - Raw SQL queries for settings audit log operations
 */

import { db, fromTimestamp, toJson, fromJson, generateId } from "../../ticket/db";
import type { SettingsAuditLogEntry } from "../../settings/types";

// Database row type
interface SettingsAuditLogRow {
  id: string;
  market_center_id: string;
  user_id: string;
  action: string;
  section: string;
  previous_value: any;
  new_value: any;
  created_at: Date;
}

function rowToSettingsAuditLog(row: SettingsAuditLogRow): SettingsAuditLogEntry {
  return {
    id: row.id,
    marketCenterId: row.market_center_id,
    userId: row.user_id,
    action: row.action,
    section: row.section,
    previousValue: fromJson(row.previous_value),
    newValue: fromJson(row.new_value),
    createdAt: fromTimestamp(row.created_at)!,
  };
}

export const settingsAuditRepository = {
  // Find by ID
  async findById(id: string): Promise<SettingsAuditLogEntry | null> {
    const row = await db.queryRow<SettingsAuditLogRow>`
      SELECT * FROM settings_audit_logs WHERE id = ${id}
    `;
    return row ? rowToSettingsAuditLog(row) : null;
  },

  // Find by market center with filters
  async findByMarketCenterId(
    marketCenterId: string,
    options?: {
      section?: string;
      action?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ logs: SettingsAuditLogEntry[]; total: number }> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    // Build WHERE conditions
    let whereConditions = `market_center_id = $1`;
    const params: any[] = [marketCenterId];
    let paramIndex = 2;

    if (options?.section) {
      whereConditions += ` AND section = $${paramIndex++}`;
      params.push(options.section);
    }
    if (options?.action) {
      whereConditions += ` AND action = $${paramIndex++}`;
      params.push(options.action);
    }

    // Get total count
    const countSql = `SELECT COUNT(*)::int as count FROM settings_audit_logs WHERE ${whereConditions}`;
    const countResult = await db.rawQueryRow<{ count: number }>(countSql, ...params);
    const total = countResult?.count ?? 0;

    // Get logs
    params.push(limit, offset);
    const sql = `
      SELECT * FROM settings_audit_logs
      WHERE ${whereConditions}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    const rows = await db.rawQuery<SettingsAuditLogRow>(sql, ...params);
    const logs = [];
    for await (const row of rows) {
      logs.push(rowToSettingsAuditLog(row));
    }

    return { logs, total };
  },

  // Create audit log entry
  async create(data: {
    marketCenterId: string;
    userId: string;
    action: string;
    section: string;
    previousValue?: any;
    newValue?: any;
  }): Promise<SettingsAuditLogEntry> {
    const id = generateId();
    const row = await db.queryRow<SettingsAuditLogRow>`
      INSERT INTO settings_audit_logs (
        id, market_center_id, user_id, action, section,
        previous_value, new_value, created_at
      ) VALUES (
        ${id},
        ${data.marketCenterId},
        ${data.userId},
        ${data.action},
        ${data.section},
        ${toJson(data.previousValue ?? null)}::jsonb,
        ${toJson(data.newValue ?? null)}::jsonb,
        NOW()
      )
      RETURNING *
    `;
    return rowToSettingsAuditLog(row!);
  },

  // Create many audit log entries
  async createMany(data: Array<{
    marketCenterId: string;
    userId: string;
    action: string;
    section: string;
    previousValue?: any;
    newValue?: any;
  }>): Promise<void> {
    if (data.length === 0) return;

    // Build multi-row insert
    const values: any[] = [];
    const valuePlaceholders: string[] = [];
    let paramIndex = 1;

    for (const entry of data) {
      const id = generateId();
      valuePlaceholders.push(
        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}::jsonb, $${paramIndex++}::jsonb, NOW())`
      );
      values.push(
        id,
        entry.marketCenterId,
        entry.userId,
        entry.action,
        entry.section,
        toJson(entry.previousValue ?? null),
        toJson(entry.newValue ?? null)
      );
    }

    const sql = `
      INSERT INTO settings_audit_logs (
        id, market_center_id, user_id, action, section,
        previous_value, new_value, created_at
      ) VALUES ${valuePlaceholders.join(", ")}
    `;

    await db.rawExec(sql, ...values);
  },
};
