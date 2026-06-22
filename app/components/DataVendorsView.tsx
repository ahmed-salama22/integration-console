"use client";

import { useState, useEffect, useCallback } from "react";
import type { VendorCardData } from "@/lib/types";
import { type Status } from "@/lib/alerts";
import { useEnv } from "../EnvContext";
import { VendorCard } from "./VendorCard";
import { DailyTrendCard } from "./DailyTrendCard";
import { StatusSummary, cardAnchor } from "./StatusSummary";
import { Freshness } from "./Freshness";
import { LoadingBar } from "./LoadingBar";
import { EnvToggle } from "./EnvToggle";

const severityRank: Record<Status, number> = { critical: 2, warning: 1, ok: 0 };

// Vendor sub-tabs, in display order. `enabled: false` renders a disabled
// "More Soon" affordance for vendors still in discovery.
const VENDOR_TABS: {
  id: VendorCardData["vendor"];
  label: string;
}[] = [
  { id: "x", label: "X" },
  { id: "netfeedr", label: "Netfeedr" },
  { id: "emedia", label: "eMedia TV & Radio" },
  { id: "datashake", label: "Datashake" },
];

function primaryPct(c: VendorCardData): number {
  return c.primary.limit > 0 ? c.primary.used / c.primary.limit : 0;
}

function bySeverity(a: VendorCardData, b: VendorCardData): number {
  if (!!a.placeholder !== !!b.placeholder) return a.placeholder ? 1 : -1;
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

export function DataVendorsView() {
  const { env } = useEnv();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UsageResponse | null>(null);
  const [activeVendor, setActiveVendor] =
    useState<VendorCardData["vendor"]>("x");
  // Anchor of the card to spotlight after an alert-row click.
  const [highlight, setHighlight] = useState<string | null>(null);

  const spotlight = useCallback((card: VendorCardData) => {
    const id = cardAnchor(card);
    setActiveVendor(card.vendor);
    setHighlight(null); // reset so the animation replays on repeat clicks
    setTimeout(() => setHighlight(id), 80);
    setTimeout(() => setHighlight((h) => (h === id ? null : h)), 2400);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const minDelay = new Promise((r) => setTimeout(r, 800));
    try {
      const [res] = await Promise.all([fetch(`/api/usage?env=${env}`), minDelay]);
      setData(await res.json());
    } catch (err) {
      console.error("Failed to fetch usage:", err);
    } finally {
      setLoading(false);
    }
  }, [env]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const cards = data?.data ?? [];
  const noKeysConfigured =
    data?.configStatus && !Object.values(data.configStatus).some(Boolean);

  const tabs = VENDOR_TABS.map((t) => {
    const vendorCards = cards.filter((c) => c.vendor === t.id);
    const worst = vendorCards
      .filter((c) => !c.placeholder)
      .reduce<Status>(
        (acc, c) => (severityRank[c.status] > severityRank[acc] ? c.status : acc),
        "ok"
      );
    // Dim a tab whose only cards are placeholders (e.g. Datashake — not live yet).
    const dimmed = vendorCards.length > 0 && vendorCards.every((c) => c.placeholder);
    return { ...t, count: vendorCards.length, worst, dimmed };
  });

  const visibleCards = cards
    .filter((c) => c.vendor === activeVendor)
    .sort(bySeverity);
  const xTrend = visibleCards.find((c) => c.vendor === "x" && c.dailyUsage?.length);

  return (
    <div>
      <LoadingBar active={loading} />

      {/* Env selector + refresh */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <EnvToggle />
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

      {/* Alert summary — click a row to open that vendor's tab + scroll to it */}
      {data && cards.some((c) => !c.placeholder) && (
        <StatusSummary data={cards} errors={data.errors || []} onSelect={spotlight} />
      )}

      {/* No keys warning */}
      {noKeysConfigured && (
        <div className="bg-white border border-[#f59e0b]/30 rounded-lg p-6 mb-8">
          <h3 className="text-sm font-semibold text-navy mb-2">
            No API keys configured for this environment
          </h3>
          <p className="text-sm text-gray-text mb-3">
            Add your vendor API keys in{" "}
            <code className="text-xs bg-gray-bg px-1.5 py-0.5 rounded font-mono">
              .env.local
            </code>{" "}
            to start pulling live data.
          </p>
          <a
            href="/settings"
            className="text-sm font-medium text-blue-mid hover:underline"
          >
            View Settings →
          </a>
        </div>
      )}

      {/* Errors */}
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

      {/* Vendor sub-tabs */}
      <div className="flex items-center gap-1 border-b border-white/10 mb-6 overflow-x-auto">
        {tabs.map((t) => {
          const active = t.id === activeVendor;
          return (
            <button
              key={t.id}
              onClick={() => !t.dimmed && setActiveVendor(t.id)}
              disabled={t.dimmed}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium -mb-px border-b-2 whitespace-nowrap transition-colors ${
                active
                  ? "border-white text-white"
                  : "border-transparent text-blue-light/60 hover:text-white"
              } ${t.dimmed ? "opacity-40 cursor-not-allowed hover:text-blue-light/60" : ""}`}
            >
              {t.label}
              {t.count > 0 && !t.dimmed && (
                <span className="text-xs text-blue-light/50">{t.count}</span>
              )}
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
        <span className="px-4 py-2.5 text-sm font-medium text-blue-light/30 cursor-default whitespace-nowrap">
          More Soon
        </span>
      </div>

      {/* Active vendor cards */}
      {visibleCards.length > 0 ? (
        <div className="space-y-6">
          {/* X (donut beside metric) and eMedia (channel list) get full width. */}
          <div
            className={
              activeVendor === "x" || activeVendor === "emedia"
                ? "grid grid-cols-1 gap-4"
                : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            }
          >
            {visibleCards.map((card) => {
              const anchor = cardAnchor(card);
              return (
                <div
                  key={anchor}
                  id={anchor}
                  className={`scroll-mt-20 rounded-lg ${highlight === anchor ? "spotlight" : ""}`}
                >
                  <VendorCard card={card} />
                </div>
              );
            })}
          </div>
          {xTrend?.dailyUsage && <DailyTrendCard data={xTrend.dailyUsage} />}
        </div>
      ) : (
        !loading && (
          <div className="text-center py-16">
            <p className="text-blue-light/60 text-sm">
              Not configured for this environment.
            </p>
          </div>
        )
      )}
    </div>
  );
}
