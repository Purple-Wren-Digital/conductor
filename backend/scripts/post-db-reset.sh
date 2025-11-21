#!/bin/bash

# Automatically sync Prisma after encore db reset
# This script should be run after every `encore db reset --all`

echo "🔄 Syncing Prisma migrations with Encore database..."

# Mark the initial migration as already applied
# (Encore already created the schema when it reset the database)
npx prisma migrate resolve --applied 20241121000000_initial --schema=./ticket/schema.prisma 2>/dev/null

echo "✅ Database is ready for development!"
echo "   - Run 'npm run dev' to start the backend"
echo "   - Future migrations: 'npx prisma migrate dev --name your_migration'"