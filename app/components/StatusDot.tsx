"use client";

export function StatusDot({ status }: { status: "ok" | "warning" | "critical" }) {
  const color =
    status === "critical"
      ? "bg-red"
      : status === "warning"
        ? "bg-[#f59e0b]"
        : "bg-[#22c55e]";

  return (
    <span className="relative flex h-2.5 w-2.5">
      {status !== "ok" && (
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-40`}
        />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
    </span>
  );
}
