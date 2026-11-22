#!/usr/bin/env bash
# Deploy hygiene: kill zombie next on the app port, then restart cleanly.
set -euo pipefail
PORT="${CARRIER_PORT:-3000}"
APP_DIR="${APP_DIR:-/opt/carrier-directory}"
SERVICE="${CARRIER_SERVICE:-carrier-directory}"

echo "Stopping $SERVICE..."
systemctl stop "$SERVICE" || true
sleep 1

# Reap listeners on the app port (EADDRINUSE leftover).
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" 2>/dev/null || true
fi
pkill -f "next start" 2>/dev/null || true
pkill -f "node.*next" 2>/dev/null || true
sleep 1

cd "$APP_DIR"
npm run build
systemctl start "$SERVICE"
sleep 3
systemctl is-active --quiet "$SERVICE"
curl -sf -m 20 "http://127.0.0.1:${PORT}/loads" >/dev/null
echo "deploy ok — $SERVICE on :$PORT"
