# ADR-001: LiveLoadsPort, MotusEnricher, IngestCoordinator

## Status
Accepted — 2026-03-20

## Context
Soft GraphQL, CDP helper, Motus HTTP/CDP, and FMCSA ingest leaked concerns across Next routes, UI, and ops scripts (secrets in tmp scripts, unauth helper, Soft strings in UI, Postgres lock storms).

## Decision
1. **LiveLoadsPort** (`lib/live-loads.ts`) — only public entry for live search/detail; Soft stays in `lib/laneora.ts` adapter.
2. **Helper auth** — `LOADS_HELPER_TOKEN` required on CDP `:8799` `/search` and `/motus/*`; bind loopback by default.
3. **MotusEnricher** — CDP proxy preferred from VPS; company phone/email from Motus company fields; gap index for selects.
4. **IngestCoordinator** — single flock; no `ALLOW_DROP_INDEXES` on nightly path; score shares flock via `ingest-score-flocked.sh`.
5. **Public DTOs** — `toPublicLoadDetail` strips raw Soft/DAT; live detail URLs use opaque `search_id` + `match_id` only.

## Consequences
- Soft host `loads_api` must send helper token when calling Frankfurt `:8799`.
- Rotate secrets after deploy (see `scripts/rotate-loads-secrets.checklist.md`).
