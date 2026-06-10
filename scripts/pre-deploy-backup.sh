#!/bin/bash
# Run BEFORE deploying any migration to production
# Dumps the ticket database using encore db conn-uri + pg_dump
#
# Usage: ./scripts/pre-deploy-backup.sh [environment]
# Example: ./scripts/pre-deploy-backup.sh local
#          ./scripts/pre-deploy-backup.sh staging
#          ./scripts/pre-deploy-backup.sh production
#          ./scripts/pre-deploy-backup.sh preview

set -euo pipefail

ENV="${1:-local}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/../backups"
mkdir -p "${BACKUP_DIR}"
BACKUP_FILE="${BACKUP_DIR}/ticket_${ENV}_${TIMESTAMP}.dump"

cd "${SCRIPT_DIR}/../backend"

echo "=== Pre-migration backup: ${ENV} ==="

CONN_URI=$(encore db conn-uri ticket --env="${ENV}" --admin)

if [ -z "${CONN_URI}" ]; then
  echo "ERROR: Could not get connection URI for '${ENV}'"
  exit 1
fi

# Detect server version and pick matching pg_dump
SERVER_VER=$(psql "${CONN_URI}" -t -c "SHOW server_version;" 2>/dev/null | tr -d ' ' | cut -d. -f1)

if [ -z "${SERVER_VER}" ]; then
  echo "ERROR: Could not detect server version"
  exit 1
fi

PG_DUMP="/opt/homebrew/opt/postgresql@${SERVER_VER}/bin/pg_dump"
if [ ! -x "${PG_DUMP}" ]; then
  PG_DUMP="$(command -v pg_dump)"
  echo "WARNING: postgresql@${SERVER_VER} not found, falling back to $(${PG_DUMP} --version)"
fi

echo "Server: PostgreSQL ${SERVER_VER}"
echo "Using: $(${PG_DUMP} --version)"

echo "Running pg_dump..."
"${PG_DUMP}" "${CONN_URI}" --no-owner --no-acl --format=custom -f "${BACKUP_FILE}"

echo ""
echo "Backup saved: ${BACKUP_FILE}"
echo "Size: $(du -h "${BACKUP_FILE}" | cut -f1)"
echo ""
echo "To restore:"
echo "  CONN=\$(cd backend && encore db conn-uri ticket --env=${ENV} --admin)"
echo "  /opt/homebrew/opt/postgresql@${SERVER_VER}/bin/pg_restore -d \"\${CONN}\" --no-owner --no-acl ${BACKUP_FILE}"
