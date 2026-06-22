import { NextRequest, NextResponse } from "next/server";
import { getEnvConfig, getConfigStatus } from "@/lib/config";
import { fetchXUsage, normalizeXUsage } from "@/lib/vendors/x";
import {
  fetchNetfeedrChannels,
  normalizeChannels,
  fetchNetfeedrSearch,
  normalizeSearch,
  fetchNetfeedrUpdater,
  normalizeUpdater,
} from "@/lib/vendors/netfeedr";
import type { Environment, VendorCardData } from "@/lib/types";

export async function GET(req: NextRequest) {
  const env = (req.nextUrl.searchParams.get("env") || "cxm") as Environment;

  if (env !== "cxm" && env !== "site") {
    return NextResponse.json({ error: "Invalid environment" }, { status: 400 });
  }

  const config = getEnvConfig(env);
  const configStatus = getConfigStatus(env);
  const results: VendorCardData[] = [];
  const errors: { vendor: string; product: string; message: string }[] = [];

  // ── X Usage ─────────────────────────────────
  if (configStatus.x) {
    try {
      const raw = await fetchXUsage(config.x.bearerToken, config.x.appMap);
      results.push(normalizeXUsage(raw, config.x.appMap));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      errors.push({ vendor: "x", product: "X Posts", message: msg });
    }
  }

  // ── Netfeedr Channels ──────────────────────
  if (configStatus.netfeedrChannels) {
    try {
      const raw = await fetchNetfeedrChannels(config.netfeedr.channelsApiKey);
      results.push(normalizeChannels(raw));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      errors.push({ vendor: "netfeedr", product: "Channels", message: msg });
    }
  }

  // ── Netfeedr Search ────────────────────────
  if (configStatus.netfeedrSearch) {
    try {
      const raw = await fetchNetfeedrSearch(config.netfeedr.searchApiKey);
      results.push(normalizeSearch(raw));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      errors.push({ vendor: "netfeedr", product: "Search", message: msg });
    }
  }

  // ── Netfeedr Updater ───────────────────────
  if (configStatus.netfeedrUpdater) {
    try {
      const raw = await fetchNetfeedrUpdater(config.netfeedr.updaterApiKey);
      results.push(normalizeUpdater(raw));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      errors.push({ vendor: "netfeedr", product: "Post Updater", message: msg });
    }
  }

  return NextResponse.json({
    environment: env,
    configStatus,
    data: results,
    errors,
    fetchedAt: new Date().toISOString(),
  });
}
