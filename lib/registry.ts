import { WARNING_PCT, CRITICAL_PCT } from "./alerts";
import type { UsageModel, VendorCardData, VendorCategory } from "./types";

// ── F1 — Vendor registry ────────────────────
// Declarative catalog of which vendor products exist, their usage model, the
// adapter that fetches them, refresh cadence, and alert thresholds. Credential
// resolution still lives in lib/config.ts (env-prefix based); this registry is
// the metadata layer the dashboard groups and badges by.
//
// Thresholds are expressed as whole percentages here for readability, but the
// live status of a card is computed by `evaluateStatus` in lib/alerts.ts — the
// single source of truth — so these values mirror the global defaults.

export interface VendorConfig {
  vendor: string;
  displayName: string;
  category: VendorCategory;
  usageModel: UsageModel;
  enabled: boolean;
  adapterFn: string;
  refreshIntervalMinutes: number;
  thresholds: { warning: number; critical: number } | null;
}

const GLOBAL_THRESHOLDS = {
  warning: Math.round(WARNING_PCT * 100),
  critical: Math.round(CRITICAL_PCT * 100),
};

export const VENDOR_REGISTRY: VendorConfig[] = [
  {
    vendor: "x",
    displayName: "X (Twitter)",
    category: "social",
    usageModel: "quota",
    enabled: true,
    adapterFn: "normalizeXUsage",
    refreshIntervalMinutes: 30,
    thresholds: GLOBAL_THRESHOLDS,
  },
  {
    vendor: "netfeedr-search",
    displayName: "Netfeedr Search",
    category: "data",
    usageModel: "quota",
    enabled: true,
    adapterFn: "normalizeSearch",
    refreshIntervalMinutes: 30,
    thresholds: GLOBAL_THRESHOLDS,
  },
  {
    vendor: "netfeedr-channels",
    displayName: "Netfeedr Channels",
    category: "data",
    usageModel: "quota",
    enabled: true,
    adapterFn: "normalizeChannels",
    refreshIntervalMinutes: 30,
    thresholds: GLOBAL_THRESHOLDS,
  },
  {
    vendor: "netfeedr-post-updates",
    displayName: "Netfeedr Post Updates",
    category: "data",
    usageModel: "quota",
    enabled: true,
    adapterFn: "normalizeUpdater",
    refreshIntervalMinutes: 30,
    thresholds: GLOBAL_THRESHOLDS,
  },
  {
    vendor: "emedia",
    displayName: "eMedia (TV & Radio)",
    category: "data",
    usageModel: "fixed-subscription",
    enabled: true,
    adapterFn: "normalizeEMedia",
    refreshIntervalMinutes: 1440, // once per day — catalog, not consumption
    thresholds: null,
  },
  {
    vendor: "datashake",
    displayName: "Datashake",
    category: "data",
    usageModel: "quota",
    enabled: false,
    adapterFn: "adaptDatashake",
    refreshIntervalMinutes: 30,
    thresholds: GLOBAL_THRESHOLDS,
  },
];

// ── Dashboard grouping ──────────────────────
// Cards are grouped under uppercase headers. Grouping mixes usage model and
// category: anything fixed-subscription lands under "Fixed subscriptions",
// everything else falls to its category bucket.

export type GroupId = "data" | "social" | "fixed-subscriptions" | "messaging";

export const DISPLAY_GROUPS: { id: GroupId; label: string }[] = [
  { id: "data", label: "Data Vendors" },
  { id: "social", label: "Social Platforms" },
  { id: "fixed-subscriptions", label: "Fixed Subscriptions" },
  { id: "messaging", label: "Messaging" },
];

export function groupForCard(card: VendorCardData): GroupId {
  if (card.usageModel === "fixed-subscription") return "fixed-subscriptions";
  if (card.category === "social") return "social";
  if (card.category === "messaging") return "messaging";
  return "data";
}
