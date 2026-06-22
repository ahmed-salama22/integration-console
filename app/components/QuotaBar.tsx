"use client";

import { evaluateStatus } from "@/lib/alerts";

interface QuotaBarProps {
  used: number;
  limit: number;
  size?: "sm" | "md";
}

export function QuotaBar({ used, limit, size = "md" }: QuotaBarProps) {
  const rawPct = limit > 0 ? (used / limit) * 100 : 0;
  const barPct = Math.min(rawPct, 100);
  const status = evaluateStatus(used, limit);

  const barColor =
    status === "critical"
      ? "bg-red"
      : status === "warning"
        ? "bg-[#f59e0b]"
        : "bg-blue-mid";
  const textColor =
    status === "critical"
      ? "text-red"
      : status === "warning"
        ? "text-[#f59e0b]"
        : "text-gray-text";

  const h = size === "sm" ? "h-1.5" : "h-2.5";

  return (
    <div className="flex items-center gap-3">
      <div className={`flex-1 ${h} rounded-full bg-gray-border overflow-hidden`}>
        <div
          className={`${h} rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${barPct}%` }}
        />
      </div>
      <span className={`text-xs font-mono font-medium tabular-nums ${textColor}`}>
        {rawPct > 100 ? `${Math.round(rawPct)}%` : `${rawPct.toFixed(1)}%`}
      </span>
    </div>
  );
}
