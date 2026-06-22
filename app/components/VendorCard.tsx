"use client";

import type { VendorCardData } from "@/lib/types";
import { fmt, fmtCompact } from "@/lib/format";
import { QuotaBar } from "./QuotaBar";
import { StatusDot } from "./StatusDot";
import { AppDonutChart } from "./AppDonutChart";
import { ChannelList } from "./ChannelList";
import { UsageModelBadge } from "./UsageModelBadge";

export function VendorCard({ card }: { card: VendorCardData }) {
  const isX = card.vendor === "x";
  const showDonut = isX && !!card.appBreakdown && card.appBreakdown.length > 0;

  // Placeholder (e.g. Datashake): disabled, dashed, awaiting the vendor endpoint.
  if (card.placeholder) {
    return (
      <div className="rounded-lg border border-dashed border-gray-border bg-white/60 opacity-60 px-5 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-navy">{card.product}</h3>
          <UsageModelBadge model="unknown" />
        </div>
        <p className="text-xs text-gray-text">Awaiting vendor endpoint</p>
      </div>
    );
  }

  const status = card.status; // primary-metric driven

  // Subtle left accent so a card in trouble is identifiable at a glance.
  const accent =
    status === "critical"
      ? "border-l-4 border-l-red"
      : status === "warning"
        ? "border-l-4 border-l-[#f59e0b]"
        : "border-l-4 border-l-transparent";

  const primaryPct =
    card.primary.limit > 0 ? (card.primary.used / card.primary.limit) * 100 : 0;
  const overLimit = primaryPct > 100;

  return (
    <div
      className={`bg-white rounded-lg border border-gray-border overflow-hidden ${accent}`}
    >
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-border">
        <div className="flex items-center gap-3">
          <StatusDot status={status} />
          <h3 className="text-sm font-semibold text-navy">{card.product}</h3>
          {card.package && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-pale text-blue-mid">
              {card.package}
            </span>
          )}
          <UsageModelBadge model={card.usageModel} />
        </div>
        {card.period && (
          <span className="text-xs text-gray-text font-mono">
            {card.period.daysLeft}d left
          </span>
        )}
      </div>

      {/* Headline (fixed-subscription) OR primary gauge */}
      {card.headline ? (
        <div className="px-5 pt-4 pb-3">
          <p className="text-2xl font-bold text-navy tabular-nums">
            {card.headline.value}
          </p>
          {card.headline.sub && (
            <p className="text-sm text-gray-text mt-1">{card.headline.sub}</p>
          )}
        </div>
      ) : (
        <div className="px-5 pt-4 pb-3 flex flex-col lg:flex-row lg:items-center gap-6">
          {/* Primary metric */}
          <div className="lg:flex-1 lg:min-w-0">
            <p className="text-xs text-gray-text uppercase tracking-wider mb-1">
              {card.primary.label}
            </p>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold text-navy tabular-nums">
                {fmtCompact(card.primary.used)}
              </span>
              <span className="text-sm text-gray-text">
                / {fmtCompact(card.primary.limit)}
              </span>
              {overLimit && (
                <span className="text-xs font-semibold text-red">
                  over by {fmt(card.primary.used - card.primary.limit)}
                </span>
              )}
            </div>
            <QuotaBar used={card.primary.used} limit={card.primary.limit} />
          </div>

          {/* Recommended chart — X app split, sits beside Posts Consumed */}
          {showDonut && (
            <div className="lg:shrink-0 lg:border-l lg:border-gray-border lg:pl-6">
              <AppDonutChart apps={card.appBreakdown!} />
            </div>
          )}
        </div>
      )}

      {/* Secondary metrics */}
      {card.secondary.length > 0 && (
        <div className="px-5 pb-4 space-y-2">
          {card.secondary.map((m, i) => {
            const isInfo = (m.kind ?? "quota") === "info";
            return (
              <div key={i} className={isInfo ? "opacity-60" : undefined}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-text">{m.label}</span>
                  <span className="font-mono text-navy tabular-nums">
                    {m.unit ? m.unit : `${fmt(m.used)} / ${fmtCompact(m.limit)}`}
                  </span>
                </div>
                {!isInfo && m.limit > 0 && (
                  <QuotaBar used={m.used} limit={m.limit} size="sm" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Full channel list (eMedia TV & Radio) */}
      {card.channels && card.channels.length > 0 && (
        <ChannelList channels={card.channels} />
      )}

      {/* Rate limit footer */}
      {card.rateLimit && (
        <div className="px-5 py-2.5 bg-gray-bg/50 border-t border-gray-border flex items-center justify-between text-xs text-gray-text">
          <span>Rate Limit</span>
          <span className="font-mono tabular-nums">
            {card.rateLimit.used} / {card.rateLimit.limit} calls/min
          </span>
        </div>
      )}
    </div>
  );
}
