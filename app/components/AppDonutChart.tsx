"use client";

import { fmt, fmtCompact } from "@/lib/format";

// Brand-aligned series colors, shared conceptually with the daily trend.
const COLORS = ["#456ab2", "#7776c4", "#9fcbfc", "#2a2768", "#1a174f", "#5b8def"];

interface App {
  appId: string;
  appName: string;
  usage: number;
}

// Recommended part-to-whole view for X's handful of client apps: a donut with a
// total in the middle and a compact legend. Sits beside "Posts Consumed".
export function AppDonutChart({ apps }: { apps: App[] }) {
  if (!apps.length) return null;

  const sorted = [...apps].sort((a, b) => b.usage - a.usage);
  const total = sorted.reduce((s, a) => s + a.usage, 0);

  const size = 132;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;

  let offset = 0;
  const segments = sorted.map((a, i) => {
    const share = total > 0 ? a.usage / total : 0;
    const len = share * C;
    const seg = {
      color: COLORS[i % COLORS.length],
      dasharray: `${len} ${C - len}`,
      dashoffset: -offset,
      share,
    };
    offset += len;
    return seg;
  });

  return (
    <div className="flex items-center gap-5">
      {/* Donut */}
      <svg width={size} height={size} className="shrink-0" role="img" aria-label="Consumption by app">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#e6e7e8"
            strokeWidth={stroke}
          />
          {segments.map((s, i) => (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={s.dasharray}
              strokeDashoffset={s.dashoffset}
            />
          ))}
        </g>
        <text
          x="50%"
          y="48%"
          textAnchor="middle"
          className="fill-navy font-bold"
          style={{ fontSize: "20px" }}
        >
          {fmtCompact(total)}
        </text>
        <text
          x="50%"
          y="62%"
          textAnchor="middle"
          className="fill-gray-text"
          style={{ fontSize: "10px" }}
        >
          posts
        </text>
      </svg>

      {/* Legend */}
      <ul className="space-y-2 min-w-0">
        {sorted.map((a, i) => (
          <li key={a.appId} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 rounded-sm shrink-0"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            <span className="font-medium text-navy truncate">{a.appName}</span>
            <span className="font-mono text-gray-text tabular-nums ml-auto pl-2 shrink-0">
              {fmt(a.usage)} ({((total > 0 ? a.usage / total : 0) * 100).toFixed(0)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
