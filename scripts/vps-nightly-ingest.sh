#!/usr/bin/env bash
# IngestCoordinator — nightly FMCSA load → safety → score under one flock.
# Never set ALLOW_DROP_INDEXES here; index drops are maintenance-window only.
set -euo pipefail

APP_DIR=/opt/carrier-directory
LOG=/var/log/carrier-ingest.log
ENV_FILE=/etc/carrier-directory.env
LOCK=/var/lock/carrier-ingest.lock
STATUS=/var/run/carrier-ingest.status

exec >>"$LOG" 2>&1
echo "==== $(date -Is) ingest start ===="

exec 9>"$LOCK"
if ! flock -n 9; then
  echo "==== $(date -Is) ingest skipped: another ingest holds $LOCK ===="
  echo "skipped $(date -Is)" >"$STATUS" || true
  exit 0
fi

phase() { echo "phase=$1 at=$(date -Is)" | tee "$STATUS" >/dev/null; echo "==== $(date -Is) phase: $1 ===="; }

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
# Explicitly ban DROP INDEX on the live nightly path.
unset ALLOW_DROP_INDEXES || true
export ALLOW_DROP_INDEXES=0

cd "$APP_DIR"
if [ ! -d ingest/.venv ]; then
  python3 -m venv ingest/.venv
  ingest/.venv/bin/pip install -r ingest/requirements.txt
fi

phase load
npm run ingest -- --skip-score

phase safety
npm run ingest:safety -- --skip-score || true

phase score
npm run ingest:score || true

phase done
echo "==== $(date -Is) ingest done ===="
echo "ok $(date -Is)" >"$STATUS" || true
