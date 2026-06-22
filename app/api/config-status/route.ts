import { NextResponse } from "next/server";
import { getConfigStatus } from "@/lib/config";

export async function GET() {
  return NextResponse.json({
    cxm: getConfigStatus("cxm"),
    site: getConfigStatus("site"),
  });
}
