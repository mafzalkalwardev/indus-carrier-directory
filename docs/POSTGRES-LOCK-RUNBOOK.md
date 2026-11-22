# Postgres lock / stuck ingest runbook

1. Check blockers:
   ```sql
   SELECT pid, state, wait_event_type, left(query,120), now()-query_start AS age
   FROM pg_stat_activity
   WHERE datname = 'carrier'
   ORDER BY query_start;
   ```
2. If a `recompute_*` or `DROP INDEX` is stuck > 30m and holding locks, terminate **that** backend only:
   ```sql
   SELECT pg_terminate_backend(<pid>);
   ```
3. Confirm flock: `/var/lock/carrier-ingest.lock` — only one nightly coordinator.
4. Restart under coordinator: `systemctl start carrier-ingest.service` (or run `scripts/vps-nightly-ingest.sh`).
5. Never set `ALLOW_DROP_INDEXES=1` on the live nightly path.
6. Score outside nightly: use `scripts/ingest-score-flocked.sh` so it shares the lock.
