# Integrations Console

A single operational view of Lucidya's third-party dependencies — **data vendors**,
**AI services**, and **infrastructure health** — so the technical-support team can spot
exhausted quotas, failing AI calls, or provider outages without logging into a dozen
portals.

It is read-only: usage is fetched live from each provider's API server-side and normalized
into a unified UI. No database, no persisted state.

## Quick Start

```bash
npm install               # install dependencies
cp .env.example .env.local # copy env template and fill in your keys - no dashboard without keys ( except AI because it doesn't have keys right now)
vim .env.local            # add vendor / AI / infra credentials
npm run dev               # start dev server
```

Open [http://localhost:3000](http://localhost:3000). (`npm run build` + `npm run start` for production.)

## Sections

The top nav has three sections:

### 1. Data Vendors  (`/`)
Per-environment quota monitoring with a **CXM / Site** toggle and a tab per vendor.

| Vendor | What it shows | Usage model |
|--------|---------------|-------------|
| **X (Twitter)** | Posts consumed vs cap, per-app donut, daily trend | Quota (resets on `cap_reset_day`) |
| **Netfeedr** | Channels / Search / Post Updater — calls, channels, updates, rate limits | Quota |
| **eMedia (TV & Radio)** | Full searchable channel catalogue (TV/Radio, language, country) | Fixed subscription |
| **Datashake** | Placeholder — awaiting vendor endpoint | — |

Status thresholds (warning ≥ 60%, critical ≥ 80%, over-limit always critical) live in
`lib/alerts.ts`. Clicking an alert in the summary jumps to and spotlights the card.

### 2. AI Services  (`/ai-services`)
Usage for all LLM traffic, fronted by Lucidya's self-hosted **LiteLLM** proxy, with a
**Staging / Production** toggle (one proxy each). Shows token usage, request counts
(successful / failed), and per-provider/model breakdown + best-effort health.

> Ships with **static sample data** (mirrors the live dashboard) until both proxies are
> reachable with working keys. Set `LITELLM_LIVE=1` to query the real proxy instead.

### 3. Infrastructure Services  (`/infrastructure`)
Service-level health for the platforms Lucidya runs on. Fetched once on load; manual refresh.

| Provider | Source | Scope |
|----------|--------|-------|
| **CloudFlare** | Statuspage `components.json` | All services |
| **AWS Ireland** | One RSS feed per service | eu-west-1 (EC2, RDS, Lambda, EKS, ELB, NAT, S3, CloudFront…) |
| **GCP Saudi Arabia** | `incidents.json` matched to our products | me-central2 (feed is global) |

## Architecture

Core pattern: **fetch raw → normalize → render a unified card.** Each provider adapter owns
its API specifics; the UI never knows them. Every fetch is wrapped per-provider so one
failure never sinks the others.

```
app/
├── api/
│   ├── usage/route.ts          ← Data Vendors: all vendors for an env
│   ├── ai-services/route.ts    ← AI Services: LiteLLM proxy (per env)
│   ├── infra/route.ts          ← Infrastructure: all providers
│   └── config-status/route.ts  ← Which env vars are set (booleans only)
├── components/
│   ├── DataVendorsView.tsx     ← Data Vendors section (env toggle + vendor tabs)
│   ├── AiServicesView.tsx      ← AI Services section (staging/prod toggle)
│   ├── InfrastructureView.tsx  ← Infrastructure section (service-level cards)
│   ├── VendorCard.tsx          ← Unified vendor card (gauge / headline / placeholder)
│   ├── AppDonutChart.tsx       ← X per-app split
│   ├── ChannelList.tsx         ← eMedia searchable channel list
│   ├── DailyTrendCard.tsx      ← Daily usage bar chart
│   ├── StatusSummary.tsx       ← Alert strip (click → spotlight card)
│   ├── EnvToggle.tsx · QuotaBar · StatusDot · UsageModelBadge · Freshness · LoadingBar · Header
├── page.tsx · ai-services/page.tsx · infrastructure/page.tsx · settings/page.tsx
├── layout.tsx · EnvContext.tsx · globals.css   (Tailwind v4 + brand tokens)

lib/
├── types.ts      ← Shared types (VendorCardData, etc.)
├── config.ts     ← Per-env vendor credential resolution (CXM_/SITE_ prefixes)
├── alerts.ts     ← Status thresholds (single source of truth)
├── registry.ts   ← Vendor registry + dashboard grouping
├── infra.ts      ← Infra registry + per-provider parsers
├── litellm.ts    ← AI Services: per-env config, fetch, normalize, sample data
├── format.ts     ← Number formatting
└── vendors/      ← x.ts · netfeedr.ts · emedia.ts · datashake.ts

public/infra/     ← aws.svg · cloudflare.svg · gcp.svg
```

## Environment variables

See `.env.example` for the full template. Credentials are server-side only; the UI never
receives raw values. Highlights:

- **Data Vendors** (per env, `CXM_` / `SITE_` prefix): `*_X_BEARER_TOKEN`, `*_NETFEEDR_*_API_KEY`,
  `*_EMEDIA_USERNAME` / `*_EMEDIA_PASSWORD`.
- **AI Services** (per LiteLLM env): `LITELLM_STAGING_PROXY_URL` / `LITELLM_STAGING_API_KEY`,
  `LITELLM_PROD_PROXY_URL` / `LITELLM_PROD_API_KEY`, and `LITELLM_LIVE=1` to leave sample mode.
- **Thresholds** (optional): `NEXT_PUBLIC_ALERT_WARNING_PCT`, `NEXT_PUBLIC_ALERT_CRITICAL_PCT`.

Infrastructure feeds need no credentials (public status pages).

## Adding a new data vendor

1. Create `lib/vendors/<name>.ts` with `fetch*` + `normalize*` (mirror an existing adapter;
   call `evaluateStatus` from `lib/alerts.ts`).
2. Add types to `lib/types.ts` and credentials to `lib/config.ts`.
3. Wire a guarded `try/catch` block into `app/api/usage/route.ts`.
4. Add it to the vendor tabs in `app/components/DataVendorsView.tsx`.
```
