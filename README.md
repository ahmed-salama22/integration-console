# Vendor Quota Dashboard

Monitor data vendor API usage across Lucidya environments.

## Quick Start

```bash
# Install dependencies
npm install

# Copy env template and fill in your keys
cp .env.example .env.local

# open the file with vi, vim, or ui and add your data vendors keys
vim .env.local 

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture

```
app/
├── api/
│   ├── usage/route.ts          ← Unified endpoint: fetches all vendors for an env
│   └── config-status/route.ts  ← Returns which env vars are set (no values exposed)
├── components/
│   ├── VendorCard.tsx           ← Renders a single vendor product card
│   ├── QuotaBar.tsx             ← Horizontal progress bar
│   └── StatusDot.tsx            ← Green/yellow/red status indicator
├── settings/page.tsx            ← Settings page showing config status
├── page.tsx                     ← Main dashboard
├── layout.tsx                   ← Root layout with Lucidya header
└── globals.css                  ← Tailwind v4 + Lucidya brand tokens

lib/
├── types.ts                     ← Shared TypeScript types
├── config.ts                    ← Resolves env vars per environment
├── format.ts                    ← Number formatting utilities
└── vendors/
    ├── x.ts                     ← X API adapter (fetch + normalize)
    └── netfeedr.ts              ← Netfeedr adapter (channels, search, updater)
```

## Environments

| Environment   | Description                          |
|---------------|--------------------------------------|
| Lucidya CXM   | Own X + Netfeedr subscriptions       |
| Site          | Own X + Netfeedr (shared w/ vendors) |

## Vendors

### X (Twitter)
- **Endpoint:** `GET /2/usage/tweets`
- **Metrics:** posts consumed, daily project usage, per-app breakdown
- **Billing cycle:** resets on `cap_reset_day` of each month

### Netfeedr
- **Channels API:** active channels, unique channels/mo, unique posts/mo
- **Search API:** API calls/mo, unique posts/mo
- **Post Updater:** updates/mo

## Adding a New Vendor

1. Create `lib/vendors/newvendor.ts` with fetch + normalize functions
2. Add types to `lib/types.ts`
3. Add env vars to `lib/config.ts`
4. Wire into `app/api/usage/route.ts`
