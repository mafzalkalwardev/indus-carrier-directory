# Glossary — Indus Carrier Directory

| Term | Meaning | User-facing? |
|------|---------|--------------|
| **Live board** | Public product name for freight search results from the Indus desk upstream | Yes |
| **Soft** | Private upstream adapter / GraphQL host that feeds the live board | **Never** in UI |
| **DAT** | Underlying freight network Soft uses; never named in the browser | **Never** in UI |
| **Laneora** | Separate desktop dispatch product (marketing / download link) | Yes (as product) |
| **CDP helper** | Frankfurt Chrome DevTools helper (`:8799`) that harvests tokens / Motus via US VPN | Ops only |
| **Motus** | FMCSA company contact/authority enrichment source | Ops / data |
| **FMCSA ingest** | Nightly census/safety load into Postgres | Ops only |
| **IngestCoordinator** | `scripts/vps-nightly-ingest.sh` — flocked load → safety → score | Ops only |
| **LiveLoadsPort** | `lib/live-loads.ts` — app seam for search/detail public DTOs | Code |
| **MotusEnricher** | Motus fetch + upsert path (`lib/motus.ts` + enrich script) | Code |

**Rule:** Soft credentials and Soft/DAT vocabulary stay server-side. Browser copy says “Live board” only.
