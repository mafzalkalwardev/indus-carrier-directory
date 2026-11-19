#!/usr/bin/env bash
set -euo pipefail

# Install and tune Postgres for carrier directory on indus-vps (ARM Ubuntu).
# Run as ubuntu with passwordless sudo.

export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -qq
sudo apt-get install -y -qq postgresql postgresql-contrib

# Detect version
PG_VER=$(ls /etc/postgresql | sort -V | tail -1)
CONF="/etc/postgresql/${PG_VER}/main/postgresql.conf"
HBA="/etc/postgresql/${PG_VER}/main/pg_hba.conf"

sudo sed -i "s/^#\\?listen_addresses.*/listen_addresses = '127.0.0.1'/" "$CONF"
# ~24GB RAM: shared_buffers 4GB, effective_cache_size 16GB
sudo tee /etc/postgresql/${PG_VER}/main/conf.d/carrier.conf >/dev/null <<'EOF'
shared_buffers = 4GB
effective_cache_size = 16GB
maintenance_work_mem = 1GB
work_mem = 64MB
wal_buffers = 64MB
checkpoint_completion_target = 0.9
random_page_cost = 1.1
effective_io_concurrency = 200
max_connections = 80
synchronous_commit = off
EOF

sudo systemctl enable --now postgresql
sudo systemctl restart postgresql

# Role + database
sudo -u postgres psql -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'carrier') THEN
    CREATE ROLE carrier LOGIN PASSWORD 'carrier_vps_2026';
  ELSE
    ALTER ROLE carrier WITH PASSWORD 'carrier_vps_2026';
  END IF;
END$$;
SELECT 'ok_role' AS status;
SQL

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='carrier'" | grep -q 1 \
  || sudo -u postgres createdb -O carrier carrier

sudo -u postgres psql -v ON_ERROR_STOP=1 -c "GRANT ALL PRIVILEGES ON DATABASE carrier TO carrier;"
sudo -u postgres psql -d carrier -v ON_ERROR_STOP=1 -c "GRANT ALL ON SCHEMA public TO carrier;"

echo "DATABASE_URL=postgresql://carrier:carrier_vps_2026@127.0.0.1:5432/carrier"
echo "PG_READY"
df -h /
