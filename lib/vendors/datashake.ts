import type { VendorCardData } from "../types";

// ── Datashake (placeholder) ─────────────────
// Endpoint not yet available from the vendor. Rendered as a disabled card so the
// dashboard still advertises the integration as planned. No fetch is performed.

export function adaptDatashake(): VendorCardData {
  return {
    vendor: "datashake",
    product: "Datashake",
    category: "data",
    usageModel: "unknown",
    status: "ok",
    placeholder: true,
    primary: { label: "Usage", used: 0, limit: 0 },
    secondary: [],
  };
}
