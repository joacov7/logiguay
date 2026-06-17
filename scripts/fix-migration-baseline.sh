#!/bin/bash
# Fix Prisma P3005: baseline the database so migrate deploy works
# Run this from the repo root on the production server

set -e

echo "=== Step 1: Apply migration SQL directly (idempotent) ==="
docker compose run --rm api sh -c '
  psql $DATABASE_URL -f prisma/migrations/20260617_platform_commissions/migration.sql
'

echo ""
echo "=== Step 2: Create _prisma_migrations table if missing ==="
docker compose run --rm api sh -c '
  psql $DATABASE_URL -c "
    CREATE TABLE IF NOT EXISTS \"_prisma_migrations\" (
      id                      VARCHAR(36) PRIMARY KEY,
      checksum                VARCHAR(64) NOT NULL,
      finished_at             TIMESTAMPTZ,
      migration_name          VARCHAR(255) NOT NULL,
      logs                    TEXT,
      rolled_back_at          TIMESTAMPTZ,
      started_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
      applied_steps_count     INT NOT NULL DEFAULT 0
    );
  "
'

echo ""
echo "=== Step 3: Mark migration as applied in Prisma history ==="
docker compose run --rm api npx prisma migrate resolve --applied 20260617_platform_commissions

echo ""
echo "=== Step 4: Verify ==="
docker compose run --rm api npx prisma migrate status

echo ""
echo "Done! You can now rebuild and restart services:"
echo "  docker compose build --no-cache api web && docker compose up -d"
