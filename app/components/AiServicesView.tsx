"use client";

import { useState, useEffect, useCallback } from "react";
import type { AiServicesData, AiState, AiEnv } from "@/lib/litellm";
import { AI_ENVIRONMENTS } from "@/lib/litellm";
import { fmt, fmtCompact } from "@/lib/format";
import { Freshness } from "./Freshness";
import { LoadingBar } from "./LoadingBar";
import { DailyTrendCard } from "./DailyTrendCard";

const STATE_STYLE: Record<AiState, { dot: string; label: string; text: string; ring: string }> = {
  up: { dot: "bg-[#22c55e]", label: "Healthy", text: "text-[#15803d]", ring: "border-l-[#22c55e]" },
  down: { dot: "bg-red", label: "Unhealthy", text: "text-red", ring: "border-l-red" },
  unknown: { dot: "bg-gray-text", label: "Unknown", text: "text-gray-text", ring: "border-l-transparent" },
};

export function AiServicesView() {
  const [env, setEnv] = useState<AiEnv>("staging");
  const [data, setData] = useState<AiServicesData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai-services?env=${env}`);
      setData(await res.json());
    } catch (err) {
      console.error("Failed to fetch AI services:", err);
    } finally {
      setLoading(false);
    }
  }, [env]);

  // Fetch on landing and whenever the environment switches; refresh is manual.
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const providers = data?.providers ?? [];

  return (
    <div>
      <LoadingBar active={loading} />

      {/* Header: env toggle + period + refresh */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="inline-flex rounded-md border border-white/15 bg-navy/40 p-0.5">
            {AI_ENVIRONMENTS.map((e) => {
              const active = e.id === env;
              return (
                <button
                  key={e.id}
                  onClick={() => setEnv(e.id)}
                  className={`px-3.5 py-1.5 text-sm font-medium rounded transition-colors ${
                    active ? "bg-white text-navy" : "text-blue-light/70 hover:text-white"
                  }`}
                >
                  {e.label}
                </button>
              );
            })}
          </div>
          <p className="text-sm text-blue-light/60">
            {data?.configured && data.period.start
              ? `Usage ${data.period.start} → ${data.period.end} · via LiteLLM`
              : "Powered by the LiteLLM proxy"}
          </p>
          {data?.sample && (
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#b45309]"
              title="Static sample data — set LITELLM_LIVE=1 with working keys to pull live."
            >
              Sample data
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {data?.checkedAt && <Freshness fetchedAt={data.checkedAt} />}
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium bg-navy text-white rounded-md hover:bg-navy-light disabled:opacity-50 transition-colors"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Not configured */}
      {data && !data.configured && (
        <div className="bg-white border border-[#f59e0b]/30 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-navy mb-2">
            {env === "production" ? "Production" : "Staging"} AI gateway not configured
          </h3>
          <p className="text-sm text-gray-text mb-3">
            Set{" "}
            <code className="text-xs bg-gray-bg px-1.5 py-0.5 rounded font-mono">
              LITELLM_{env === "production" ? "PROD" : "STAGING"}_PROXY_URL
            </code>{" "}
            and{" "}
            <code className="text-xs bg-gray-bg px-1.5 py-0.5 rounded font-mono">
              LITELLM_{env === "production" ? "PROD" : "STAGING"}_API_KEY
            </code>{" "}
            in{" "}
            <code className="text-xs bg-gray-bg px-1.5 py-0.5 rounded font-mono">
              .env.local
            </code>{" "}
            to pull live AI usage.
          </p>
          <a href="/settings" className="text-sm font-medium text-blue-mid hover:underline">
            View Settings →
          </a>
        </div>
      )}

      {/* Errors (partial failures still render available data) */}
      {data?.errors && data.errors.length > 0 && (
        <div className="space-y-2 mb-6">
          {data.errors.map((e, i) => (
            <div
              key={i}
              className="bg-white border border-[#f59e0b]/30 rounded-lg px-5 py-3 flex items-start gap-3"
            >
              <span className="text-[#b45309] text-sm mt-0.5">!</span>
              <p className="text-xs text-gray-text font-mono">{e}</p>
            </div>
          ))}
        </div>
      )}

      {data?.configured && (
        <>
          {/* Totals headline */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Stat label="Total requests" value={fmt(data.totals.requests)} />
            <Stat label="Successful" value={fmt(data.totals.successful)} valueClass="text-[#15803d]" />
            <Stat label="Failed" value={fmt(data.totals.failed)} valueClass="text-red" />
            <Stat label="Total tokens" value={fmtCompact(data.totals.totalTokens)} />
          </div>

          {/* Provider cards */}
          {providers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {providers.map((p) => {
                const st = STATE_STYLE[p.status];
                return (
                  <div
                    key={p.provider}
                    className={`bg-white rounded-lg border border-gray-border border-l-4 ${st.ring} overflow-hidden`}
                  >
                    {/* Header */}
                    <div className="px-5 py-4 flex items-center justify-between border-b border-gray-border">
                      <h3 className="text-sm font-semibold text-navy capitalize">
                        {p.provider}
                      </h3>
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${st.text}`}>
                        <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                    </div>

                    {/* Provider rollup */}
                    <div className="px-5 py-3 flex items-center gap-4 border-b border-gray-border text-xs flex-wrap">
                      <span className="text-gray-text">
                        {fmtCompact(p.totalTokens)} <span className="text-gray-text/60">tokens</span>
                      </span>
                      <span className="text-gray-text">
                        {fmt(p.requests)} <span className="text-gray-text/60">req</span>
                      </span>
                      <span className="text-[#15803d]">{fmt(p.successful)} ✓</span>
                      {p.failed > 0 && <span className="text-red">{fmt(p.failed)} ✗</span>}
                      <span className="ml-auto text-gray-text/60">{p.models.length} models</span>
                    </div>

                    {/* Model rows */}
                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-border">
                      {p.models.map((m) => {
                        const mst = STATE_STYLE[m.status];
                        return (
                          <div
                            key={m.model}
                            className="px-5 py-2.5 flex items-center gap-3 text-xs"
                          >
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${mst.dot}`} />
                            <span className="text-navy truncate min-w-0 flex-1" title={m.model}>
                              {m.model}
                            </span>
                            <span className="font-mono tabular-nums text-gray-text shrink-0">
                              {fmtCompact(m.totalTokens)} tok
                            </span>
                            <span className="font-mono tabular-nums text-[#15803d] shrink-0 w-12 text-right">
                              {fmt(m.successful)} ✓
                            </span>
                            <span
                              className={`font-mono tabular-nums shrink-0 w-12 text-right ${
                                m.failed > 0 ? "text-red" : "text-gray-text/40"
                              }`}
                            >
                              {fmt(m.failed)} ✗
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            !loading && (
              <div className="text-center py-16">
                <p className="text-blue-light/60 text-sm">
                  No AI usage reported for this period.
                </p>
              </div>
            )
          )}

          {/* Daily requests trend */}
          {data.daily.length > 0 && (
            <div className="mt-6">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-blue-light/60 mb-3">
                Daily Requests
              </h2>
              <DailyTrendCard
                data={data.daily.map((d) => ({ date: d.date, value: d.requests }))}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  valueClass = "text-navy",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-border px-5 py-4">
      <p className="text-xs text-gray-text uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}
