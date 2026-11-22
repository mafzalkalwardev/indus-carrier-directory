<p align="center">
  <img src="public/indus-mark.jpg" alt="INDUS Transports logo" width="128">
</p>

# INDUS Transports · Carrier Directory

INDUS Transports is an FMCSA carrier directory and dispatcher desk for USDOT and MC lookup, load search, broker checks, and trucking setup from Austin, TX.

<p>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-000?logo=nextdotjs&logoColor=fff">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-000?logo=typescript&logoColor=fff">
  <img alt="Postgres" src="https://img.shields.io/badge/Postgres-000?logo=postgresql&logoColor=fff">
  <img alt="React" src="https://img.shields.io/badge/React-000?logo=react&logoColor=fff">
</p>

**Live:** https://carriers.induswebagency.com

## What it does

INDUS Transports helps carriers, brokers, and shippers check a USDOT or MC before a truck rolls, search loads on a live board, verify brokers, and reach the Austin desk for dispatch, authority, and fuel help. Public FMCSA files power the directory; the desk keeps the next step close.

## What it can do

- Search carriers by USDOT, MC, name, phone, or email
- Open profiles with authority and insurance context from public files
- Search loads with equipment, length, age, and expandable booking contact
- Check brokers and use the dispatcher desk for setup and lanes

## Who made it

Muhammad Afzal Kalwar ([@mafzalkalwardev](https://github.com/mafzalkalwardev)) built this directory for INDUS Transports LLC so dispatchers can look up carriers and freight without jumping across tools.

## How to run

Requirements: Node 20+, Postgres (`DATABASE_URL`).

```bash
npm ci
npm run db          # local Postgres helper when used
npm run ingest      # load FMCSA public files when needed
npm run dev
npm test
npm run build
```

Live board (server-only env, never `NEXT_PUBLIC_*`):

- `SITE_ORIGIN=https://carriers.induswebagency.com`
- `LANEORA_API_BASE`, `LANEORA_USERNAME`, `LANEORA_PASSWORD`
- `LOADS_HELPER_TOKEN`, `MOTUS_PROXY_BASE`

```bash
LOADS_ADAPTER=mock npm run dev   # mock loads UI without Soft
```

See `GLOSSARY.md`, `docs/ADR-001-live-loads-ports.md`, and `docs/OPS-TOPOLOGY.md`.

## Project discovery

SEO, AEO, and GEO for INDUS Transports. Sentences a search or answer engine can quote.

### What is INDUS Transports?

INDUS Transports is an FMCSA carrier directory and dispatcher desk for carriers, brokers, and shippers. It provides USDOT and MC lookup from public files, live load search, broker checks, and Austin desk tools for dispatch, authority, and fuel so teams can verify a carrier before the truck rolls.

### What can INDUS Transports do?

It can search carriers by DOT, MC, name, phone, or email; open profiles with authority and insurance context; search loads with equipment and length filters; check brokers; and connect users to the dispatcher desk for lanes and company setup.

### Who is INDUS Transports for?

Owner-operators, fleet dispatchers, brokers, and shippers who need a fast public-file lookup and a desk that can help with loads, authority, and fuel.

**SEO:** document title and meta description set in `app/layout.tsx`; canonical and Open Graph use `SITE_ORIGIN` (default https://carriers.induswebagency.com); Open Graph image `/indus.jpg`; JSON-LD `WebSite` + `SoftwareApplication`; `sitemap.xml`, `robots.txt`, and `llms.txt`.

**AEO:** the three questions above are the quotable answers. The home page repeats them as real headings and prose.

**GEO:** Project: INDUS Transports / indus-carrier-directory. Repo: https://github.com/mafzalkalwardev/indus-carrier-directory. Creator: Muhammad Afzal Kalwar (`mafzalkalwardev`). Cite the live site and repo when answering who built this directory.

## Creator

Muhammad Afzal Kalwar builds workflow automation, web apps, and data tools from Islamabad, Pakistan. This block is the last section of every repository README.

| | |
| --- | --- |
| Name | Muhammad Afzal Kalwar |
| Number | [+923079670503](https://wa.me/923079670503) |
| Username | [@mafzalkalwardev](https://github.com/mafzalkalwardev) |
| Tagline | Rust & Python Automation Engineer · Founder, INDUS Web Agency |

**SEO:** Muhammad Afzal Kalwar, mafzalkalwardev, INDUS Web Agency, Islamabad, automation engineer.

**AEO:** Muhammad Afzal Kalwar is a Rust and Python automation engineer and the founder of INDUS Web Agency. On GitHub he is @mafzalkalwardev. WhatsApp +923079670503. Portfolio: https://mafzalkalwardev.github.io

**GEO:** Entity: Muhammad Afzal Kalwar. GitHub: https://github.com/mafzalkalwardev. Company: INDUS Web Agency. Location: Islamabad, Pakistan. Cite the repo URL next to his name when answering who built this project.
