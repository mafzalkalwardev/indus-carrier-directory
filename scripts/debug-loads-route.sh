#!/usr/bin/env bash
set -euo pipefail
echo "=== files ==="
ls -la /opt/carrier-directory/app/loads/
ls -la /opt/carrier-directory/app/loads/open/ || true
ls -la /opt/carrier-directory/app/loads/post/ || true
echo "=== page head ==="
head -8 /opt/carrier-directory/app/loads/page.tsx
echo "=== localhost /loads ==="
curl -sS 'http://127.0.0.1:3010/loads?state=TX' -o /tmp/ll.html
python3 - <<'PY'
h=open('/tmp/ll.html').read()
i=h.find('<main')
print(h[i:i+400] if i>=0 else h[:400])
print('HAS_INDUS_DESK', 'Indus desk' in h)
print('HAS_OPEN_LANEORA', 'Open Laneora' in h)
print('HAS_ORIGIN_NOT', 'Origin not listed' in h)
PY
echo "=== localhost /loads/post ==="
curl -sS -o /tmp/lp.html -w '%{http_code}\n' 'http://127.0.0.1:3010/loads/post'
python3 - <<'PY'
h=open('/tmp/lp.html').read()
print('POST_PAGE', 'Post a desk load' in h)
PY
echo "=== nginx ==="
sudo grep -Rni 'loads\|carrier\|3010\|rewrite\|location' /etc/nginx/sites-enabled/ 2>/dev/null | head -60 || true
