import "./globals.css";
import type { Metadata } from "next";
import { EnvProvider } from "./EnvContext";
import { Header } from "./components/Header";

export const metadata: Metadata = {
  title: "Integrations Console — Lucidya",
  description:
    "Monitor data vendor usage, AI services, and infrastructure health",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">
        <EnvProvider>
          <Header />
          {/* ── Main ──────────────────────────── */}
          <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
        </EnvProvider>
      </body>
    </html>
  );
}
