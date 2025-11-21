import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import { secret } from "encore.dev/config";

const ADMIN_SECRET = secret("ADMIN_SECRET");

interface MigrationStatus {
  encoreMigrations: any[];
  prismaMigrations: any[];
  actualTables: any[];
  actualEnums: any[];
}

// Get complete migration status
export const getMigrationStatus = api(
  {
    expose: true,
    method: "GET",
    path: "/admin/migrations/status",
    auth: false,
  },
  async (): Promise<MigrationStatus> => {
    try {
      // Check Encore migrations
      const encoreMigrations = await prisma.$queryRaw`
        SELECT version, dirty, applied_at
        FROM schema_migrations
        ORDER BY version DESC
      ` as any[];

      // Check Prisma migrations
      let prismaMigrations = [];
      try {
        prismaMigrations = await prisma.$queryRaw`
          SELECT id, migration_name, finished_at, rolled_back_at
          FROM _prisma_migrations
          ORDER BY finished_at DESC
        ` as any[];
      } catch (e) {
        // Table might not exist
        console.log("_prisma_migrations table not found");
      }

      // Check actual schema
      const actualTables = await prisma.$queryRaw`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      ` as any[];

      const actualEnums = await prisma.$queryRaw`
        SELECT typname
        FROM pg_type
        WHERE typtype = 'e'
        AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        ORDER BY typname
      ` as any[];

      return {
        encoreMigrations,
        prismaMigrations,
        actualTables,
        actualEnums,
      };
    } catch (error) {
      throw APIError.internal(`Failed to get status: ${error.message}`);
    }
  }
);

// Force sync migrations to current state
export const forceSyncMigrations = api<{ adminSecret: string; dryRun?: boolean }>(
  {
    expose: true,
    method: "POST",
    path: "/admin/migrations/force-sync",
    auth: false,
  },
  async (req) => {
    if (req.adminSecret !== ADMIN_SECRET()) {
      throw APIError.unauthenticated("Invalid admin secret");
    }

    const actions = [];

    try {
      // Step 1: Ensure schema_migrations table exists
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version BIGINT PRIMARY KEY,
          dirty BOOLEAN NOT NULL DEFAULT false,
          applied_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      actions.push("Created/verified schema_migrations table");

      // Step 2: Ensure _prisma_migrations table exists
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS _prisma_migrations (
          id VARCHAR(36) PRIMARY KEY,
          checksum VARCHAR(64) NOT NULL,
          finished_at TIMESTAMPTZ,
          migration_name VARCHAR(255) NOT NULL,
          logs TEXT,
          rolled_back_at TIMESTAMPTZ,
          started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          applied_steps_count INTEGER NOT NULL DEFAULT 0
        )
      `;
      actions.push("Created/verified _prisma_migrations table");

      if (!req.dryRun) {
        // Step 3: Mark our initial migration as applied in both systems
        await prisma.$executeRaw`
          INSERT INTO schema_migrations (version, dirty, applied_at)
          VALUES (20241121000000, false, NOW())
          ON CONFLICT (version) DO UPDATE
          SET dirty = false, applied_at = NOW()
        `;
        actions.push("Synced Encore migration 20241121000000");

        await prisma.$executeRaw`
          INSERT INTO _prisma_migrations (
            id,
            checksum,
            finished_at,
            migration_name,
            logs,
            rolled_back_at,
            started_at,
            applied_steps_count
          ) VALUES (
            'recovery-' || gen_random_uuid(),
            'recovery',
            NOW(),
            '20241121000000_initial',
            'Recovered via force-sync endpoint',
            NULL,
            NOW(),
            1
          )
          ON CONFLICT (id) DO NOTHING
        `;
        actions.push("Synced Prisma migration 20241121000000_initial");
      }

      return {
        success: true,
        dryRun: req.dryRun || false,
        actions,
        message: req.dryRun
          ? "Dry run complete. Set dryRun=false to apply changes."
          : "Migrations synced successfully",
      };
    } catch (error) {
      throw APIError.internal(`Sync failed: ${error.message}`);
    }
  }
);

// Clean up conflicting migrations
export const cleanupMigrations = api<{
  adminSecret: string;
  removeOldMigrations: boolean;
  resetToInitial: boolean;
}>(
  {
    expose: true,
    method: "POST",
    path: "/admin/migrations/cleanup",
    auth: false,
  },
  async (req) => {
    if (req.adminSecret !== ADMIN_SECRET()) {
      throw APIError.unauthenticated("Invalid admin secret");
    }

    const actions = [];

    try {
      if (req.removeOldMigrations) {
        // Remove all old migration records except our initial one
        const deletedEncore = await prisma.$executeRaw`
          DELETE FROM schema_migrations
          WHERE version != 20241121000000
        `;
        actions.push(`Removed ${deletedEncore} old Encore migrations`);

        const deletedPrisma = await prisma.$executeRaw`
          DELETE FROM _prisma_migrations
          WHERE migration_name NOT LIKE '20241121000000%'
        `;
        actions.push(`Removed ${deletedPrisma} old Prisma migrations`);
      }

      if (req.resetToInitial) {
        // Clear all migrations and set only the initial one
        await prisma.$executeRaw`TRUNCATE schema_migrations`;
        await prisma.$executeRaw`TRUNCATE _prisma_migrations`;

        await prisma.$executeRaw`
          INSERT INTO schema_migrations (version, dirty, applied_at)
          VALUES (20241121000000, false, NOW())
        `;

        await prisma.$executeRaw`
          INSERT INTO _prisma_migrations (
            id, checksum, finished_at, migration_name, logs,
            rolled_back_at, started_at, applied_steps_count
          ) VALUES (
            'reset-' || gen_random_uuid(),
            'reset',
            NOW(),
            '20241121000000_initial',
            'Reset to initial migration',
            NULL,
            NOW(),
            1
          )
        `;
        actions.push("Reset both systems to initial migration only");
      }

      return {
        success: true,
        actions,
        message: "Cleanup complete",
      };
    } catch (error) {
      throw APIError.internal(`Cleanup failed: ${error.message}`);
    }
  }
);

// Emergency: Mark all current schema as "already migrated"
export const baselineSchema = api<{ adminSecret: string }>(
  {
    expose: true,
    method: "POST",
    path: "/admin/migrations/baseline",
    auth: false,
  },
  async (req) => {
    if (req.adminSecret !== ADMIN_SECRET()) {
      throw APIError.unauthenticated("Invalid admin secret");
    }

    try {
      // This tells both systems "the current schema IS the initial migration"
      // Use when schema is correct but migration history is broken

      // Clear existing migration history
      await prisma.$executeRaw`TRUNCATE schema_migrations`;
      await prisma.$executeRaw`TRUNCATE _prisma_migrations CASCADE`;

      // Mark initial migration as applied
      await prisma.$executeRaw`
        INSERT INTO schema_migrations (version, dirty, applied_at)
        VALUES (20241121000000, false, NOW())
      `;

      await prisma.$executeRaw`
        INSERT INTO _prisma_migrations (
          id, checksum, finished_at, migration_name,
          started_at, applied_steps_count
        ) VALUES (
          'baseline-' || gen_random_uuid(),
          'baseline',
          NOW(),
          '20241121000000_initial',
          NOW(),
          1
        )
      `;

      return {
        success: true,
        message: "Schema baselined. Current schema marked as initial migration.",
        warning: "Future migrations will apply on top of current schema",
      };
    } catch (error) {
      throw APIError.internal(`Baseline failed: ${error.message}`);
    }
  }
);