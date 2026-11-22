#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/opt/carrier-directory
ENV_FILE=/etc/carrier-directory.env
KEY_FILE=/tmp/loads-admin-key.txt

if [[ ! -f "$KEY_FILE" ]]; then
  echo "Missing $KEY_FILE (admin key to append)." >&2
  exit 1
fi

ADMIN_KEY="$(tr -d '\r\n' < "$KEY_FILE")"
if [[ -z "$ADMIN_KEY" ]]; then
  echo "Admin key file is empty." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

tmp="$(mktemp)"
grep -v '^LOADS_ADMIN_KEY=' "$ENV_FILE" > "$tmp" || true
echo "LOADS_ADMIN_KEY=$ADMIN_KEY" >> "$tmp"
sudo mv "$tmp" "$ENV_FILE"
sudo chmod 600 "$ENV_FILE"
echo "LOADS_ADMIN_KEY set in $ENV_FILE"

cd "$APP_DIR"
npm run build
sudo systemctl restart carrier-directory
sleep 3
systemctl is-active carrier-directory

cat > /tmp/loads-seed.json <<'EOF'
[
  {"originCity":"Houston","originState":"TX","destinationCity":"Dallas","destinationState":"TX","equipment":"Dry van","weight":"42,000 lbs","size":"Full","miles":240,"rate":"$1,450","perMile":"$2.10/mi","pickupDate":"2026-11-20","notes":"Live load, soft appointment. Desk post.","brokerName":"INDUS Transports LLC","brokerPhone":"(512) 761-6399","brokerEmail":"industransportsllc@gmail.com","source":"Indus"},
  {"originCity":"Dallas","originState":"TX","destinationCity":"Oklahoma City","destinationState":"OK","equipment":"Reefer","weight":"38,000 lbs","size":"Full","miles":206,"rate":"$1,280","perMile":"$2.35/mi","pickupDate":"2026-11-20","notes":"Keep product at 34F.","brokerName":"INDUS Transports LLC","brokerPhone":"(512) 761-6399","source":"Laneora desk"},
  {"originCity":"Austin","originState":"TX","destinationCity":"San Antonio","destinationState":"TX","equipment":"Flatbed","weight":"46,000 lbs","size":"Full","miles":80,"rate":"$650","perMile":"$2.50/mi","pickupDate":"2026-11-21","notes":"Tarps required.","brokerName":"INDUS Transports LLC","brokerPhone":"(512) 761-6399","source":"Indus"},
  {"originCity":"Houston","originState":"TX","destinationCity":"New Orleans","destinationState":"LA","equipment":"Dry van","weight":"40,000 lbs","size":"Full","miles":348,"rate":"$1,720","perMile":"$2.05/mi","pickupDate":"2026-11-21","notes":"No touch freight.","brokerName":"INDUS Transports LLC","brokerPhone":"(512) 761-6399","source":"Indus"},
  {"originCity":"Fort Worth","originState":"TX","destinationCity":"Memphis","destinationState":"TN","equipment":"Dry van","weight":"43,500 lbs","size":"Full","miles":452,"rate":"$2,050","perMile":"$2.15/mi","pickupDate":"2026-11-22","notes":"Drop trailer preferred.","brokerName":"INDUS Transports LLC","brokerPhone":"(512) 761-6399","source":"Laneora desk"}
]
EOF

python3 - <<'PY'
import json
import urllib.request

key = open("/tmp/loads-admin-key.txt").read().strip()
rows = json.load(open("/tmp/loads-seed.json"))
ok = 0
for row in rows:
    req = urllib.request.Request(
        "http://127.0.0.1:3010/api/loads",
        data=json.dumps(row).encode(),
        headers={"content-type": "application/json", "x-loads-admin-key": key},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read()
            if 200 <= resp.status < 300:
                ok += 1
            else:
                print("seed fail", resp.status, body[:300])
    except Exception as e:
        print("seed error", e)
print(f"SEEDED={ok}")
PY

curl -sS -o /tmp/loads-smoke.html -w "SMOKE_HTML=%{http_code}\n" "https://carriers.induswebagency.com/loads?state=TX" || true
curl -sS -o /tmp/loads-api.json -w "SMOKE_API=%{http_code}\n" "http://127.0.0.1:3010/api/loads?state=TX" || true
python3 - <<'PY'
import json
try:
    data = json.load(open("/tmp/loads-api.json"))
    desk = [l for l in data.get("loads", []) if l.get("source") in ("Indus", "Laneora desk")]
    print(f"API_LOADS={len(data.get('loads', []))} DESK={len(desk)}")
except Exception as e:
    print("API_PARSE_FAIL", e)
open("/tmp/loads-admin-key.txt", "w").write("")
PY

echo "Deploy loads board complete."
