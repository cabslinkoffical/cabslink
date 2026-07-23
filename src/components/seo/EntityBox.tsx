import type { Destination } from "@/lib/destinations.functions";

/** Semantic entity card for AEO. */
export function EntityBox({ d }: { d: Destination }) {
  const facts = [
    ["Type", d.type.replace(/_/g, " ")],
    ["Region", d.region],
    ["Council", d.council],
    ["Town", d.town],
    d.lat && d.lng ? ["Coordinates", `${d.lat.toFixed(4)}, ${d.lng.toFixed(4)}`] : null,
  ].filter(Boolean) as Array<[string, string]>;
  return (
    <aside
      itemScope
      itemType="https://schema.org/Place"
      className="rounded-2xl border border-[var(--navy)]/10 bg-white p-5"
    >
      <h3 itemProp="name" className="text-lg font-semibold text-[var(--navy)]">
        {d.display_name ?? d.name}
      </h3>
      <dl className="mt-3 grid grid-cols-1 gap-2 text-sm">
        {facts.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <dt className="text-[var(--navy)]/60 capitalize">{k}</dt>
            <dd className="text-[var(--navy)] text-right">{v}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
