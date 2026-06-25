import { NextRequest, NextResponse } from "next/server";
import { getAiServices, type AiEnv } from "@/lib/litellm";

// AI Services — usage + health from the per-environment LiteLLM proxy. Fetched
// server-side so the proxy key never reaches the browser. Mirrors /api/infra.
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("env");
  const env: AiEnv = raw === "production" ? "production" : "staging";
  const data = await getAiServices(env);
  return NextResponse.json(data);
}
