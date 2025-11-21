#!/bin/bash

# Fix Prisma + Encore migration conflicts after database reset

echo "🔧 Fixing database migrations after reset..."

# Get database connection strings
DB_URL=$(encore db conn-uri ticket)
SHADOW_URL=$(encore db conn-uri ticket --shadow)

echo "📊 Pushing Prisma schema to database..."
npx prisma db push --schema=./ticket/schema.prisma --accept-data-loss

echo "📝 Creating schema_migrations table..."
psql "$DB_URL" -c "CREATE TABLE IF NOT EXISTS schema_migrations (version bigint PRIMARY KEY, dirty boolean NOT NULL);" 2>/dev/null || true

echo "✅ Marking all migrations as applied..."
psql "$DB_URL" << 'EOF' 2>/dev/null
INSERT INTO schema_migrations (version, dirty) VALUES
(20250811142711, false),
(20250811151837, false),
(20250811152622, false),
(20250811175130, false),
(20250813163141, false),
(20250813164455, false),
(20250813172644, false),
(20250815145106, false),
(20250815163246, false),
(20250815163657, false),
(20250821194619, false),
(20250827012919, false),
(20250827133117, false),
(20250827133743, false),
(20250827135310, false),
(20250827161239, false),
(20250827164115, false),
(20250827180953, false),
(20250828183834, false),
(20250905211824, false),
(20250908154614, false),
(20250909155155, false),
(20250917194943, false),
(20251001152424, false),
(20251001153532, false),
(20251001160825, false),
(20251001182242, false),
(20251001183608, false),
(20251003203704, false),
(20251003203814, false),
(20251003204118, false),
(20251003204329, false),
(20251010160843, false),
(20251013151240, false),
(20251015155143, false),
(20251015155212, false),
(20251015163049, false),
(20251017145356, false),
(20251017151903, false),
(20251017152227, false),
(20251017152833, false),
(20251017165821, false),
(20251017180819, false),
(20251017203144, false),
(20251020154219, false),
(20251020155340, false),
(20251020175407, false),
(20251020175608, false),
(20251021191235, false),
(20251027025304, false),
(20251106184327, false),
(20251110160049, false),
(20251110162118, false),
(20251110164832, false),
(20251110184627, false),
(20251117213715, false),
(20251117214006, false),
(20251118214641, false)
ON CONFLICT (version) DO UPDATE SET dirty = false;
EOF

echo "🎉 Database migration fix complete!"
echo ""
echo "You can now run:"
echo "  encore run"
echo "  curl -X POST http://localhost:4000/seed"