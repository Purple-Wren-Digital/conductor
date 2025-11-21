# Fixing Production Migration Issues

## The Problem
When Prisma and Encore migrations get out of sync in production, you may see:
- "type already exists" errors
- "table already exists" errors
- "migration already applied" errors
- Schema drift between what Prisma expects and what exists

## Migration Systems Involved

1. **Encore Migrations** - Stored in `schema_migrations` table
2. **Prisma Migrations** - Stored in `_prisma_migrations` table
3. **Actual Schema** - What actually exists in the database

## Step-by-Step Fix Guide

### Step 1: Check Current Status

```bash
# Check migration status via API
curl https://your-app.encr.app/admin/migrations/status

# Or directly via database
encore db shell --prod ticket
```

Then run these SQL commands:
```sql
-- Check Encore migrations
SELECT * FROM schema_migrations;

-- Check Prisma migrations
SELECT * FROM _prisma_migrations;

-- Check if tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';
```

### Step 2: Identify the Problem

**Scenario A: Fresh Production (No Data)**
- Use baseline approach

**Scenario B: Existing Production (Has Data)**
- Use force-sync approach

**Scenario C: Broken Migration History**
- Use cleanup approach

### Step 3: Fix Based on Scenario

#### Scenario A: Fresh Production Database

```bash
# Set admin secret first
encore secret set --prod ADMIN_SECRET

# Option 1: Via API endpoint
curl -X POST https://your-app.encr.app/admin/migrations/baseline \
  -H "Content-Type: application/json" \
  -d '{"adminSecret": "your-secret"}'

# Option 2: Via SQL
encore db shell --prod ticket
```

```sql
-- Create migration tables if they don't exist
CREATE TABLE IF NOT EXISTS schema_migrations (
  version BIGINT PRIMARY KEY,
  dirty BOOLEAN NOT NULL DEFAULT false,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS _prisma_migrations (
  id VARCHAR(36) PRIMARY KEY,
  checksum VARCHAR(64) NOT NULL,
  finished_at TIMESTAMPTZ,
  migration_name VARCHAR(255) NOT NULL,
  logs TEXT,
  rolled_back_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_steps_count INTEGER NOT NULL DEFAULT 0
);

-- Mark initial migration as applied
INSERT INTO schema_migrations (version, dirty, applied_at)
VALUES (20241121000000, false, NOW());

INSERT INTO _prisma_migrations (
  id, checksum, finished_at, migration_name,
  started_at, applied_steps_count
) VALUES (
  gen_random_uuid()::text,
  'baseline',
  NOW(),
  '20241121000000_initial',
  NOW(),
  1
);
```

#### Scenario B: Existing Production (Schema exists, migrations broken)

```bash
# First, do a dry run
curl -X POST https://your-app.encr.app/admin/migrations/force-sync \
  -H "Content-Type: application/json" \
  -d '{"adminSecret": "your-secret", "dryRun": true}'

# If looks good, apply it
curl -X POST https://your-app.encr.app/admin/migrations/force-sync \
  -H "Content-Type: application/json" \
  -d '{"adminSecret": "your-secret", "dryRun": false}'
```

#### Scenario C: Clean Up Old/Conflicting Migrations

```bash
# Remove old migrations but keep initial
curl -X POST https://your-app.encr.app/admin/migrations/cleanup \
  -H "Content-Type: application/json" \
  -d '{
    "adminSecret": "your-secret",
    "removeOldMigrations": true,
    "resetToInitial": false
  }'

# Or complete reset to initial only
curl -X POST https://your-app.encr.app/admin/migrations/cleanup \
  -H "Content-Type: application/json" \
  -d '{
    "adminSecret": "your-secret",
    "removeOldMigrations": false,
    "resetToInitial": true
  }'
```

### Step 4: Verify Fix

```bash
# Check status again
curl https://your-app.encr.app/admin/migrations/status

# Test the application
curl https://your-app.encr.app/health
```

## Emergency Manual Fix

If the API endpoints don't work, connect directly:

```bash
encore db shell --prod ticket
```

```sql
-- Nuclear option: Clear everything and start fresh
-- WARNING: Only if schema is already correct!

-- 1. Backup first!
\copy (SELECT * FROM schema_migrations) TO 'schema_migrations_backup.csv' CSV;
\copy (SELECT * FROM _prisma_migrations) TO 'prisma_migrations_backup.csv' CSV;

-- 2. Clear migration history
TRUNCATE schema_migrations;
DELETE FROM _prisma_migrations WHERE true;

-- 3. Mark initial as applied
INSERT INTO schema_migrations (version, dirty)
VALUES (20241121000000, false);

INSERT INTO _prisma_migrations (
  id, checksum, finished_at, migration_name,
  started_at, applied_steps_count
) VALUES (
  'manual-fix-' || gen_random_uuid(),
  'manual',
  NOW(),
  '20241121000000_initial',
  NOW(),
  1
);
```

## Prevention

To avoid this in the future:

1. **Always use the same migration path**:
   - Development: `npm run reset` → `npm run dev`
   - Production: Deploy normally, migrations auto-apply

2. **Don't manually edit migration tables** unless absolutely necessary

3. **Keep both systems in sync**:
   - When Encore applies a migration, Prisma should know about it
   - Our initial migration (20241121000000) handles this

4. **Test migrations in staging first**:
   ```bash
   encore deploy --staging
   ```

## Quick Reference

| Problem | Solution | Endpoint |
|---------|----------|----------|
| Check status | View migration state | GET `/admin/migrations/status` |
| Fresh setup | Mark as baselined | POST `/admin/migrations/baseline` |
| Fix broken history | Force sync | POST `/admin/migrations/force-sync` |
| Remove old migrations | Cleanup | POST `/admin/migrations/cleanup` |

## Important Notes

- **ALWAYS BACKUP** before any migration fixes
- Test in staging environment first if possible
- The initial migration (20241121000000) should always be present
- Future migrations will increment from this number

## After Fixing

Once migrations are fixed:

1. **Deploy your application**:
   ```bash
   encore deploy --prod
   ```

2. **Future migrations work normally**:
   ```bash
   npm run migrate -- --name new_feature
   git add . && git commit
   encore deploy --prod
   ```

The system will now handle migrations correctly going forward.