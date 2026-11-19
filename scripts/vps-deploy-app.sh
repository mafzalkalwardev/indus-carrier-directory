#!/usr/bin/env bash
set -euo pipefail

# Deploy Next.js carrier directory on indus-vps.
# Expects: Node 20+, git, DATABASE_URL in /etc/carrier-directory.env

APP_DIR=/opt/carrier-directory
REPO=https://github.com/mafzalkalwardev/indus-carrier-directory.git
PORT=3010

export DEBIAN_FRONTEND=noninteractive

if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y -qq nodejs
fi

node -v
npm -v

sudo mkdir -p "$APP_DIR"
sudo chown ubuntu:ubuntu "$APP_DIR"

if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO" "$APP_DIR"
else
  git -C "$APP_DIR" fetch --all
  git -C "$APP_DIR" reset --hard origin/main
fi

cd "$APP_DIR"
# Prefer production env file
if [ -f /etc/carrier-directory.env ]; then
  set -a
  # shellcheck disable=SC1091
  source /etc/carrier-directory.env
  set +a
  sudo cp /etc/carrier-directory.env "$APP_DIR/.env"
  sudo chown ubuntu:ubuntu "$APP_DIR/.env"
  sudo chmod 600 "$APP_DIR/.env"
fi

npm ci
npm run build
# Drop unused install-time deps after build to save disk
npm prune --omit=dev || true

sudo tee /etc/systemd/system/carrier-directory.service >/dev/null <<EOF
[Unit]
Description=INDUS Carrier Directory (Next.js)
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$APP_DIR
EnvironmentFile=/etc/carrier-directory.env
Environment=NODE_ENV=production
Environment=PORT=$PORT
ExecStart=$APP_DIR/node_modules/.bin/next start -H 127.0.0.1 -p $PORT
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now carrier-directory
sudo systemctl restart carrier-directory
sleep 2
systemctl is-active carrier-directory
curl -fsS "http://127.0.0.1:${PORT}/" | head -c 200 || true
echo
echo APP_DEPLOYED
