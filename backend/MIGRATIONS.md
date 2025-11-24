# Database Migration Guide

## Overview
This project uses Prisma ORM with Encore's database management. We've configured a clean migration structure that works seamlessly with database resets.

## Development Workflow

### Quick Reset (Recommended)
```bash
# Use the npm script that handles everything
npm run reset

# This automatically:
# 1. Resets all Encore databases
# 2. Syncs Prisma migration history
# 3. Generates Prisma client
```

### Creating New Migrations
```bash
# 1. Make changes to schema.prisma
# 2. Create and apply migration
npm run migrate -- --name your_migration_name

# 3. The migration is automatically applied and tracked
```

### Starting Development
```bash
# After reset, start the backend
npm run dev

# Seed the database
curl -X POST http://localhost:4000/seed
```

## Production Deployment

### First Deployment After Migration Restructure
If your production database has the old migrations:

```bash
# 1. Set your production database URL
export PRODUCTION_DATABASE_URL="your-production-db-url"

# 2. Run the preparation script
./prepare-production.sh

# 3. Choose option 1 if production already has all the schema
#    Choose option 2 if production needs the new schema
```

### Future Production Deployments
After the initial setup, migrations work normally:

```bash
# Deploy with Encore (migrations run automatically)
encore deploy production
```

## Migration Structure

### Initial Migration
- `migrations/20241121000000_initial/migration.sql` - Contains the complete initial schema
- This migration includes all tables, enums, indexes, and foreign keys

### Future Migrations
Future migrations will be created normally with `prisma migrate dev` and will:
- Apply cleanly on development after `encore db reset --all`
- Deploy automatically to production with Encore

## Troubleshooting

### Error: "type already exists"
This shouldn't happen anymore, but if it does:
1. Run `encore db reset --all`
2. Check that `.env` has correct `SHADOW_DATABASE_URL`

### Error: "column does not exist"
1. Run `npx prisma db push` to sync schema
2. If persists, check schema.prisma matches migration files

### Foreign Key Errors in Seed
The seed file respects deletion order. If you modify it:
1. Delete dependent records first (comments, attachments, etc.)
2. Delete parent records last (users, market_centers)

## Key Files
- `schema.prisma` - Database schema definition
- `migrations/` - Migration history
- `.env` - Database URLs (including shadow database)
- `prepare-production.sh` - Production migration helper
- `fix-migrations.sh` - Legacy fix script (kept for reference)

## Important Notes
1. **Never** manually edit migration files
2. **Always** test with `encore db reset --all` before committing
3. **Shadow database** is automatically managed by Encore
4. **Production migrations** are applied automatically during deployment