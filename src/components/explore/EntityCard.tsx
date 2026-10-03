import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { destinationHref, type Destination } from "@/lib/destinations.functions";

export function EntityCard({ d }: { d: Destination }) {
  const sub = [d.town, d.council, d.region].filter(Boolean).join(", ");
  return (
    <Link
      to={destinationHref(d)}
      className="group flex min-h-24 items-end justify-between gap-4 border-b border-border bg-card px-1 py-4 transition-colors hover:border-gold"
    >
      <span className="min-w-0">
        <span className="block font-display text-lg font-semibold text-foreground">{d.display_name ?? d.name}</span>
        {sub && <span className="mt-1 block text-xs text-muted-foreground">{sub}</span>}
      </span>
      <ArrowUpRight className="mb-1 size-4 shrink-0 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gold" />
    </Link>
  );
}

export function EntityGrid({ items }: { items: Destination[] }) {
  if (!items.length) return null;
  return (
    <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((d) => (
        <li key={d.id}>
          <EntityCard d={d} />
        </li>
      ))}
    </ul>
  );
}
