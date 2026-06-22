"use client";

import { useState, useMemo } from "react";
import type { ChannelRow } from "@/lib/types";

type Filter = "all" | "tv" | "radio";

export function ChannelList({ channels }: { channels: ChannelRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return channels.filter((c) => {
      if (filter === "tv" && c.mediaType !== 1) return false;
      if (filter === "radio" && c.mediaType !== 2) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.country ?? "").toLowerCase().includes(q) ||
        (c.language ?? "").toLowerCase().includes(q)
      );
    });
  }, [channels, query, filter]);

  const tabs: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "tv", label: "📺 TV" },
    { id: "radio", label: "📻 Radio" },
  ];

  return (
    <div className="px-5 pb-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <p className="text-xs text-gray-text uppercase tracking-wider">
          Channels{" "}
          <span className="text-gray-text/70">({filtered.length})</span>
        </p>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-gray-border overflow-hidden">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                  filter === t.id
                    ? "bg-navy text-white"
                    : "bg-white text-gray-text hover:bg-gray-bg"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="text-xs px-2.5 py-1 rounded-md border border-gray-border bg-white text-navy placeholder:text-gray-text/60 focus:outline-none focus:ring-2 focus:ring-blue-light/40 w-28"
          />
        </div>
      </div>

      {/* Scrollable list */}
      <div className="max-h-80 overflow-y-auto rounded-md border border-gray-border divide-y divide-gray-border">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-xs text-gray-text text-center">
            No channels match.
          </p>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              className="px-3 py-2 flex items-center gap-2 text-xs hover:bg-gray-bg/50"
            >
              <span className="shrink-0">{c.mediaType === 1 ? "📺" : "📻"}</span>
              <span className="font-medium text-navy truncate flex-1 min-w-0">
                {c.name}
              </span>
              {c.country && (
                <span className="text-gray-text shrink-0 truncate max-w-[120px]">
                  {c.country}
                </span>
              )}
              {c.language && (
                <span className="font-mono text-[10px] uppercase text-gray-text bg-gray-bg rounded px-1.5 py-0.5 shrink-0">
                  {c.language}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
