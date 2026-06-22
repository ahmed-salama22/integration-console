"use client";

import { fmt } from "@/lib/format";

interface DailyTrendCardProps {
  data: { date: string; value: number }[];
}

export function DailyTrendCard({ data }: DailyTrendCardProps) {
  if (!data.length) return null;

  const max = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const avg = Math.round(total / data.length);

  return (
    <div className="bg-white rounded-lg border border-gray-border overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-border">
        <h3 className="text-sm font-semibold text-navy">Daily Consumption</h3>
        <div className="flex items-center gap-5 text-xs text-gray-text">
          <span>
            Avg: <span className="font-mono text-navy">{fmt(avg)}</span> / day
          </span>
          <span>
            Total: <span className="font-mono text-navy">{fmt(total)}</span>
          </span>
          <span>{data.length} days</span>
        </div>
      </div>

      {/* Chart */}
      <div className="px-5 py-5">
        <div className="flex items-end gap-[3px]" style={{ height: "112px" }}>
          {data.map((d, i) => {
            const barH = Math.max(Math.round((d.value / max) * 104), 3);
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center justify-end"
                title={`${d.date.split("T")[0]} — ${fmt(d.value)}`}
              >
                <div
                  className="w-full min-w-[6px] max-w-[28px] rounded-sm bg-blue-mid/70 hover:bg-blue-mid transition-colors cursor-default"
                  style={{ height: `${barH}px` }}
                />
              </div>
            );
          })}
        </div>

        {/* X-axis labels — show every ~5th date */}
        <div className="flex justify-between mt-2 px-1">
          {data
            .filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1)
            .map((d, i) => (
              <span key={i} className="text-[10px] text-gray-text font-mono">
                {d.date.split("T")[0].slice(5)}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}
