// AI Services — intentionally empty for now. Kept open until we have concrete
// AI providers to integrate (usage/billing endpoints). Placeholder only.
export function AiServicesView() {
  return (
    <div className="bg-white rounded-lg border border-dashed border-gray-border p-12 text-center">
      <h3 className="text-base font-semibold text-navy mb-2">AI Services</h3>
      <p className="text-sm text-gray-text max-w-md mx-auto">
        No AI providers integrated yet. This space is reserved for AI usage and
        spend tracking once we connect services (e.g. model APIs and AI vendors).
      </p>
      <span className="inline-block mt-4 text-[11px] font-medium px-2.5 py-1 rounded-full bg-gray-bg text-gray-text">
        Coming soon
      </span>
    </div>
  );
}
