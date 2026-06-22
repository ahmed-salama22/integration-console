"use client";

import { useState, useEffect } from "react";
import { freshnessStatus } from "@/lib/alerts";

/**
 * Shows how old the displayed data is ("Updated 2m ago") and turns amber/red
 * as it goes stale. Ticks a local timer to keep the label current — it does
 * NOT refetch data (no auto-refresh; use the Refresh button).
 */
export function Freshness({ fetchedAt }: { fetchedAt: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const ageMs = Math.max(0, now - new Date(fetchedAt).getTime());
  const status = freshnessStatus(ageMs);

  const color =
    status === "critical"
      ? "text-red"
      : status === "warning"
        ? "text-[#f59e0b]"
        : "text-blue-light/70";
  const dot =
    status === "critical"
      ? "bg-red"
      : status === "warning"
        ? "bg-[#f59e0b]"
        : "bg-[#22c55e]";

  const mins = Math.floor(ageMs / 60_000);
  const label = mins < 1 ? "just now" : `${mins}m ago`;

  return (
    <span className={`flex items-center gap-1.5 text-xs font-mono ${color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      Updated {label}
    </span>
  );
}
