#!/bin/bash

# Complete development database reset script
# This handles all the complexity of Encore + Prisma migrations

echo "🔧 Resetting development database..."

# Reset all Encore databases
encore db reset --all

# Wait for databases to be ready
sleep 2

# Mark the initial migration as applied
# (Encore already created the schema from the migration file)
echo "📝 Syncing Prisma migration history..."
npx prisma migrate resolve --applied 20241121000000_initial --schema=./ticket/schema.prisma --skip-generate 2>/dev/null

# Generate Prisma client
echo "🔨 Generating Prisma client..."
npx prisma generate --schema=./ticket/schema.prisma

echo ""
echo "✅ Development database reset complete!"
echo ""
echo "Next steps:"
echo "  1. Run 'encore run' to start the backend"
echo "  2. Run 'curl -X POST http://localhost:4000/seed' to seed data"
echo "  3. Future migrations: 'npx prisma migrate dev --name your_migration'"