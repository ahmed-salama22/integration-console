import type { EMediaChannel, EMediaResponse, VendorCardData } from "../types";

// ── eMedia (TV & Radio) ─────────────────────
// Fixed subscription: a channel catalogue, not a consumption quota. There is no
// "limit" to burn down — we surface the catalogue size and its coverage instead
// of a gauge. Endpoint + auth are config-driven since they vary per deployment.

export async function fetchEMedia(
  apiUrl: string,
  username: string,
  password: string
): Promise<EMediaResponse> {
  const auth = Buffer.from(`${username}:${password}`).toString("base64");
  const res = await fetch(apiUrl, {
    headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`eMedia: ${res.status} ${res.statusText}`);
  const json = await res.json();
  // Tolerate `{ data: [...] }`, a bare array, or `{ channels: [...] }`.
  if (Array.isArray(json)) return { data: json };
  if (Array.isArray(json?.channels)) return { data: json.channels };
  return json;
}

/** "ar, en, es, fr +6" — first few codes plus an overflow count. */
function summarizeLanguages(channels: EMediaChannel[]): string {
  const langs = [...new Set(channels.map((c) => c.language).filter(Boolean))] as string[];
  if (langs.length === 0) return "—";
  const head = langs.slice(0, 4).join(", ");
  const rest = langs.length - 4;
  return rest > 0 ? `${head} +${rest}` : head;
}

// eMedia returns full country names; map the MENA markets to short display labels.
const MENA_LABELS: Record<string, string> = {
  "saudi arabia": "SA",
  "united arab emirates": "UAE",
  qatar: "QA",
  kuwait: "KW",
  bahrain: "BH",
  oman: "OM",
  egypt: "EG",
  jordan: "JO",
  lebanon: "LB",
  iraq: "IQ",
  morocco: "MA",
};

/** Top MENA markets by channel count, e.g. "SA 27, UAE 25, QA 11". */
function summarizeMena(channels: EMediaChannel[]): string {
  const counts = new Map<string, number>();
  for (const c of channels) {
    const label = MENA_LABELS[c.country?.toLowerCase() ?? ""];
    if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  return top.length ? top.map(([cc, n]) => `${cc} ${n}`).join(", ") : "—";
}

export function normalizeEMedia(raw: EMediaResponse): VendorCardData {
  const channels = raw.data ?? [];
  const tvCount = channels.filter((c) => c.mediaType === 1).length;
  const radioCount = channels.filter((c) => c.mediaType === 2).length;
  const total = channels.length;

  return {
    vendor: "emedia",
    product: "eMedia (TV & Radio)",
    category: "data",
    usageModel: "fixed-subscription",
    status: "ok",
    headline: {
      value: `${total} channels`,
      sub: `📺 ${tvCount} TV   📻 ${radioCount} Radio`,
    },
    primary: { label: "Channels", used: total, limit: total },
    channels: [...channels]
      // TV first, then radio; alphabetical within each group.
      .sort((a, b) => a.mediaType - b.mediaType || a.name.localeCompare(b.name))
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type ?? (c.mediaType === 1 ? "TV" : "Radio"),
        mediaType: c.mediaType,
        country: c.country,
        language: c.language,
        city: (c as { city?: string }).city,
      })),
    secondary: [
      {
        label: "Languages",
        used: 0,
        limit: 0,
        unit: summarizeLanguages(channels),
        kind: "info",
      },
      {
        label: "MENA",
        used: 0,
        limit: 0,
        unit: summarizeMena(channels),
        kind: "info",
      },
    ],
  };
}
