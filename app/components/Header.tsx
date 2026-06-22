"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Data Vendors" },
  { href: "/ai-services", label: "AI Services" },
  { href: "/infrastructure", label: "Infrastructure Services" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-navy text-white">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4 shrink-0">
          <Image
            src="/lucidya-logo.png"
            alt="Lucidya"
            width={120}
            height={28}
            className="brightness-0 invert"
          />
          <span className="text-sm font-medium text-blue-light opacity-60">/</span>
          <span className="text-sm font-semibold tracking-wide">Integrations Console</span>
        </div>

        <nav className="flex items-center gap-1 text-sm overflow-x-auto">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <span className="mx-1 h-4 w-px bg-white/15" />
          <Link
            href="/settings"
            className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
              pathname === "/settings"
                ? "bg-white/10 text-white"
                : "text-gray-300 hover:text-white hover:bg-white/5"
            }`}
          >
            Settings
          </Link>
        </nav>
      </div>
    </header>
  );
}
