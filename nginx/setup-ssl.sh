#!/usr/bin/env bash
# Setup Nginx + Let's Encrypt for logiguay.com.ar
# Run as root on the Hetzner VPS: bash /opt/logiguay/nginx/setup-ssl.sh

set -e

DOMAIN="logiguay.com.ar"
API_DOMAIN="api.logiguay.com.ar"
TRACCAR_DOMAIN="traccar.logiguay.com.ar"
EMAIL="joaquinvescina@gmail.com"

echo "==> Instalando Nginx y Certbot..."
apt-get update -q
apt-get install -y nginx certbot python3-certbot-nginx

echo "==> Habilitando Nginx..."
systemctl enable nginx
systemctl start nginx

echo "==> Abriendo puertos 80 y 443 en firewall..."
ufw allow 'Nginx Full' 2>/dev/null || true

echo "==> Obteniendo certificados SSL..."
# Web
certbot certonly --nginx \
  --non-interactive --agree-tos \
  --email "$EMAIL" \
  -d "$DOMAIN" -d "www.$DOMAIN"

# API
certbot certonly --nginx \
  --non-interactive --agree-tos \
  --email "$EMAIL" \
  -d "$API_DOMAIN"

# Traccar
certbot certonly --nginx \
  --non-interactive --agree-tos \
  --email "$EMAIL" \
  -d "$TRACCAR_DOMAIN"

echo "==> Copiando configuración de Nginx..."
cp /opt/logiguay/nginx/logiguay.conf /etc/nginx/sites-available/logiguay.conf
ln -sf /etc/nginx/sites-available/logiguay.conf /etc/nginx/sites-enabled/logiguay.conf
rm -f /etc/nginx/sites-enabled/default

echo "==> Verificando configuración..."
nginx -t

echo "==> Recargando Nginx..."
systemctl reload nginx

echo ""
echo "✅ HTTPS configurado correctamente."
echo "   https://logiguay.com.ar          → Web"
echo "   https://api.logiguay.com.ar      → API"
echo "   https://traccar.logiguay.com.ar  → Traccar"
echo ""
echo "==> Renovación automática activa:"
systemctl status certbot.timer || true
