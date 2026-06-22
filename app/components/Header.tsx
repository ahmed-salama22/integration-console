"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { Environment } from "@/lib/types";
import { ENVIRONMENTS } from "@/lib/types";
import { useEnv } from "../EnvContext";

export function Header() {
  const pathname = usePathname();
  const { env, setEnv } = useEnv();
  const onDashboard = pathname === "/";

  return (
    <header className="bg-navy text-white">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Image
            src="/lucidya-logo.png"
            alt="Lucidya"
            width={120}
            height={28}
            className="brightness-0 invert"
          />
          <span className="text-sm font-medium text-blue-light opacity-60">/</span>
          <span className="text-sm font-semibold tracking-wide">
            Vendors Quota Tracker
          </span>

          {/* Environment dropdown — sits right next to the title */}
          {onDashboard && (
            <div className="relative ml-1">
              <select
                aria-label="Environment"
                value={env}
                onChange={(e) => setEnv(e.target.value as Environment)}
                className="appearance-none bg-navy-light text-white text-sm font-medium rounded-md border border-white/20 pl-3 pr-8 py-1.5 cursor-pointer hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-blue-light/40"
              >
                {ENVIRONMENTS.map((e) => (
                  <option key={e.id} value={e.id} className="text-navy bg-white">
                    {e.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/70 text-[10px]">
                ▼
              </span>
            </div>
          )}
        </div>

        <nav className="flex items-center gap-5 text-sm">
          <Link href="/" className="text-gray-300 hover:text-white transition-colors">
            Dashboard
          </Link>
          <Link
            href="/settings"
            className="text-gray-300 hover:text-white transition-colors"
          >
            Settings
          </Link>
        </nav>
      </div>
    </header>
  );
}
