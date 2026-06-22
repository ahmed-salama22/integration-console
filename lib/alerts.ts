export type Status = "ok" | "warning" | "critical";

// ── Thresholds (single source of truth) ─────
// Read as fractions in (0, 1]. NEXT_PUBLIC_ so the same values are available
// in server adapters AND client components (QuotaBar), keeping every surface
// consistent. Falls back to sensible defaults when unset/invalid.
function pctEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 && n <= 1 ? n : fallback;
}

export const WARNING_PCT = pctEnv("NEXT_PUBLIC_ALERT_WARNING_PCT", 0.7);
export const CRITICAL_PCT = pctEnv("NEXT_PUBLIC_ALERT_CRITICAL_PCT", 0.9);

/** Status for a single used/limit pair. Over-limit is always critical. */
export function evaluateStatus(used: number, limit: number): Status {
  if (limit <= 0) return "ok";
  const pct = used / limit;
  if (pct >= 1 || pct >= CRITICAL_PCT) return "critical";
  if (pct >= WARNING_PCT) return "warning";
  return "ok";
}

// ── Data freshness ──────────────────────────
export const STALE_WARN_MS = 10 * 60 * 1000; // 10 min
export const STALE_CRIT_MS = 30 * 60 * 1000; // 30 min

export function freshnessStatus(ageMs: number): Status {
  if (ageMs >= STALE_CRIT_MS) return "critical";
  if (ageMs >= STALE_WARN_MS) return "warning";
  return "ok";
}
