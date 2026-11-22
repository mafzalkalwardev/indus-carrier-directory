#!/usr/bin/env bash
# Frankfurt watchdog: live board search must keep feeding carriers.induswebagency.com/loads
set -uo pipefail
LOG=/var/log/laneora-loads-watchdog.log
ENV_FILE=/etc/laneora-loads-watchdog.env
stamp() { date -u +'%Y-%m-%dT%H:%M:%SZ'; }
log() { echo "$(stamp) $*" | tee -a "$LOG" >/dev/null; }

if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a
  source "$ENV_FILE"
  set +a
fi
# Prefer LANEORA_* ; keep SOFT_* as legacy aliases for existing VPS env files.
API_BASE="${LANEORA_API_BASE:-${SOFT_API_BASE:-https://laneora.induswebagency.com}}"
API_USER="${LANEORA_USERNAME:-${SOFT_USERNAME:-}}"
API_PASS="${LANEORA_PASSWORD:-${SOFT_PASSWORD:-}}"
HELPER_TOKEN="${LOADS_HELPER_TOKEN:-}"
if [ -z "$API_USER" ] || [ -z "$API_PASS" ]; then
  log "SKIP missing live-board credentials in $ENV_FILE"
  exit 0
fi

board_ok=0
page_ok=0
COUNT=0
CARDS=0
FALLBACK=0

SESSION_JSON=$(LANEORA_USERNAME="$API_USER" LANEORA_PASSWORD="$API_PASS" python3 - <<'PY'
import json, os
print(json.dumps({"username": os.environ["LANEORA_USERNAME"], "password": os.environ["LANEORA_PASSWORD"]}))
PY
)

TOKEN=$(curl -sS -m 20 -X POST "$API_BASE/api/v1/session" \
  -H 'Content-Type: application/json' \
  -d "$SESSION_JSON" 2>/dev/null \
  | python3 -c 'import sys,json; print(json.load(sys.stdin).get("token",""))' 2>/dev/null || true)
if [ -n "${TOKEN:-}" ]; then
  COUNT=$(curl -sS -m 90 -X POST "$API_BASE/api/v1/loads/search" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d '{"origin":{"city":"Dallas","state":"TX","deadhead_miles":100},"equipment":["V"],"capacity":"BOTH","max_age_minutes":1440,"limit":3}' 2>/dev/null \
    | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("count") if d.get("ok") else 0)' 2>/dev/null || echo 0)
  if [ "${COUNT:-0}" -gt 0 ] 2>/dev/null; then board_ok=1; fi
fi

# Helper health (auth required for data routes; /health stays open).
HELPER_OK=0
if curl -sS -m 5 http://127.0.0.1:8799/health 2>/dev/null | grep -q '"ok": true\|"ok":true'; then
  HELPER_OK=1
fi

curl -sS -m 90 -o /tmp/loads-watchdog.html \
  "https://carriers.induswebagency.com/loads?origin_state=TX&origin_city=Dallas&state=TX&equipment=van" 2>/dev/null || true
eval "$(python3 - <<'PY'
import pathlib
h = pathlib.Path('/tmp/loads-watchdog.html').read_text(encoding='utf-8', errors='ignore')
cards = h.count('class="load-card"')
fallback = (
    'Showing desk posts and public boards for this search.' in h
    or 'Showing public boards and desk posts because Laneora Soft was unavailable' in h
)
# Soft/DAT must never appear in user HTML.
leak = ('Laneora Soft' in h) or ('Soft:' in h) or ('DAT ' in h and 'credit' not in h.lower())
live = 'Live board' in h or 'live board' in h
ok = cards >= 5 and live and not fallback and not leak
print(f'CARDS={cards}')
print(f'page_ok={1 if ok else 0}')
print(f'FALLBACK={1 if fallback else 0}')
print(f'LEAK={1 if leak else 0}')
PY
)"
CARDS=${CARDS:-0}
page_ok=${page_ok:-0}
FALLBACK=${FALLBACK:-0}
LEAK=${LEAK:-0}

if [ "$board_ok" = 1 ] && [ "$page_ok" = 1 ] && [ "$HELPER_OK" = 1 ] && [ "$LEAK" = 0 ]; then
  log "OK board_count=${COUNT:-?} page_cards=${CARDS:-?} helper=active"
  exit 0
fi

log "DEGRADED board_ok=$board_ok count=${COUNT:-0} page_ok=$page_ok cards=${CARDS:-0} fallback=${FALLBACK:-?} helper=$HELPER_OK leak=$LEAK — repairing"
systemctl is-active --quiet laneora-chrome || systemctl restart laneora-chrome
sleep 2
systemctl restart laneora-loads-search.service || true
sleep 2
systemctl restart laneora-loads-search-tunnel.service || true
sleep 4
if [ "$board_ok" = 0 ]; then
  systemctl start laneora-capture-if-expired.service || true
  sleep 2
fi
systemctl is-active --quiet carrier-directory || systemctl restart carrier-directory

TOKEN=$(curl -sS -m 20 -X POST "$API_BASE/api/v1/session" \
  -H 'Content-Type: application/json' \
  -d "$SESSION_JSON" 2>/dev/null \
  | python3 -c 'import sys,json; print(json.load(sys.stdin).get("token",""))' 2>/dev/null || true)
COUNT2=$(curl -sS -m 90 -X POST "$API_BASE/api/v1/loads/search" \
  -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' \
  -d '{"origin":{"city":"Dallas","state":"TX","deadhead_miles":100},"equipment":["V"],"limit":3}' 2>/dev/null \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("count") if d.get("ok") else 0)' 2>/dev/null || echo 0)
log "AFTER_REPAIR board_count=${COUNT2:-0} helper=$(systemctl is-active laneora-loads-search) tunnel=$(systemctl is-active laneora-loads-search-tunnel) chrome=$(systemctl is-active laneora-chrome) carrier=$(systemctl is-active carrier-directory)"
exit 0
