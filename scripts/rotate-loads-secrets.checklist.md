# Rotate live-board + helper secrets (VPS ops)

Run on Frankfurt after deploying helper auth. Do **not** put new secrets in git or `scripts/tmp-*`.

1. Generate helper token: `openssl rand -hex 32`
2. Set `LOADS_HELPER_TOKEN` in:
   - `/etc/carrier-directory.env` (Next + Motus enrich)
   - laneora-loads-search systemd unit / EnvironmentFile
   - Soft host `loads_api` / tunnel caller env (must send `Authorization: Bearer …`)
   - `/etc/laneora-loads-watchdog.env` (optional; health stays open)
3. Rotate Soft/Laneora password in Soft admin; update:
   - `/etc/carrier-directory.env` → `LANEORA_USERNAME` / `LANEORA_PASSWORD`
   - `/etc/laneora-loads-watchdog.env` (LANEORA_* or legacy SOFT_*)
4. `chmod 600` all env files; confirm not world-readable
5. Restart: `laneora-loads-search`, tunnel, `carrier-directory`, Motus enrich timer
6. Smoke: `curl -s http://127.0.0.1:8799/health` → ok; without token `POST /search` → 401; with token → 200
7. Confirm `/loads` still shows Live board cards and HTML has no Soft/DAT strings
