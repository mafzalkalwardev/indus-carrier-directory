# VPS topology (no secrets)

```
Carriers site (Frankfurt)          Soft host                    Chrome capture
carriers.induswebagency.com   laneora.induswebagency.com     CDP :9334 + Surfshark
Next.js :3000 ──────────────► Soft API /api/v1/loads/*
       │                              │
       │                              └── SSH -R tunnel ──► helper :8799 (loopback)
       │                                                      │
       └── Motus enrich ── Authorization Bearer ──────────────┘
                              GET /motus/:dot via Chrome US egress
```

**Must not be public:** Soft passwords, `LOADS_HELPER_TOKEN`, helper `/search` and `/motus` without token, raw Soft/DAT in HTML.
