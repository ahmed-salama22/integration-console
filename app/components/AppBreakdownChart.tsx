"use client";

import { fmt } from "@/lib/format";

// Distinct brand-aligned colors so each app reads as its own series (legend).
const COLORS = ["#456ab2", "#7776c4", "#9fcbfc", "#2a2768", "#1a174f", "#5b8def"];

interface App {
  appId: string;
  appName: string;
  usage: number;
}

export function AppBreakdownChart({ apps }: { apps: App[] }) {
  if (!apps.length) return null;

  const sorted = [...apps].sort((a, b) => b.usage - a.usage);
  const max = Math.max(...sorted.map((a) => a.usage), 1);
  const total = sorted.reduce((s, a) => s + a.usage, 0);

  return (
    <div className="px-5 pb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-text uppercase tracking-wider">
          Consumption by App
        </p>
        <span className="text-xs text-gray-text">{apps.length} apps</span>
      </div>

      <div className="space-y-3">
        {sorted.map((a, i) => {
          const color = COLORS[i % COLORS.length];
          const barPct = (a.usage / max) * 100;
          const share = total > 0 ? (a.usage / total) * 100 : 0;
          return (
            <div key={a.appId}>
              {/* Label / legend row */}
              <div className="flex items-center justify-between text-xs mb-1 gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-sm shrink-0"
                    style={{ background: color }}
                  />
                  <span className="font-medium text-navy truncate">{a.appName}</span>
                  <span className="font-mono text-[10px] text-gray-text shrink-0">
                    #{a.appId}
                  </span>
                </span>
                <span className="font-mono text-navy tabular-nums shrink-0">
                  {fmt(a.usage)}{" "}
                  <span className="text-gray-text">({share.toFixed(0)}%)</span>
                </span>
              </div>
              {/* Bar */}
              <div className="h-2.5 rounded-full bg-gray-border overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(barPct, 1.5)}%`, background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
