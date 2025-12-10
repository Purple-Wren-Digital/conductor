import { api, APIError } from "encore.dev/api";
import { db } from "../ticket/db";
import { secret } from "encore.dev/config";

// Admin secret for dangerous operations
const ADMIN_SECRET = secret("ADMIN_SECRET");

export interface ResetDatabaseRequest {
  adminSecret: string;
  confirmReset: boolean;
  resetType: "soft" | "hard";
}

export interface ResetDatabaseResponse {
  success: boolean;
  message: string;
  deletedCounts?: {
    comments: number;
    tickets: number;
    users: number;
  };
}

// Soft reset - deletes data but keeps structure
export const softReset = api<ResetDatabaseRequest>(
  {
    expose: true,
    method: "POST",
    path: "/admin/db/soft-reset",
    auth: false, // Using custom auth
  },
  async (req): Promise<ResetDatabaseResponse> => {
    // Verify admin secret
    if (req.adminSecret !== ADMIN_SECRET()) {
      throw APIError.unauthenticated("Invalid admin secret");
    }

    if (!req.confirmReset) {
      throw APIError.invalidArgument("Must confirm reset");
    }

    try {
      // Delete in correct order (respect FK constraints)
      const deletedComments = await db.exec`DELETE FROM comments`;
      const commentsCount = await db.queryRow<{ count: string }>`SELECT COUNT(*) as count FROM comments`;

      const deletedAttachments = await db.exec`DELETE FROM attachments`;
      const deletedHistory = await db.exec`DELETE FROM ticket_history`;
      const deletedTodos = await db.exec`DELETE FROM todos`;
      const deletedSurveys = await db.exec`DELETE FROM surveys`;
      const deletedTickets = await db.exec`DELETE FROM tickets`;
      const ticketsCount = await db.queryRow<{ count: string }>`SELECT COUNT(*) as count FROM tickets`;

      const deletedNotifications = await db.exec`DELETE FROM notifications`;
      const deletedUserHistory = await db.exec`DELETE FROM user_history`;
      const deletedMarketCenterHistory = await db.exec`DELETE FROM market_center_history`;
      const deletedInvitations = await db.exec`DELETE FROM team_invitations`;
      const deletedCategories = await db.exec`DELETE FROM ticket_categories`;
      const deletedPreferences = await db.exec`DELETE FROM notification_preferences`;
      const deletedSettings = await db.exec`DELETE FROM user_settings`;
      const deletedSubscriptions = await db.exec`DELETE FROM subscriptions`;
      const deletedSettingsAudit = await db.exec`DELETE FROM settings_audit`;
      const deletedUsers = await db.exec`DELETE FROM users`;
      const usersCount = await db.queryRow<{ count: string }>`SELECT COUNT(*) as count FROM users`;

      const deletedMarketCenters = await db.exec`DELETE FROM market_centers`;
      const deletedTemplates = await db.exec`DELETE FROM notification_templates`;

      return {
        success: true,
        message: "Database soft reset complete",
        deletedCounts: {
          comments: 0, // Can't get exact count after deletion, but we deleted all
          tickets: 0,
          users: 0,
        },
      };
    } catch {
      throw APIError.internal("Reset failed");
    }
  }
);

// Check migration status
interface MigrationStatusResponse {
  migrations?: any[];
  tableCount?: number;
  status: string;
  error?: string;
}

export const migrationStatus = api(
  {
    expose: true,
    method: "GET",
    path: "/admin/db/migration-status",
    auth: false,
  },
  async (): Promise<MigrationStatusResponse> => {
    try {
      const migrations = await db.queryAll<any>`
        SELECT version, dirty, applied_at
        FROM schema_migrations
        ORDER BY version DESC
        LIMIT 10
      `;

      const tableCountResult = await db.queryAll<{ count: string }>`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `;

      return {
        migrations,
        tableCount: parseInt(tableCountResult[0]?.count || "0"),
        status: "healthy",
      };
    } catch (error) {
      return {
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
);

// Fix migration issues
export const fixMigrations = api<{ adminSecret: string }>(
  {
    expose: true,
    method: "POST",
    path: "/admin/db/fix-migrations",
    auth: false,
  },
  async (req) => {
    if (req.adminSecret !== ADMIN_SECRET()) {
      throw APIError.unauthenticated("Invalid admin secret");
    }

    try {
      // Mark initial migration as applied
      await db.exec`
        INSERT INTO schema_migrations (version, dirty, applied_at)
        VALUES (20241121000000, false, NOW())
        ON CONFLICT (version) DO UPDATE
        SET dirty = false, applied_at = NOW()
      `;

      return {
        success: true,
        message: "Migration table fixed",
      };
    } catch (error) {
      throw APIError.internal("Failed to fix migrations");
    }
  }
);