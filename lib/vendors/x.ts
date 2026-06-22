import type { XUsageResponse, VendorCardData } from "../types";
import { evaluateStatus } from "../alerts";

export async function fetchXUsage(
  bearerToken: string,
  appMap: Record<string, string>,
  days: number = 30
): Promise<XUsageResponse> {
  const url = `https://api.x.com/2/usage/tweets?days=${days}&usage.fields=daily_client_app_usage,daily_project_usage,cap_reset_day,project_cap,project_id,project_usage`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${bearerToken}` },
    next: { revalidate: 300 }, // cache 5 min
  });

  if (!res.ok) {
    throw new Error(`X API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export function normalizeXUsage(
  raw: XUsageResponse,
  appMap: Record<string, string>
): VendorCardData {
  const d = raw.data;
  const used = Number(d.project_usage);
  const cap = Number(d.project_cap);

  // Calculate days left in billing cycle
  const resetDay = d.cap_reset_day;
  const now = new Date();
  let resetDate = new Date(now.getFullYear(), now.getMonth(), resetDay);
  if (resetDate <= now) {
    resetDate = new Date(now.getFullYear(), now.getMonth() + 1, resetDay);
  }
  const daysLeft = Math.ceil(
    (resetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Build period start/end from cap_reset_day
  let periodStart = new Date(now.getFullYear(), now.getMonth(), resetDay);
  if (periodStart > now) {
    periodStart = new Date(now.getFullYear(), now.getMonth() - 1, resetDay);
  }
  const periodEnd = new Date(resetDate);
  const periodStartIso = periodStart.toISOString().split("T")[0];

  // Daily usage — filter to current billing period only
  const allDaily = (d.daily_project_usage?.usage || []).map((u) => ({
    date: u.date,
    value: Number(u.usage),
  }));
  const dailyUsage = allDaily.filter((u) => u.date.split("T")[0] >= periodStartIso);

  // Per-app breakdown — also filter to current billing period
  const appBreakdown = (d.daily_client_app_usage || []).map((app) => ({
    appId: app.client_app_id,
    appName: appMap[app.client_app_id] || `App ${app.client_app_id}`,
    usage: app.usage
      .filter((u) => u.date.split("T")[0] >= periodStartIso)
      .reduce((sum, u) => sum + Number(u.usage), 0),
  }));

  return {
    vendor: "x",
    product: "X Posts",
    status: evaluateStatus(used, cap),
    primary: {
      label: "Posts Consumed",
      used,
      limit: cap,
    },
    secondary: [],
    period: {
      start: periodStart.toISOString(),
      end: periodEnd.toISOString(),
      daysLeft,
    },
    dailyUsage,
    appBreakdown,
  };
}
