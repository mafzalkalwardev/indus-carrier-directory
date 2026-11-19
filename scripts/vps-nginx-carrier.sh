#!/usr/bin/env bash
set -euo pipefail

# nginx site for carrier directory — uses existing indus security headers / cert pattern.
HOST="${1:-carriers.induswebagency.com}"
PORT=3010

sudo tee /etc/nginx/sites-available/carrier-directory >/dev/null <<EOF
server {
    server_name ${HOST};

    include /etc/nginx/snippets/indus-security-headers.conf;

    location ^~ /.well-known/acme-challenge/ {
        default_type "text/plain";
        root /var/www/html;
    }

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }

    listen 80;
    listen [::]:80;
}
EOF

sudo ln -sfn /etc/nginx/sites-available/carrier-directory /etc/nginx/sites-enabled/carrier-directory
sudo nginx -t
sudo systemctl reload nginx

# TLS via certbot if available (shared certs often already exist for *.induswebagency.com siblings)
if command -v certbot >/dev/null; then
  sudo certbot --nginx -d "$HOST" --non-interactive --agree-tos --email industransportsllc@gmail.com --redirect || true
fi

echo "NGINX_OK host=${HOST}"
