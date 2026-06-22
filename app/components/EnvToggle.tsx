"use client";

import { ENVIRONMENTS } from "@/lib/types";
import { useEnv } from "../EnvContext";

// Environment selector for the Data Vendors section. Each env carries its own
// set of vendor credentials (CXM vs Site), so usage is fetched per env.
export function EnvToggle() {
  const { env, setEnv } = useEnv();
  return (
    <div className="inline-flex rounded-md border border-white/15 bg-navy/40 p-0.5">
      {ENVIRONMENTS.map((e) => {
        const active = e.id === env;
        return (
          <button
            key={e.id}
            onClick={() => setEnv(e.id)}
            className={`px-3.5 py-1.5 text-sm font-medium rounded transition-colors ${
              active
                ? "bg-white text-navy"
                : "text-blue-light/70 hover:text-white"
            }`}
          >
            {e.label}
          </button>
        );
      })}
    </div>
  );
}
