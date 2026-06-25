"use client";

import { useState, useEffect } from "react";

interface ConfigStatus {
  cxm: Record<string, boolean>;
  site: Record<string, boolean>;
  litellm?: { staging: boolean; production: boolean };
}

const KEY_LABELS: Record<string, { label: string; envVar: (prefix: string) => string }> = {
  x: { label: "X (Twitter)", envVar: (p) => `${p}_X_BEARER_TOKEN` },
  netfeedrChannels: {
    label: "Netfeedr Channels",
    envVar: (p) => `${p}_NETFEEDR_CHANNELS_API_KEY`,
  },
  netfeedrSearch: {
    label: "Netfeedr Search",
    envVar: (p) => `${p}_NETFEEDR_SEARCH_API_KEY`,
  },
  netfeedrUpdater: {
    label: "Netfeedr Post Updater",
    envVar: (p) => `${p}_NETFEEDR_UPDATER_API_KEY`,
  },
  emedia: {
    label: "eMedia (TV & Radio)",
    envVar: (p) => `${p}_EMEDIA_USERNAME`,
  },
};

function EnvSection({
  title,
  prefix,
  status,
}: {
  title: string;
  prefix: string;
  status: Record<string, boolean>;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-border overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-border">
        <h3 className="text-sm font-semibold text-navy">{title}</h3>
      </div>
      <div className="divide-y divide-gray-border">
        {Object.entries(KEY_LABELS).map(([key, { label, envVar }]) => {
          const configured = status[key] ?? false;
          return (
            <div key={key} className="px-5 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-navy">{label}</p>
                <p className="text-xs text-gray-text font-mono mt-0.5">
                  {envVar(prefix)}
                </p>
              </div>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  configured
                    ? "bg-[#dcfce7] text-[#15803d]"
                    : "bg-gray-bg text-gray-text"
                }`}
              >
                {configured ? "Configured" : "Not set"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [status, setStatus] = useState<ConfigStatus | null>(null);

  useEffect(() => {
    fetch("/api/config-status")
      .then((r) => r.json())
      .then(setStatus);
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold text-navy">Settings</h1>
        <p className="text-sm text-gray-text mt-1">
          API keys are stored in{" "}
          <code className="text-xs bg-white px-1.5 py-0.5 rounded border border-gray-border font-mono">
            .env.local
          </code>{" "}
          and never leave the server. See{" "}
          <code className="text-xs bg-white px-1.5 py-0.5 rounded border border-gray-border font-mono">
            .env.example
          </code>{" "}
          for the full template.
        </p>
      </div>

      {/* ── Quick Start ─────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-border p-5 mb-8">
        <h3 className="text-sm font-semibold text-navy mb-3">Quick Start</h3>
        <div className="bg-navy rounded-md p-4 overflow-x-auto">
          <pre className="text-xs text-blue-light font-mono leading-relaxed">
{`# 1. Copy the template
cp .env.example .env.local

# 2. Fill in your keys
# (see below for which vars to set)

# 3. Restart the dev server
npm run dev`}
          </pre>
        </div>
      </div>

      {/* ── X API curl test ─────────────────── */}
      <div className="bg-white rounded-lg border border-gray-border p-5 mb-8">
        <h3 className="text-sm font-semibold text-navy mb-3">Test X Usage Endpoint</h3>
        <div className="bg-navy rounded-md p-4 overflow-x-auto">
          <pre className="text-xs text-blue-light font-mono leading-relaxed">
{`curl "https://api.x.com/2/usage/tweets?days=30\\
&usage.fields=daily_client_app_usage,daily_project_usage,\\
cap_reset_day,project_cap,project_id,project_usage" \\
  -H "Authorization: Bearer YOUR_BEARER_TOKEN"`}
          </pre>
        </div>
      </div>

      {/* ── Environment cards ───────────────── */}
      {status ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EnvSection title="Lucidya CXM" prefix="CXM" status={status.cxm} />
            <EnvSection title="Site" prefix="SITE" status={status.site} />
          </div>

          {/* AI Services (LiteLLM) — two self-hosted proxies, one per env */}
          <div className="mt-6 bg-white rounded-lg border border-gray-border overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-border">
              <h3 className="text-sm font-semibold text-navy">AI Services — LiteLLM proxies</h3>
            </div>
            <div className="divide-y divide-gray-border">
              {[
                { label: "Staging", prefix: "STAGING", on: status.litellm?.staging },
                { label: "Production", prefix: "PROD", on: status.litellm?.production },
              ].map((row) => (
                <div key={row.prefix} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-navy">{row.label}</p>
                    <p className="text-xs text-gray-text font-mono mt-0.5">
                      LITELLM_{row.prefix}_PROXY_URL · LITELLM_{row.prefix}_API_KEY
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      row.on ? "bg-[#dcfce7] text-[#15803d]" : "bg-gray-bg text-gray-text"
                    }`}
                  >
                    {row.on ? "Configured" : "Not set"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-sm text-gray-text">
          Loading configuration status…
        </div>
      )}

      {/* ── Env var reference ───────────────── */}
      <div className="mt-8 bg-white rounded-lg border border-gray-border overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-border">
          <h3 className="text-sm font-semibold text-navy">
            Optional Configuration
          </h3>
        </div>
        <div className="px-5 py-4 space-y-3 text-xs">
          <div className="flex justify-between">
            <span className="font-mono text-navy">CXM_X_APP_MAP</span>
            <span className="text-gray-text">
              JSON map of X app IDs → names
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-mono text-navy">
              CXM_NETFEEDR_*_BASE_URL
            </span>
            <span className="text-gray-text">
              Override Netfeedr base URL (default: https://api.netfeedr.com)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
