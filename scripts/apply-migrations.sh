#!/usr/bin/env bash
#
# Aplica todas las migraciones SQL (apps/api/prisma/migrations/*/migration.sql)
# contra la base de datos Postgres del compose. Idempotente: se puede correr
# las veces que haga falta sin romper nada.
#
# Uso (desde /opt/logiguay):
#   ./scripts/apply-migrations.sh
#
set -euo pipefail

# Carpeta raíz del repo (un nivel arriba de scripts/)
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Tomar credenciales del .env si existe; si no, usar los defaults del compose
if [ -f .env ]; then
  # shellcheck disable=SC1091
  set -a; source .env; set +a
fi
DB_USER="${POSTGRES_USER:-logiguay}"
DB_NAME="${POSTGRES_DB:-logiguay_db}"

MIGRATIONS_DIR="apps/api/prisma/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "❌ No existe $MIGRATIONS_DIR"
  exit 1
fi

echo "▶ Aplicando migraciones a la base '$DB_NAME' (usuario '$DB_USER')…"
echo

# Recorrer las migraciones ordenadas por nombre (el prefijo de fecha las ordena)
shopt -s nullglob
found=0
for sql in $(ls -1 "$MIGRATIONS_DIR"/*/migration.sql | sort); do
  found=1
  name="$(basename "$(dirname "$sql")")"
  echo "  → $name"
  docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" < "$sql"
done

if [ "$found" -eq 0 ]; then
  echo "  (no se encontraron archivos de migración)"
fi

echo
echo "✅ Migraciones aplicadas."
