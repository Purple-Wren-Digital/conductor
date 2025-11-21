#!/bin/bash

# Script to prepare production database for new migration structure

echo "🔍 Checking production database migration status..."

# Get production database URL (you'll need to set this)
PROD_DB_URL="${PRODUCTION_DATABASE_URL:-}"

if [ -z "$PROD_DB_URL" ]; then
    echo "❌ Error: PRODUCTION_DATABASE_URL environment variable not set"
    echo "   Set it with: export PRODUCTION_DATABASE_URL='your-production-db-url'"
    exit 1
fi

echo "📊 Current migrations in production:"
psql "$PROD_DB_URL" -c "SELECT version FROM schema_migrations ORDER BY version;" 2>/dev/null

echo ""
echo "🤔 Choose your migration strategy:"
echo "1) Production already has all the schema (mark new migration as applied)"
echo "2) Production needs the new schema (will run the migration)"
echo "3) Cancel"
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo "✅ Marking initial migration as already applied in production..."
        psql "$PROD_DB_URL" -c "INSERT INTO schema_migrations (version, dirty) VALUES (20241121000000, false) ON CONFLICT DO NOTHING;"
        echo "✅ Done! The new migration structure is ready for production."
        ;;
    2)
        echo "📝 Production will run the initial migration on next deployment."
        echo "⚠️  Make sure to backup your production database first!"
        ;;
    3)
        echo "❌ Cancelled"
        exit 1
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "📌 Next steps:"
echo "1. Commit all migration changes to git"
echo "2. Deploy to production"
echo "3. Future migrations will work normally with 'npx prisma migrate dev'"