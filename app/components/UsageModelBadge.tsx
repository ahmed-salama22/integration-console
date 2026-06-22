import type { UsageModel } from "@/lib/types";

// F6 — usage-model label. One pill per model, color-coded so the operator can
// tell a burn-down quota apart from a fixed catalogue at a glance.
const STYLES: Record<UsageModel, { label: string; className: string }> = {
  quota: { label: "Quota", className: "bg-blue-pale text-blue-mid" },
  "rate-limited": { label: "Rate limited", className: "bg-[#ede9fe] text-purple" },
  "fixed-subscription": { label: "Fixed Subscription", className: "bg-[#dcfce7] text-[#15803d]" },
  unknown: { label: "TBD", className: "bg-gray-bg text-gray-text" },
};

export function UsageModelBadge({ model }: { model: UsageModel }) {
  const { label, className } = STYLES[model];
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  );
}
