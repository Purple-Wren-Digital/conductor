import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
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
      throw APIError.badRequest("Must confirm reset");
    }

    console.log("⚠️  SOFT RESET initiated by admin");

    try {
      // Delete in correct order (respect FK constraints)
      const deletedComments = await prisma.comment.deleteMany({});
      const deletedAttachments = await prisma.attachment.deleteMany({});
      const deletedHistory = await prisma.ticketHistory.deleteMany({});
      const deletedTickets = await prisma.ticket.deleteMany({});
      const deletedNotifications = await prisma.notification.deleteMany({});
      const deletedUserHistory = await prisma.userHistory.deleteMany({});
      const deletedMarketCenterHistory = await prisma.marketCenterHistory.deleteMany({});
      const deletedInvitations = await prisma.teamInvitation.deleteMany({});
      const deletedCategories = await prisma.ticketCategory.deleteMany({});
      const deletedPreferences = await prisma.notificationPreferences.deleteMany({});
      const deletedSettings = await prisma.userSettings.deleteMany({});
      const deletedUsers = await prisma.user.deleteMany({});
      const deletedMarketCenters = await prisma.marketCenter.deleteMany({});
      const deletedTemplates = await prisma.notificationTemplate.deleteMany({});

      return {
        success: true,
        message: "Database soft reset complete",
        deletedCounts: {
          comments: deletedComments.count,
          tickets: deletedTickets.count,
          users: deletedUsers.count,
        },
      };
    } catch (error) {
      console.error("Soft reset failed:", error);
      throw APIError.internal("Reset failed");
    }
  }
);

// Check migration status
export const migrationStatus = api(
  {
    expose: true,
    method: "GET",
    path: "/admin/db/migration-status",
    auth: false,
  },
  async (): Promise<any> => {
    try {
      const migrations = await prisma.$queryRaw`
        SELECT version, dirty, applied_at
        FROM schema_migrations
        ORDER BY version DESC
        LIMIT 10
      `;

      const tableCount = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `;

      return {
        migrations,
        tableCount: tableCount[0]?.count || 0,
        status: "healthy",
      };
    } catch (error) {
      return {
        status: "error",
        error: error.message,
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
      await prisma.$executeRaw`
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