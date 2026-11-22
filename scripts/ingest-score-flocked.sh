#!/usr/bin/env bash
# Score/recompute must share the ingest flock so it cannot collide with nightly load.
set -euo pipefail
APP_DIR=/opt/carrier-directory
ENV_FILE=/etc/carrier-directory.env
LOCK=/var/lock/carrier-ingest.lock

exec 9>"$LOCK"
if ! flock -n 9; then
  echo "score skipped: ingest lock held"
  exit 0
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
cd "$APP_DIR"
npm run ingest:score
