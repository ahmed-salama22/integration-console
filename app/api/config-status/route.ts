import { NextResponse } from "next/server";
import { getConfigStatus } from "@/lib/config";
import { isLiteLLMConfigured } from "@/lib/litellm";

export async function GET() {
  return NextResponse.json({
    cxm: getConfigStatus("cxm"),
    site: getConfigStatus("site"),
    litellm: {
      staging: isLiteLLMConfigured("staging"),
      production: isLiteLLMConfigured("production"),
    },
  });
}
