import { NextResponse } from "next/server";
import { INFRA_REGISTRY, pollService } from "@/lib/infra";

// Aggregate proxy: fetch every infra status feed server-side (avoids CORS) and
// return them together. The side panel refreshes all services at once, so a
// single round-trip is simpler than per-service routes.
export async function GET() {
  const services = await Promise.all(INFRA_REGISTRY.map(pollService));
  return NextResponse.json({
    services,
    checkedAt: new Date().toISOString(),
  });
}
