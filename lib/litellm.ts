// ── AI Services — LiteLLM proxy ─────────────
// Lucidya's AI platforms sit behind a LiteLLM proxy (OpenAI-compatible gateway).
// This module pulls per-model/provider health + token usage + request counts.
// Self-contained (config + fetch + normalize), mirroring lib/infra.ts.
//
// All requests use the proxy key as a Bearer token. The configured key is a
// VIRTUAL key (not master), so admin endpoints (e.g. /health) may 401 — health
// is therefore best-effort and degrades to "unknown".

// Two self-hosted LiteLLM proxies: one per deployment environment.
export type AiEnv = "staging" | "production";

export const AI_ENVIRONMENTS: { id: AiEnv; label: string }[] = [
  { id: "staging", label: "Staging" },
  { id: "production", label: "Production" },
];

export type AiState = "up" | "down" | "unknown";

export interface AiModelRow {
  model: string;
  provider: string;
  status: AiState;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requests: number;
  successful: number;
  failed: number;
}

export interface AiProviderGroup {
  provider: string;
  status: AiState;
  totalTokens: number;
  requests: number;
  successful: number;
  failed: number;
  models: AiModelRow[];
}

export interface AiTotals {
  totalTokens: number;
  requests: number;
  successful: number;
  failed: number;
}

export interface AiServicesData {
  environment: AiEnv;
  configured: boolean;
  /** True when the numbers are the built-in static sample, not live proxy data. */
  sample: boolean;
  providers: AiProviderGroup[];
  totals: AiTotals;
  period: { start: string; end: string };
  daily: { date: string; requests: number; tokens: number }[];
  checkedAt: string;
  errors: string[];
}

// ── Config (per deployment environment) ──────
// Env vars are prefixed by environment, e.g. LITELLM_STAGING_PROXY_URL.

function getConfig(env: AiEnv) {
  const prefix = env === "production" ? "PROD" : "STAGING";
  const base = (process.env[`LITELLM_${prefix}_PROXY_URL`] || "").replace(/\/$/, "");
  const key = process.env[`LITELLM_${prefix}_API_KEY`] || "";
  return { base, key };
}

export function isLiteLLMConfigured(env: AiEnv): boolean {
  const { base, key } = getConfig(env);
  return !!base && !!key;
}

// ── Helpers ─────────────────────────────────

function providerOf(litellmModel: string | undefined, fallback: string): string {
  // litellm_params.model looks like "openai/gpt-4o" or "bedrock/anthropic.claude…".
  if (litellmModel && litellmModel.includes("/")) return litellmModel.split("/")[0];
  return fallback || "other";
}

function authHeaders(key: string) {
  return { Authorization: `Bearer ${key}`, Accept: "application/json" };
}

function num(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

// ── Fetchers (each tolerant; never throw to caller) ──

interface ModelInfoEntry {
  model_name?: string;
  litellm_params?: { model?: string };
}

/** model_name → provider, from /v1/model/info. */
async function fetchModelProviders(
  base: string,
  key: string
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const res = await fetch(`${base}/v1/model/info`, {
    headers: authHeaders(key),
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`model/info: ${res.status}`);
  const json = await res.json();
  const data: ModelInfoEntry[] = Array.isArray(json) ? json : json?.data ?? [];
  for (const m of data) {
    if (!m.model_name) continue;
    map.set(m.model_name, providerOf(m.litellm_params?.model, "other"));
  }
  return map;
}

interface HealthResponse {
  healthy_endpoints?: { model?: string }[];
  unhealthy_endpoints?: { model?: string }[];
}

/** deployment model → up/down, from /health (may be admin-only → caller catches). */
async function fetchHealth(base: string, key: string): Promise<Map<string, AiState>> {
  const map = new Map<string, AiState>();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12_000); // /health hits providers; cap it
  try {
    const res = await fetch(`${base}/health`, {
      headers: authHeaders(key),
      next: { revalidate: 300 },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`health: ${res.status}`);
    const json: HealthResponse = await res.json();
    for (const e of json.healthy_endpoints ?? []) if (e.model) map.set(e.model, "up");
    for (const e of json.unhealthy_endpoints ?? []) if (e.model) map.set(e.model, "down");
    return map;
  } finally {
    clearTimeout(t);
  }
}

interface ActivityMetrics {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  api_requests?: number;
  successful_requests?: number;
  failed_requests?: number;
}
interface ActivityBreakdownItem {
  metrics?: ActivityMetrics;
}
interface ActivityResult {
  date?: string;
  metrics?: ActivityMetrics;
  breakdown?: {
    models?: Record<string, ActivityBreakdownItem>;
    providers?: Record<string, ActivityBreakdownItem>;
  };
}
interface ActivityResponse {
  results?: ActivityResult[];
}

interface ModelUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requests: number;
  successful: number;
  failed: number;
}

function addUsage(map: Map<string, ModelUsage>, name: string, m: ActivityMetrics) {
  const cur = map.get(name) ?? {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    requests: 0,
    successful: 0,
    failed: 0,
  };
  cur.promptTokens += num(m.prompt_tokens);
  cur.completionTokens += num(m.completion_tokens);
  cur.totalTokens += num(m.total_tokens);
  cur.requests += num(m.api_requests);
  cur.successful += num(m.successful_requests);
  cur.failed += num(m.failed_requests);
  map.set(name, cur);
}

/**
 * Usage from /user/daily/activity — the endpoint confirmed to work with the
 * virtual key. Returns per-model AND per-provider aggregates (both come straight
 * from the response's own breakdown) plus the daily trend.
 */
async function fetchActivity(
  base: string,
  key: string,
  start: string,
  end: string
): Promise<{
  byModel: Map<string, ModelUsage>;
  byProvider: Map<string, ModelUsage>;
  daily: { date: string; requests: number; tokens: number }[];
}> {
  const url = `${base}/user/daily/activity?start_date=${start}&end_date=${end}`;
  const res = await fetch(url, { headers: authHeaders(key), next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`daily/activity: ${res.status}`);
  const json: ActivityResponse = await res.json();

  const byModel = new Map<string, ModelUsage>();
  const byProvider = new Map<string, ModelUsage>();
  const daily: { date: string; requests: number; tokens: number }[] = [];

  for (const r of json.results ?? []) {
    const m = r.metrics ?? {};
    daily.push({
      date: r.date ?? "",
      requests: num(m.api_requests),
      tokens: num(m.total_tokens),
    });
    for (const [name, item] of Object.entries(r.breakdown?.models ?? {})) {
      addUsage(byModel, name, item.metrics ?? {});
    }
    for (const [name, item] of Object.entries(r.breakdown?.providers ?? {})) {
      addUsage(byProvider, name, item.metrics ?? {});
    }
  }
  daily.sort((a, b) => a.date.localeCompare(b.date));
  return { byModel, byProvider, daily };
}

// ── Orchestrator ────────────────────────────

const RANK: Record<AiState, number> = { down: 3, up: 2, unknown: 1 };
function rollup(states: AiState[]): AiState {
  if (states.some((s) => s === "down")) return "down";
  if (states.length && states.every((s) => s === "up")) return "up";
  return states.includes("up") ? "up" : "unknown";
}

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export async function getAiServices(env: AiEnv, days = 30): Promise<AiServicesData> {
  const checkedAt = new Date().toISOString();

  // Static sample mode (default) — used until both proxies' keys + network access
  // are confirmed. Flip LITELLM_LIVE=1 to query the real proxy instead.
  if (process.env.LITELLM_LIVE !== "1") {
    return { ...sampleAiServices(env), checkedAt };
  }

  const { base, key } = getConfig(env);
  const errors: string[] = [];

  if (!base || !key) {
    return {
      environment: env,
      configured: false,
      sample: false,
      providers: [],
      totals: { totalTokens: 0, requests: 0, successful: 0, failed: 0 },
      period: { start: "", end: "" },
      daily: [],
      checkedAt,
      errors: [],
    };
  }

  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const period = { start: isoDate(start), end: isoDate(end) };

  // Usage from /user/daily/activity is the source of truth (works with the
  // virtual key). model/info + health are best-effort enhancements that the
  // virtual key may be denied — their failure is silent, not an error.
  const [activityRes, providersRes, healthRes] = await Promise.allSettled([
    fetchActivity(base, key, period.start, period.end),
    fetchModelProviders(base, key),
    fetchHealth(base, key),
  ]);

  if (activityRes.status === "rejected") {
    errors.push(`usage: ${String(activityRes.reason?.message ?? activityRes.reason)}`);
  }
  const usageByModel =
    activityRes.status === "fulfilled" ? activityRes.value.byModel : new Map<string, ModelUsage>();
  const usageByProvider =
    activityRes.status === "fulfilled" ? activityRes.value.byProvider : new Map<string, ModelUsage>();
  const daily = activityRes.status === "fulfilled" ? activityRes.value.daily : [];

  const providerByModel =
    providersRes.status === "fulfilled" ? providersRes.value : new Map<string, string>();
  const healthByModel =
    healthRes.status === "fulfilled" ? healthRes.value : new Map<string, AiState>();

  // Build per-model rows (from activity), assigning each to a provider via the
  // model/info map when available, else "other".
  const rows: AiModelRow[] = [...usageByModel.entries()].map(([model, u]) => ({
    model,
    provider: providerByModel.get(model) ?? "other",
    status: healthByModel.get(model) ?? "unknown",
    promptTokens: u.promptTokens,
    completionTokens: u.completionTokens,
    totalTokens: u.totalTokens,
    requests: u.requests,
    successful: u.successful,
    failed: u.failed,
  }));

  const modelsByProvider = new Map<string, AiModelRow[]>();
  for (const r of rows) {
    const g = modelsByProvider.get(r.provider) ?? [];
    g.push(r);
    modelsByProvider.set(r.provider, g);
  }

  // Provider list = union of providers seen in activity's provider-breakdown and
  // any provider we grouped models under. Provider-level totals prefer the
  // authoritative provider-breakdown; fall back to summing its model rows.
  const providerNames = new Set<string>([
    ...usageByProvider.keys(),
    ...modelsByProvider.keys(),
  ]);

  const providers: AiProviderGroup[] = [...providerNames]
    .map((provider) => {
      const models = (modelsByProvider.get(provider) ?? []).sort(
        (a, b) => b.requests - a.requests || a.model.localeCompare(b.model)
      );
      const agg = usageByProvider.get(provider);
      const sum = (f: (m: AiModelRow) => number) => models.reduce((s, m) => s + f(m), 0);
      return {
        provider,
        status: rollup(models.map((m) => m.status)),
        totalTokens: agg?.totalTokens ?? sum((m) => m.totalTokens),
        requests: agg?.requests ?? sum((m) => m.requests),
        successful: agg?.successful ?? sum((m) => m.successful),
        failed: agg?.failed ?? sum((m) => m.failed),
        models,
      };
    })
    .sort((a, b) => b.requests - a.requests || a.provider.localeCompare(b.provider));

  // Totals prefer the provider-breakdown sum; fall back to model rows.
  const src = usageByProvider.size ? [...usageByProvider.values()] : [...usageByModel.values()];
  const totals: AiTotals = {
    totalTokens: src.reduce((s, u) => s + u.totalTokens, 0),
    requests: src.reduce((s, u) => s + u.requests, 0),
    successful: src.reduce((s, u) => s + u.successful, 0),
    failed: src.reduce((s, u) => s + u.failed, 0),
  };

  return { environment: env, configured: true, sample: false, providers, totals, period, daily, checkedAt, errors };
}

// ── Static sample (from the LiteLLM dashboard) ──
// Used until both proxies are reachable with working keys. Numbers mirror the
// real staging dashboard so the section demos faithfully. Marked sample:true.
function sampleAiServices(env: AiEnv): AiServicesData {
  const period = { start: "2026-05-23", end: "2026-06-22" };

  const defs: { model: string; provider: string; tokens: number; successful: number }[] = [
    { model: "gpt-4.1-direct", provider: "openai", tokens: 70000, successful: 80 },
    { model: "gpt-4o-mini-direct", provider: "openai", tokens: 18693, successful: 23 },
    { model: "gpt-4o", provider: "openai", tokens: 8000, successful: 10 },
    { model: "gpt-4.1-azure", provider: "azure", tokens: 8469, successful: 13 },
    { model: "claude-haiku-4-5-20251001-v1:0", provider: "bedrock", tokens: 8074, successful: 15 },
  ];

  const rows: AiModelRow[] = defs.map((d) => {
    const promptTokens = Math.round(d.tokens * 0.45);
    return {
      model: d.model,
      provider: d.provider,
      status: "up",
      promptTokens,
      completionTokens: d.tokens - promptTokens,
      totalTokens: d.tokens,
      requests: d.successful,
      successful: d.successful,
      failed: 0,
    };
  });

  const byProvider = new Map<string, AiModelRow[]>();
  for (const r of rows) {
    const g = byProvider.get(r.provider) ?? [];
    g.push(r);
    byProvider.set(r.provider, g);
  }
  const providers: AiProviderGroup[] = [...byProvider.entries()]
    .map(([provider, models]) => {
      models.sort((a, b) => b.requests - a.requests);
      const sum = (f: (m: AiModelRow) => number) => models.reduce((s, m) => s + f(m), 0);
      return {
        provider,
        status: "up" as AiState,
        totalTokens: sum((m) => m.totalTokens),
        requests: sum((m) => m.requests),
        successful: sum((m) => m.successful),
        failed: 0,
        models,
      };
    })
    .sort((a, b) => b.requests - a.requests);

  // Failed requests (276) are unattributed to a provider on the dashboard, so
  // they live only in the totals.
  const totals: AiTotals = { totalTokens: 113236, requests: 417, successful: 141, failed: 276 };

  const dayVals: Record<string, [number, number]> = {
    "2026-06-11": [8, 2000],
    "2026-06-13": [5, 1500],
    "2026-06-14": [6, 1800],
    "2026-06-16": [4, 1200],
    "2026-06-17": [7, 2100],
    "2026-06-21": [350, 100000],
    "2026-06-22": [37, 4636],
  };
  const daily: { date: string; requests: number; tokens: number }[] = [];
  const cur = new Date(`${period.start}T00:00:00Z`);
  const end = new Date(`${period.end}T00:00:00Z`);
  while (cur <= end) {
    const ds = cur.toISOString().split("T")[0];
    const v = dayVals[ds];
    daily.push({ date: ds, requests: v ? v[0] : 0, tokens: v ? v[1] : 0 });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  return {
    environment: env,
    configured: true,
    sample: true,
    providers,
    totals,
    period,
    daily,
    checkedAt: "",
    errors: [],
  };
}
