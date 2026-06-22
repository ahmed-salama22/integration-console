"use client";

import { useState, useEffect, useCallback } from "react";
import type { VendorCardData } from "@/lib/types";
import { ENVIRONMENTS } from "@/lib/types";
import { type Status } from "@/lib/alerts";
import { useEnv } from "./EnvContext";
import { VendorCard } from "./components/VendorCard";
import { DailyTrendCard } from "./components/DailyTrendCard";
import { StatusSummary, cardAnchor } from "./components/StatusSummary";
import { Freshness } from "./components/Freshness";
import { LoadingBar } from "./components/LoadingBar";

const severityRank: Record<Status, number> = { critical: 2, warning: 1, ok: 0 };

// Vendors render as tabs, in this order, when present in the data.
const VENDOR_ORDER: { id: VendorCardData["vendor"]; label: string }[] = [
  { id: "x", label: "X (Twitter)" },
  { id: "netfeedr", label: "Netfeedr" },
];

function primaryPct(c: VendorCardData): number {
  return c.primary.limit > 0 ? c.primary.used / c.primary.limit : 0;
}

// Worst cards first (by primary-metric status), then by highest primary %.
function bySeverity(a: VendorCardData, b: VendorCardData): number {
  const d = severityRank[b.status] - severityRank[a.status];
  if (d !== 0) return d;
  return primaryPct(b) - primaryPct(a);
}

interface UsageResponse {
  environment: string;
  configStatus: Record<string, boolean>;
  data: VendorCardData[];
  errors: { vendor: string; product: string; message: string }[];
  fetchedAt: string;
}

export default function Dashboard() {
  const { env } = useEnv();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UsageResponse | null>(null);
  const [activeVendor, setActiveVendor] =
    useState<VendorCardData["vendor"]>("x");

  const fetchData = useCallback(async () => {
    setLoading(true);
    // Keep the loader visible for at least 1s so the refresh reads as deliberate.
    const minDelay = new Promise((r) => setTimeout(r, 1000));
    try {
      const [res] = await Promise.all([fetch(`/api/usage?env=${env}`), minDelay]);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to fetch usage:", err);
    } finally {
      setLoading(false);
    }
  }, [env]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const envLabel = ENVIRONMENTS.find((e) => e.id === env)?.label ?? env;

  const cards = data?.data ?? [];
  const noKeysConfigured =
    data?.configStatus && !Object.values(data.configStatus).some(Boolean);

  // Which vendor tabs to show, and the worst status within each (for the dot).
  const tabs = VENDOR_ORDER.map((v) => {
    const vendorCards = cards.filter((c) => c.vendor === v.id);
    const worst = vendorCards.reduce<Status>(
      (acc, c) => (severityRank[c.status] > severityRank[acc] ? c.status : acc),
      "ok"
    );
    return { ...v, count: vendorCards.length, worst };
  }).filter((t) => t.count > 0);

  // Fall back to the first present tab if the active one has no cards.
  const effectiveVendor =
    tabs.find((t) => t.id === activeVendor)?.id ?? tabs[0]?.id;

  const visibleCards = cards
    .filter((c) => c.vendor === effectiveVendor)
    .sort(bySeverity);

  return (
    <div>
      <LoadingBar active={loading} />

      {/* ── Top bar: current env + refresh ──── */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-bold text-white">{envLabel}</h1>
        <div className="flex items-center gap-4">
          {data?.fetchedAt && <Freshness fetchedAt={data.fetchedAt} />}
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium bg-navy text-white rounded-md hover:bg-navy-light disabled:opacity-50 transition-colors"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* ── Alert summary ───────────────────── */}
      {data && cards.length > 0 && (
        <StatusSummary
          data={cards}
          errors={data.errors || []}
          onSelect={(card) => setActiveVendor(card.vendor)}
        />
      )}

      {/* ── No keys warning ─────────────────── */}
      {noKeysConfigured && (
        <div className="bg-white border border-[#f59e0b]/30 rounded-lg p-6 mb-8">
          <h3 className="text-sm font-semibold text-navy mb-2">
            No API keys configured
          </h3>
          <p className="text-sm text-gray-text mb-3">
            Add your vendor API keys in{" "}
            <code className="text-xs bg-gray-bg px-1.5 py-0.5 rounded font-mono">
              .env.local
            </code>{" "}
            to start pulling live data. Check the Settings page for the full
            list of required variables.
          </p>
          <a
            href="/settings"
            className="text-sm font-medium text-blue-mid hover:underline"
          >
            View Settings →
          </a>
        </div>
      )}

      {/* ── Errors ──────────────────────────── */}
      {data?.errors && data.errors.length > 0 && (
        <div className="space-y-2 mb-8">
          {data.errors.map((e, i) => (
            <div
              key={i}
              className="bg-white border border-red/20 rounded-lg px-5 py-3 flex items-start gap-3"
            >
              <span className="text-red text-sm mt-0.5">✕</span>
              <div>
                <p className="text-sm font-medium text-navy">{e.product}</p>
                <p className="text-xs text-gray-text font-mono">{e.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Vendor tabs ─────────────────────── */}
      {tabs.length > 0 && (
        <>
          <div className="flex items-center gap-1 border-b border-white/10 mb-6">
            {tabs.map((t) => {
              const active = t.id === effectiveVendor;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveVendor(t.id)}
                  className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors ${
                    active
                      ? "border-white text-white"
                      : "border-transparent text-blue-light/60 hover:text-white"
                  }`}
                >
                  {t.label}
                  <span className="text-xs text-blue-light/50">{t.count}</span>
                  {t.worst !== "ok" && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        t.worst === "critical" ? "bg-red" : "bg-[#f59e0b]"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Active vendor cards ───────────── */}
          {effectiveVendor === "x" ? (
            <div className="space-y-4">
              {visibleCards.map((card, i) => (
                <div key={i} id={cardAnchor(card)} className="space-y-4 scroll-mt-20">
                  <VendorCard card={card} />
                  {card.dailyUsage && card.dailyUsage.length > 0 && (
                    <DailyTrendCard data={card.dailyUsage} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleCards.map((card, i) => (
                <div key={i} id={cardAnchor(card)} className="scroll-mt-20">
                  <VendorCard card={card} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Empty state ─────────────────────── */}
      {!loading && tabs.length === 0 && !noKeysConfigured && (
        <div className="text-center py-16">
          <p className="text-blue-light/60 text-sm">
            No usage data available for this environment.
          </p>
        </div>
      )}
    </div>
  );
}
