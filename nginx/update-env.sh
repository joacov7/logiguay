#!/usr/bin/env bash
# Actualiza las URLs en .env para usar HTTPS después del setup SSL
# Run: bash /opt/logiguay/nginx/update-env.sh

set -e
ENV_FILE="/opt/logiguay/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: No se encontró $ENV_FILE"
  exit 1
fi

echo "==> Actualizando URLs en .env..."

# API
sed -i 's|API_URL=http://.*|API_URL=https://api.logiguay.com.ar|g' "$ENV_FILE"
sed -i 's|API_CORS_ORIGIN=http://.*|API_CORS_ORIGIN=https://logiguay.com.ar|g' "$ENV_FILE"

# Web públicas (se usan como build args al reconstruir)
sed -i 's|NEXT_PUBLIC_API_URL=http://.*|NEXT_PUBLIC_API_URL=https://api.logiguay.com.ar|g' "$ENV_FILE"
sed -i 's|NEXT_PUBLIC_WS_URL=http://.*|NEXT_PUBLIC_WS_URL=https://api.logiguay.com.ar|g' "$ENV_FILE"

echo "==> .env actualizado. Reconstruyendo contenedores..."
cd /opt/logiguay
docker compose up -d --build web api

echo ""
echo "✅ Listo. La app ahora usa HTTPS."
