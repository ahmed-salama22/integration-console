"use client";

import type { VendorCardData } from "@/lib/types";
import { WARNING_PCT, CRITICAL_PCT, type Status } from "@/lib/alerts";

export function cardAnchor(card: VendorCardData): string {
  return `card-${card.vendor}-${card.product}`.replace(/\s+/g, "-").toLowerCase();
}

const WARN = Math.round(WARNING_PCT * 100);
const CRIT = Math.round(CRITICAL_PCT * 100);

const THRESHOLDS: { color: string; label: string; desc: string }[] = [
  { color: "bg-[#22c55e]", label: "Healthy", desc: `below ${WARN}% of the limit` },
  { color: "bg-[#f59e0b]", label: "Warning", desc: `${WARN}–${CRIT}% of the limit` },
  {
    color: "bg-red",
    label: "Critical",
    desc: `${CRIT}% or more — or over the limit`,
  },
];

/** Hover card explaining how status is determined. */
function ThresholdTooltip() {
  return (
    <div className="absolute left-0 top-full mt-2 z-20 hidden group-hover:block w-64 rounded-lg border border-gray-border bg-white p-3 shadow-lg">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-text mb-2">
        How status is calculated
      </p>
      <ul className="space-y-1.5">
        {THRESHOLDS.map((t) => (
          <li key={t.label} className="flex items-start gap-2 text-xs">
            <span className={`h-2.5 w-2.5 rounded-full mt-0.5 shrink-0 ${t.color}`} />
            <span>
              <span className="font-medium text-navy">{t.label}</span>{" "}
              <span className="text-gray-text">— {t.desc}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-gray-text mt-2 pt-2 border-t border-gray-border">
        Based on each product&apos;s primary quota metric.
      </p>
    </div>
  );
}

function primaryPct(card: VendorCardData): number {
  return card.primary.limit > 0 ? card.primary.used / card.primary.limit : 0;
}

interface Props {
  data: VendorCardData[];
  errors: { vendor: string; product: string; message: string }[];
  onSelect?: (card: VendorCardData) => void;
}

export function StatusSummary({ data, errors, onSelect }: Props) {
  const counts: Record<Status, number> = { critical: 0, warning: 0, ok: 0 };
  const alerts: { card: VendorCardData; status: Status; detail: string }[] = [];

  for (const card of data) {
    if (card.placeholder) continue; // not live yet — don't count it
    const status = card.status; // primary-metric driven
    counts[status]++;
    if (status !== "ok") {
      alerts.push({
        card,
        status,
        detail: `${card.primary.label} ${Math.round(primaryPct(card) * 100)}%`,
      });
    }
  }

  alerts.sort((a, b) => (a.status === "critical" ? -1 : b.status === "critical" ? 1 : 0));

  const noQuotaAlerts = counts.critical === 0 && counts.warning === 0;
  const allHealthy = noQuotaAlerts && errors.length === 0;

  function handleClick(e: React.MouseEvent, card: VendorCardData) {
    if (!onSelect) return;
    e.preventDefault();
    onSelect(card);
    // Let the target vendor's cards render, then scroll to the offender.
    setTimeout(() => {
      document
        .getElementById(cardAnchor(card))
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  return (
    <div className="bg-white rounded-lg border border-gray-border mb-8">
      {/* Count row */}
      <div className="px-5 py-3 flex items-center gap-5 border-b border-gray-border">
        <Pill color="bg-red" label="Critical" count={counts.critical} />
        <Pill color="bg-[#f59e0b]" label="Warning" count={counts.warning} />
        <Pill color="bg-[#22c55e]" label="Healthy" count={counts.ok} />
        {errors.length > 0 && (
          <Pill color="bg-gray-text" label="Errors" count={errors.length} />
        )}
      </div>

      {/* Detail list */}
      {allHealthy ? (
        <div className="px-5 py-3 text-sm text-gray-text flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
          All quotas healthy.
        </div>
      ) : (
        <ul className="divide-y divide-gray-border">
          {alerts.map(({ card, status, detail }) => (
            <li key={cardAnchor(card)}>
              <a
                href={`#${cardAnchor(card)}`}
                onClick={(e) => handleClick(e, card)}
                className="px-5 py-2.5 flex items-center justify-between text-sm hover:bg-gray-bg/50 transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      status === "critical" ? "bg-red" : "bg-[#f59e0b]"
                    }`}
                  />
                  <span className="font-medium text-navy">{card.product}</span>
                  {card.package && (
                    <span className="text-xs text-gray-text">{card.package}</span>
                  )}
                </span>
                <span
                  className={`font-mono text-xs ${
                    status === "critical" ? "text-red" : "text-[#f59e0b]"
                  }`}
                >
                  {detail}
                </span>
              </a>
            </li>
          ))}
          {noQuotaAlerts && errors.length > 0 && (
            <li className="px-5 py-2.5 text-sm text-gray-text">
              {errors.length} fetch {errors.length === 1 ? "error" : "errors"} — see
              details below.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function Pill({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <span className="group relative flex items-center gap-2 text-sm cursor-help">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="font-semibold text-navy tabular-nums">{count}</span>
      <span className="text-gray-text border-b border-dashed border-gray-border">
        {label}
      </span>
      <ThresholdTooltip />
    </span>
  );
}
