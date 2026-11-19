#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/opt/carrier-directory
LOG=/var/log/carrier-ingest.log
ENV_FILE=/etc/carrier-directory.env

exec >>"$LOG" 2>&1
echo "==== $(date -Is) ingest start ===="

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

cd "$APP_DIR"
# Ensure python venv for ingest
if [ ! -d ingest/.venv ]; then
  python3 -m venv ingest/.venv
  ingest/.venv/bin/pip install -r ingest/requirements.txt
fi

npm run ingest
npm run ingest:safety || true
echo "==== $(date -Is) ingest done ===="
