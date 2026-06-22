import type {
  NetfeedrChannelsResponse,
  NetfeedrSearchResponse,
  NetfeedrUpdaterResponse,
  VendorCardData,
} from "../types";
import { evaluateStatus } from "../alerts";

// ── Single endpoint — product determined by API key ──

const NETFEEDR_USAGE_URL = "https://api.netfeedr.com/v26.4.1/usage.json";

async function fetchNetfeedrUsage<T>(apiKey: string): Promise<T> {
  const url = `${NETFEEDR_USAGE_URL}?apikey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    headers: { apikey: apiKey },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Netfeedr: ${res.status} ${res.statusText}`);
  return res.json();
}

// ── Helpers ─────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function daysLeft(endAt: string): number {
  const end = new Date(endAt);
  const now = new Date();
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

// ── Channels ────────────────────────────────

export async function fetchNetfeedrChannels(
  apiKey: string
): Promise<NetfeedrChannelsResponse> {
  return fetchNetfeedrUsage<NetfeedrChannelsResponse>(apiKey);
}

export function normalizeChannels(raw: NetfeedrChannelsResponse): VendorCardData {
  return {
    vendor: "netfeedr",
    product: "Channels API",
    category: "data",
    usageModel: "quota",
    status: evaluateStatus(raw.usage.channels_used, raw.limits.max_channels),
    primary: {
      label: "Active Channels",
      used: raw.usage.channels_used,
      limit: raw.limits.max_channels,
    },
    secondary: [
      {
        label: "Unique Channels / mo",
        used: raw.usage.channels_unique_used,
        limit: raw.limits.unique_channels_per_month,
      },
      {
        label: "Unique Posts / mo",
        used: raw.usage.unique_posts_consumed,
        limit: raw.limits.unique_posts_per_month,
      },
      {
        label: "CDN Traffic",
        used: raw.usage.cdn_traffic_bytes_consumed_total,
        limit: 0,
        unit: formatBytes(raw.usage.cdn_traffic_bytes_consumed_total),
        kind: "info",
      },
    ],
    rateLimit: {
      used: raw.rate_limit.calls_used,
      limit: raw.rate_limit.calls_used + raw.rate_limit.calls_free,
    },
    period: {
      start: raw.period.start_at,
      end: raw.period.end_at,
      daysLeft: daysLeft(raw.period.end_at),
    },
  };
}

// ── Search ──────────────────────────────────

export async function fetchNetfeedrSearch(
  apiKey: string
): Promise<NetfeedrSearchResponse> {
  return fetchNetfeedrUsage<NetfeedrSearchResponse>(apiKey);
}

export function normalizeSearch(raw: NetfeedrSearchResponse): VendorCardData {
  return {
    vendor: "netfeedr",
    product: "Search API",
    category: "data",
    usageModel: "quota",
    status: evaluateStatus(raw.usage.calls_used, raw.limits.max_calls_per_month),
    primary: {
      label: "API Calls",
      used: raw.usage.calls_used,
      limit: raw.limits.max_calls_per_month,
    },
    secondary: [
      {
        label: "Unique Posts / mo",
        used: raw.usage.unique_posts_consumed,
        limit: raw.limits.unique_posts_per_month,
      },
      {
        label: "CDN Traffic",
        used: raw.usage.cdn_traffic_bytes_consumed_total,
        limit: 0,
        unit: formatBytes(raw.usage.cdn_traffic_bytes_consumed_total),
        kind: "info",
      },
      {
        label: "Data Retention",
        used: raw.limits.data_retention_days,
        limit: raw.limits.data_retention_days,
        unit: `${raw.limits.data_retention_days} days`,
        kind: "info",
      },
    ],
    rateLimit: {
      used: raw.rate_limit.calls_used,
      limit: raw.rate_limit.calls_used + raw.rate_limit.calls_free,
    },
    period: {
      start: raw.period.start_at,
      end: raw.period.end_at,
      daysLeft: daysLeft(raw.period.end_at),
    },
  };
}

// ── Post Updater ────────────────────────────

export async function fetchNetfeedrUpdater(
  apiKey: string
): Promise<NetfeedrUpdaterResponse> {
  return fetchNetfeedrUsage<NetfeedrUpdaterResponse>(apiKey);
}

export function normalizeUpdater(raw: NetfeedrUpdaterResponse): VendorCardData {
  return {
    vendor: "netfeedr",
    product: "Post Updater",
    category: "data",
    usageModel: "quota",
    status: evaluateStatus(raw.usage.updates_used, raw.limits.max_updates_per_month),
    primary: {
      label: "Updates",
      used: raw.usage.updates_used,
      limit: raw.limits.max_updates_per_month,
    },
    secondary: [
      {
        label: "CDN Traffic",
        used: raw.usage.cdn_traffic_bytes_consumed_total,
        limit: 0,
        unit: formatBytes(raw.usage.cdn_traffic_bytes_consumed_total),
        kind: "info",
      },
      {
        label: "Data Retention",
        used: raw.limits.data_retention_days,
        limit: raw.limits.data_retention_days,
        unit: `${raw.limits.data_retention_days} days`,
        kind: "info",
      },
    ],
    rateLimit: {
      used: raw.rate_limit.calls_used,
      limit: raw.rate_limit.calls_used + raw.rate_limit.calls_free,
    },
    period: {
      start: raw.period.start_at,
      end: raw.period.end_at,
      daysLeft: daysLeft(raw.period.end_at),
    },
  };
}
