// ── F4 — Infrastructure health monitor ──────
// Registry of upstream status feeds plus the parsers that collapse each feed
// into a per-service breakdown. All feeds are fetched server-side (see
// app/api/infra/route.ts) so the browser never hits a CORS wall.
//
//   CloudFlare → Statuspage components.json (per-service status)
//   AWS        → one RSS feed PER service we depend on (eu-west-1, Ireland)
//   GCP        → incidents.json, matched against the products we run (KSA)

export type InfraState = "up" | "warn" | "down" | "unknown";

export type PollType =
  | "cloudflare-components"
  | "aws-service-rss"
  | "gcp-products-json";

export interface InfraService {
  id: string;
  displayName: string;
  icon: string; // path under /public
  statusPage: string; // public status page (rendered as a link)
  pollType: PollType;
  pollIntervalMinutes: number;
  statusUrl?: string; // single-endpoint feeds (CloudFlare, GCP)
  regions?: string[];
  rssServices?: { name: string; url: string }[]; // AWS per-service feeds
  products?: string[]; // GCP products of interest
}

/** One row in a provider's service-level breakdown. */
export interface InfraComponent {
  name: string;
  status: InfraState;
  detail?: string;
}

export interface InfraStatus {
  id: string;
  displayName: string;
  icon: string;
  statusPage: string;
  status: InfraState; // overall, worst of components
  description?: string;
  components: InfraComponent[];
  lastChecked: string;
}

// AWS services we depend on → their per-service RSS feed code (eu-west-1).
// Aurora has no dedicated feed; it shares the RDS feed.
const AWS_RSS = "https://status.aws.amazon.com/rss";
const AWS_SERVICES: { name: string; code: string }[] = [
  { name: "EC2", code: "ec2-eu-west-1" },
  { name: "RDS", code: "rds-eu-west-1" },
  { name: "Aurora Database", code: "rds-eu-west-1" },
  { name: "Lambda", code: "lambda-eu-west-1" },
  { name: "EKS", code: "eks-eu-west-1" },
  { name: "Elastic Load Balancing", code: "elb-eu-west-1" },
  { name: "NAT Gateway", code: "natgateway-eu-west-1" },
  { name: "S3", code: "s3-eu-west-1" },
  { name: "CloudFront", code: "cloudfront" },
];

// GCP products we run (KSA / me-central2).
const GCP_PRODUCTS = [
  "Google Compute Engine",
  "AlloyDB for PostgreSQL",
  "Google Cloud SQL",
  "Cloud Load Balancing",
  "Google Kubernetes Engine",
  "Google Cloud Storage",
  "Google Cloud Functions",
  "Cloud Memorystore",
];

export const INFRA_REGISTRY: InfraService[] = [
  {
    id: "cloudflare",
    displayName: "CloudFlare",
    icon: "/infra/cloudflare.svg",
    statusPage: "https://new.cloudflarestatus.com/",
    statusUrl: "https://www.cloudflarestatus.com/api/v2/components.json",
    pollType: "cloudflare-components",
    pollIntervalMinutes: 5,
  },
  {
    id: "aws",
    displayName: "AWS Ireland",
    icon: "/infra/aws.svg",
    statusPage: "https://health.aws.amazon.com/health/status",
    pollType: "aws-service-rss",
    pollIntervalMinutes: 5,
    regions: ["eu-west-1"],
    rssServices: AWS_SERVICES.map((s) => ({
      name: s.name,
      url: `${AWS_RSS}/${s.code}.rss`,
    })),
  },
  {
    id: "gcp",
    displayName: "GCP Saudi Arabia",
    icon: "/infra/gcp.svg",
    statusPage: "https://status.cloud.google.com/regional/middle-east",
    statusUrl: "https://status.cloud.google.com/incidents.json",
    pollType: "gcp-products-json",
    pollIntervalMinutes: 5,
    regions: ["me-central2"], // Dammam, KSA
    products: GCP_PRODUCTS,
  },
];

// ── Helpers ─────────────────────────────────

const RANK: Record<InfraState, number> = { down: 3, warn: 2, up: 1, unknown: 0 };

function worst(states: InfraState[]): InfraState {
  return states.reduce<InfraState>((acc, s) => (RANK[s] > RANK[acc] ? s : acc), "up");
}

function byWorst(a: InfraComponent, b: InfraComponent): number {
  return RANK[b.status] - RANK[a.status] || a.name.localeCompare(b.name);
}

type Parsed = Pick<InfraStatus, "status" | "description" | "components">;

// ── CloudFlare (components.json) ─────────────

interface CfComponent {
  id: string;
  name: string;
  status: string;
  group?: boolean;
  group_id?: string | null;
}

function cfState(status: string): InfraState {
  switch (status) {
    case "operational":
    case "under_maintenance":
      return "up";
    case "degraded_performance":
    case "partial_outage":
      return "warn";
    case "major_outage":
      return "down";
    default:
      return "unknown";
  }
}

function parseCloudflare(json: { components?: CfComponent[] }): Parsed {
  const comps = json.components ?? [];
  const group = comps.find((c) => c.group && c.name === "Cloudflare Sites and Services");
  const children = group
    ? comps.filter((c) => c.group_id === group.id)
    : comps.filter((c) => !c.group);

  const components: InfraComponent[] = children
    .map((c) => ({
      name: c.name,
      status: cfState(c.status),
      detail: c.status.replace(/_/g, " "),
    }))
    .sort(byWorst);

  const impacted = components.filter((c) => c.status !== "up").length;
  return {
    status: worst(components.map((c) => c.status)),
    description: impacted
      ? `${impacted} of ${components.length} services impacted`
      : `All ${components.length} services operational`,
    components,
  };
}

// ── AWS (per-service RSS) ────────────────────

/** Status of one service from its RSS feed. Empty/old/resolved → up. */
function awsRssState(xml: string): InfraState {
  const items = xml.match(/<item[\s\S]*?<\/item>/g) ?? [];
  if (items.length === 0) return "up";
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  for (const item of items) {
    const title = (item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "")
      .replace(/<!\[CDATA\[|\]\]>/g, "")
      .trim();
    const pub = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim();
    if (pub) {
      const age = now - new Date(pub).getTime();
      if (Number.isFinite(age) && age > DAY) continue; // stale → ignore
    }
    // Healthy/closing updates — not an active issue.
    if (/resolved|operating normally|has been resolved/i.test(title)) continue;
    return /outage|unavailable|is down/i.test(title) ? "down" : "warn";
  }
  return "up";
}

async function pollAwsServices(svc: InfraService): Promise<Parsed> {
  const feeds = svc.rssServices ?? [];
  const results = await Promise.all(
    feeds.map(async (f): Promise<InfraComponent> => {
      try {
        const res = await fetch(f.url, { next: { revalidate: 300 } });
        if (!res.ok) return { name: f.name, status: "unknown" };
        return { name: f.name, status: awsRssState(await res.text()) };
      } catch {
        return { name: f.name, status: "unknown" };
      }
    })
  );
  const components = results.sort(byWorst);
  const impacted = components.filter((c) => c.status === "warn" || c.status === "down").length;
  return {
    status: worst(components.map((c) => c.status)),
    description: impacted
      ? `${impacted} of ${components.length} services impacted`
      : `All ${components.length} services operational`,
    components,
  };
}

// ── GCP (incidents.json → our products) ──────

interface GcpIncident {
  end?: string | null;
  severity?: string;
  status_impact?: string;
  external_desc?: string;
  affected_products?: { title: string; id: string }[];
  currently_affected_locations?: { id?: string; title?: string }[];
}

function titleMatch(a: string, b: string): boolean {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x.includes(y) || y.includes(x);
}

function parseGcpProducts(
  incidents: GcpIncident[],
  products: string[] | undefined,
  regions: string[] | undefined
): Parsed {
  const list = products ?? [];
  const regionId = regions?.[0];
  const active = incidents.filter((i) => !i.end);
  const relevant = active.filter((i) => {
    if (!regionId) return true;
    const locs = (i.currently_affected_locations ?? []).map((l) => l.id ?? "");
    if (locs.length === 0) return true; // global incident
    return locs.some((id) => id.includes(regionId));
  });

  // Worst state per product name we care about.
  const stateBy = new Map<string, { state: InfraState; detail?: string }>();
  for (const inc of relevant) {
    const sev: InfraState =
      inc.severity === "high" || inc.status_impact === "SERVICE_OUTAGE" ? "down" : "warn";
    for (const p of inc.affected_products ?? []) {
      for (const prod of list) {
        if (!titleMatch(p.title, prod)) continue;
        const cur = stateBy.get(prod);
        if (!cur || RANK[sev] > RANK[cur.state]) {
          stateBy.set(prod, { state: sev, detail: inc.external_desc });
        }
      }
    }
  }

  const components: InfraComponent[] = list
    .map((prod) => ({
      name: prod,
      status: stateBy.get(prod)?.state ?? "up",
      detail: stateBy.get(prod)?.detail,
    }))
    .sort(byWorst);

  const impacted = components.filter((c) => c.status !== "up").length;
  return {
    status: worst(components.map((c) => c.status)),
    description: impacted
      ? `${impacted} of ${components.length} products impacted`
      : `All ${components.length} products operational`,
    components,
  };
}

// ── Poller ──────────────────────────────────

/** Fetch + parse a single provider. Never throws — failures fall back to unknown. */
export async function pollService(svc: InfraService): Promise<InfraStatus> {
  const base: InfraStatus = {
    id: svc.id,
    displayName: svc.displayName,
    icon: svc.icon,
    statusPage: svc.statusPage,
    status: "unknown",
    components: [],
    lastChecked: new Date().toISOString(),
  };

  try {
    if (svc.pollType === "aws-service-rss") {
      return { ...base, ...(await pollAwsServices(svc)) };
    }

    const res = await fetch(svc.statusUrl!, {
      next: { revalidate: 300 },
      headers: { Accept: "application/json, */*" },
    });
    if (!res.ok) return base;

    if (svc.pollType === "gcp-products-json") {
      return { ...base, ...parseGcpProducts(await res.json(), svc.products, svc.regions) };
    }
    return { ...base, ...parseCloudflare(await res.json()) };
  } catch {
    return base;
  }
}
