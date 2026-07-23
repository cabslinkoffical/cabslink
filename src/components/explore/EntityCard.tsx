import { Link } from "@tanstack/react-router";
import { destinationHref, type Destination } from "@/lib/destinations.functions";

export function EntityCard({ d }: { d: Destination }) {
  const sub = [d.town, d.council, d.region].filter(Boolean).join(", ");
  return (
    <Link
      to={destinationHref(d)}
      className="block rounded-xl border border-[var(--navy)]/10 bg-white p-4 transition hover:border-[var(--gold)] hover:shadow-sm"
    >
      <span className="block font-medium text-[var(--navy)]">{d.display_name ?? d.name}</span>
      {sub && <span className="mt-0.5 block text-xs text-[var(--navy)]/60">{sub}</span>}
    </Link>
  );
}

export function EntityGrid({ items }: { items: Destination[] }) {
  if (!items.length) return null;
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((d) => (
        <li key={d.id}>
          <EntityCard d={d} />
        </li>
      ))}
    </ul>
  );
}
