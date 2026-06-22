// ── Environments ────────────────────────────

export type Environment = "cxm" | "site";

export const ENVIRONMENTS: { id: Environment; label: string }[] = [
  { id: "cxm", label: "Lucidya CXM" },
  { id: "site", label: "Site" },
];

// ── X (Twitter) types ───────────────────────

export interface XDailyUsage {
  date: string;
  usage: string | number;
}

export interface XClientAppUsage {
  client_app_id: string;
  usage: XDailyUsage[];
  usage_result_count: number;
}

export interface XUsageResponse {
  data: {
    cap_reset_day: number;
    project_cap: string | number;
    project_id: string;
    project_usage: string | number;
    daily_project_usage?: {
      project_id: string;
      usage: XDailyUsage[];
    };
    daily_client_app_usage?: XClientAppUsage[];
  };
  errors?: { title: string; detail: string; status: number }[];
}

// ── Netfeedr types ──────────────────────────

export interface NetfeedrChannelsResponse {
  product: { name: string; package: string };
  period: { start_at: string; end_at: string };
  limits: {
    max_calls_per_minute: number;
    max_channels: number;
    unique_channels_per_month: number;
    unique_posts_per_month: number;
  };
  usage: {
    channels_used: number;
    channels_free: number;
    channels_unique_used: number;
    channels_unique_free: number;
    unique_posts_consumed: number;
    cdn_traffic_bytes_consumed_total: number;
    cdn_traffic_bytes_consumed_images: number;
    cdn_traffic_bytes_consumed_videos: number;
  };
  rate_limit: { calls_used: number; calls_free: number };
}

export interface NetfeedrSearchResponse {
  product: { name: string; package: string };
  period: { start_at: string; end_at: string };
  limits: {
    max_calls_per_month: number;
    max_calls_per_minute: number;
    data_retention_days: number;
    unique_posts_per_month: number;
  };
  usage: {
    calls_used: number;
    calls_free: number;
    unique_posts_consumed: number;
    cdn_traffic_bytes_consumed_total: number;
    cdn_traffic_bytes_consumed_images: number;
    cdn_traffic_bytes_consumed_videos: number;
  };
  rate_limit: { calls_used: number; calls_free: number };
}

export interface NetfeedrUpdaterResponse {
  product: { name: string; package: string };
  period: { start_at: string; end_at: string };
  limits: {
    max_updates_per_month: number;
    max_calls_per_minute: number;
    data_retention_days: number;
  };
  usage: {
    updates_used: number;
    updates_free: number;
    cdn_traffic_bytes_consumed_total: number;
    cdn_traffic_bytes_consumed_images: number;
    cdn_traffic_bytes_consumed_videos: number;
  };
  rate_limit: { calls_used: number; calls_free: number };
}

// ── eMedia (TV & Radio) types ───────────────

export interface EMediaChannel {
  id: string | number;
  name: string;
  type?: string;
  language?: string;
  country?: string;
  mediaType: number; // 1 = TV, 2 = Radio
  owner?: string;
  scope?: string;
}

export interface EMediaResponse {
  data: EMediaChannel[];
}

// ── Normalized dashboard data ───────────────

/** Broad bucket used for dashboard grouping + the usage-model badge. */
export type VendorCategory = "social" | "data" | "messaging" | "infrastructure";
export type UsageModel = "quota" | "rate-limited" | "fixed-subscription" | "unknown";

export interface ChannelRow {
  id: string | number;
  name: string;
  type: string; // "TV" | "FM Radio" | "AM Radio" | ...
  mediaType: number; // 1 = TV, 2 = Radio
  country?: string;
  language?: string;
  city?: string;
}

export interface QuotaMetric {
  label: string;
  used: number;
  limit: number;
  unit?: string;
  /**
   * How to render this metric. "quota" → value + gauge bar (default).
   * "info" → value only, de-emphasized (e.g. CDN traffic, data retention).
   * Each vendor adapter tags its fields so differing responses render right.
   */
  kind?: "quota" | "info";
}

export interface VendorCardData {
  vendor: "x" | "netfeedr" | "emedia" | "datashake";
  product: string;
  package?: string;
  category: VendorCategory;
  usageModel: UsageModel;
  status: "ok" | "warning" | "critical";
  primary: QuotaMetric;
  secondary: QuotaMetric[];
  rateLimit?: { used: number; limit: number };
  period?: { start: string; end: string; daysLeft: number };
  dailyUsage?: { date: string; value: number }[];
  appBreakdown?: { appId: string; appName: string; usage: number }[];
  /** Fixed-subscription headline (e.g. eMedia "121 channels") shown instead of a gauge. */
  headline?: { value: string; sub?: string };
  /** Full item list for catalogue vendors (eMedia TV & Radio channels). */
  channels?: ChannelRow[];
  /** Placeholder cards (e.g. Datashake) render disabled — no live data yet. */
  placeholder?: boolean;
}
