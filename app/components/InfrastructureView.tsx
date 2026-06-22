"use client";

import { useState, useEffect, useCallback } from "react";
import type { InfraStatus, InfraState } from "@/lib/infra";
import { Freshness } from "./Freshness";
import { LoadingBar } from "./LoadingBar";

interface InfraResponse {
  services: InfraStatus[];
  checkedAt: string;
}

const STATE_STYLE: Record<
  InfraState,
  { dot: string; label: string; text: string; ring: string }
> = {
  up: { dot: "bg-[#22c55e]", label: "Operational", text: "text-[#15803d]", ring: "border-l-transparent" },
  warn: { dot: "bg-[#f59e0b]", label: "Degraded", text: "text-[#b45309]", ring: "border-l-[#f59e0b]" },
  down: { dot: "bg-red", label: "Outage", text: "text-red", ring: "border-l-red" },
  unknown: { dot: "bg-gray-text", label: "Unknown", text: "text-gray-text", ring: "border-l-transparent" },
};

export function InfrastructureView() {
  const [data, setData] = useState<InfraResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInfra = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/infra");
      setData(await res.json());
    } catch (err) {
      console.error("Failed to fetch infra health:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch once on landing; refresh is manual only (no background polling).
  useEffect(() => {
    fetchInfra();
  }, [fetchInfra]);

  const services = data?.services ?? [];

  return (
    <div>
      <LoadingBar active={loading} />

      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <p className="text-sm text-blue-light/60">
          Checked on load — use Refresh to re-check.
        </p>
        <div className="flex items-center gap-4">
          {data?.checkedAt && <Freshness fetchedAt={data.checkedAt} />}
          <button
            onClick={fetchInfra}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium bg-navy text-white rounded-md hover:bg-navy-light disabled:opacity-50 transition-colors"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((s) => {
          const st = STATE_STYLE[s.status];
          return (
            <div
              key={s.id}
              className={`bg-white rounded-lg border border-gray-border border-l-4 ${st.ring} overflow-hidden`}
            >
              {/* Header: logo + name + overall status */}
              <div className="px-5 py-4 flex items-center justify-between border-b border-gray-border">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.icon}
                    alt=""
                    className="h-6 w-6 object-contain shrink-0"
                  />
                  <h3 className="text-sm font-semibold text-navy truncate">
                    {s.displayName}
                  </h3>
                </div>
                <span className={`flex items-center gap-1.5 text-xs font-medium shrink-0 ${st.text}`}>
                  <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                  {st.label}
                </span>
              </div>

              {/* Summary line */}
              <p className="px-5 pt-3 text-xs text-gray-text">{s.description}</p>

              {/* Per-service breakdown */}
              {s.components.length > 0 ? (
                <div className="px-5 py-3 max-h-72 overflow-y-auto">
                  <ul className="divide-y divide-gray-border">
                    {s.components.map((c, i) => {
                      const cst = STATE_STYLE[c.status];
                      return (
                        <li
                          key={i}
                          className="py-2 flex items-center justify-between gap-3 text-xs"
                          title={c.detail}
                        >
                          <span className="text-navy truncate min-w-0">{c.name}</span>
                          <span className={`flex items-center gap-1.5 shrink-0 ${cst.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${cst.dot}`} />
                            {cst.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <div className="px-5 py-4">
                  <p className="text-xs text-gray-text">
                    {s.status === "unknown"
                      ? "Status unavailable."
                      : "No service-level issues reported."}
                  </p>
                </div>
              )}

              {/* Footer: link to the provider's status page */}
              <a
                href={s.statusPage}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 border-t border-gray-border flex items-center justify-between text-xs font-medium text-blue-mid hover:bg-gray-bg/50 transition-colors"
              >
                View status page
                <span aria-hidden>↗</span>
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
