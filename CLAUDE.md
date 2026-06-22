# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # install dependencies
npm run dev        # start dev server at http://localhost:3000
npm run build      # production build
npm run start      # serve production build
```

There is no test suite, linter, or formatter configured. API keys live in `.env.local` (copy from `.env.example`); the dev server reads them at runtime.

## What this is

A Next.js 15 (App Router) + React 19 dashboard that monitors data-vendor API quota usage across two Lucidya environments (`cxm` = Lucidya CXM, `site` = Site). It is read-only: it fetches live usage from vendor APIs server-side and renders quota cards. There is no database and no persisted state.

## Architecture

The core pattern is **fetch raw → normalize → render a unified card**. Every vendor product, regardless of its API shape, is collapsed into a single `VendorCardData` shape (`lib/types.ts`) so the UI never knows vendor specifics.

Request flow:
1. Client (`app/page.tsx`) calls `GET /api/usage?env=<cxm|site>` and re-fetches on env switch / Refresh.
2. `app/api/usage/route.ts` resolves per-env credentials via `getEnvConfig`, then for each configured vendor calls its `fetch*` + `normalize*` pair. Each vendor is wrapped in its own try/catch — one vendor failing pushes to `errors[]` but does not break the others. Returns `{ environment, configStatus, data: VendorCardData[], errors, fetchedAt }`.
3. Vendor adapters in `lib/vendors/` own all vendor-specific logic: `fetch*` hits the external API (with `next: { revalidate: 300 }` 5-min server cache), `normalize*` maps the raw response into `VendorCardData` (including computing `status` thresholds and `daysLeft`).

Two things to know when touching this flow:
- **Status thresholds live in `lib/alerts.ts`** (single source of truth). `evaluateStatus(used, limit)` returns `ok`/`warning`/`critical` (warning ≥ 0.7, critical ≥ 0.9, **over-limit always critical**); both vendor adapters and `QuotaBar` call it. Thresholds are overridable via `NEXT_PUBLIC_ALERT_WARNING_PCT` / `NEXT_PUBLIC_ALERT_CRITICAL_PCT` (NEXT_PUBLIC_ so server and client agree). A card's overall status (`card.status`, the dot/accent, and `StatusSummary`) is driven **only by its primary metric** — each adapter sets `status` from the product's headline quota (X posts, Netfeedr active channels / API calls). Secondary metrics still render their own colored `QuotaBar`, but never escalate the card.
- **Credential resolution is prefix-based**: `getEnvConfig`/`getConfigStatus` (`lib/config.ts`) build env-var names from a `CXM_` / `SITE_` prefix. Adding an environment means adding the prefix mapping in both functions and the `ENVIRONMENTS` array in `lib/types.ts`.

## Vendor specifics

- **X (Twitter)** — single endpoint `GET /2/usage/tweets`, Bearer auth. `normalizeXUsage` filters `daily_project_usage` and per-app usage to the **current billing period only**, derived from `cap_reset_day` (not a date the API returns — it's computed). `CXM_X_APP_MAP` is a JSON string mapping client-app IDs to human names; parse failures are swallowed and fall back to `App <id>`.
- **Netfeedr** — all three products (Channels, Search, Post Updater) hit the **same** endpoint `GET /v26.4.1/usage.json`; the product returned is determined entirely by which **API key** is sent. That's why there are three separate `*_API_KEY` env vars per environment. Each product has a distinct response shape and its own `normalize*` function.

## Adding a new vendor

1. Add the raw-response and confirm `VendorCardData` covers your fields in `lib/types.ts`.
2. Create `lib/vendors/<name>.ts` with `fetch*` + `normalize*` (mirror an existing adapter; call `evaluateStatus` from `lib/alerts.ts`, set `revalidate: 300`, and tag value-only metrics like CDN/retention with `kind: "info"` so they render without a gauge).
3. Add the env vars + a `configStatus` flag in `lib/config.ts`.
4. Wire a guarded `if (configStatus.x) { try { … } catch { errors.push(…) } }` block into `app/api/usage/route.ts`.

## Conventions

- Path alias `@/*` maps to the repo root (e.g. `@/lib/types`).
- Styling is **Tailwind v4** via CSS (`app/globals.css`) — there is no `tailwind.config.js`. Brand colors are defined as `@theme` tokens (`navy`, `blue-mid`, `gray-text`, etc.) and used directly as utility classes like `bg-navy` / `text-gray-text`.
- API routes never expose secret values; `/api/config-status` and the `configStatus` field return only booleans for whether each key is set.
