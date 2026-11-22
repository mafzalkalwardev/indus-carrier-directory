#!/usr/bin/env bash
set -euo pipefail
echo "ENV_HAS_KEY=$(grep -c '^LOADS_ADMIN_KEY=' /etc/carrier-directory.env || true)"
curl -sS 'http://127.0.0.1:3010/api/loads?state=TX' -o /tmp/loads-api.json
python3 - <<'PY'
import json
d=json.load(open('/tmp/loads-api.json'))
desk=[l for l in d.get('loads',[]) if l.get('source') in ('Indus','Laneora desk')]
print('API_LOADS', len(d.get('loads',[])))
print('DESK', len(desk))
print('SOURCES', sorted({l.get('source') for l in d.get('loads',[])}))
PY
curl -sS 'https://carriers.induswebagency.com/loads?state=TX' -o /tmp/loads-page.html
python3 - <<'PY'
h=open('/tmp/loads-page.html').read()
print('LANEORA_CTA', 'Open Laneora' in h)
print('LANEORA_URL', 'mafzalkalwardev.github.io/laneora' in h)
print('INDUS_CHIP', 'Indus' in h)
print('DESK_KICKER', 'Indus desk' in h or 'Laneora desk' in h)
PY
# POST create smoke (then hide it)
KEY=$(grep '^LOADS_ADMIN_KEY=' /etc/carrier-directory.env | cut -d= -f2-)
curl -sS -o /tmp/loads-post.json -w 'POST_HTTP=%{http_code}\n' \
  -X POST 'http://127.0.0.1:3010/api/loads' \
  -H 'content-type: application/json' \
  -H "x-loads-admin-key: $KEY" \
  -d '{"originCity":"Waco","originState":"TX","destinationCity":"Austin","destinationState":"TX","equipment":"Dry van","miles":100,"rate":"$500","source":"Indus","brokerName":"INDUS Transports LLC"}'
python3 - <<'PY'
import json
body=json.load(open('/tmp/loads-post.json'))
print('POST_OK', body.get('ok'), body.get('load',{}).get('id'))
lid=str(body.get('load',{}).get('id','')).replace('indus-','')
open('/tmp/loads-post-id.txt','w').write(lid)
PY
LID=$(cat /tmp/loads-post-id.txt)
curl -sS -o /tmp/loads-patch.json -w 'PATCH_HTTP=%{http_code}\n' \
  -X PATCH 'http://127.0.0.1:3010/api/loads' \
  -H 'content-type: application/json' \
  -H "x-loads-admin-key: $KEY" \
  -d "{\"id\":$LID,\"status\":\"hidden\"}"
cat /tmp/loads-patch.json; echo
