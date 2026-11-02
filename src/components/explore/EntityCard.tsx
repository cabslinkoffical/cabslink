import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { destinationHref, type Destination } from "@/lib/destinations.functions";

export function EntityCard({ d }: { d: Destination }) {
  const sub = [d.town, d.council, d.region].filter(Boolean).join(", ");
  return (
    <Link
      to={destinationHref(d)}
      className="group flex h-full items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-raised transition hover:border-[var(--gold)]"
    >
      <span className="min-w-0">
        <span className="block font-display text-base font-semibold text-[var(--navy)] group-hover:text-[var(--gold-ink)]">{d.display_name ?? d.name}</span>
        {sub && <span className="mt-0.5 block text-xs text-muted-foreground">{sub}</span>}
      </span>
      <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border text-[var(--navy)] transition group-hover:border-[var(--gold)] group-hover:bg-[var(--gold)] group-hover:text-[var(--gold-foreground)]">
        <ArrowRight className="size-3.5" aria-hidden />
      </span>
    </Link>
  );
}

export function EntityGrid({ items }: { items: Destination[] }) {
  if (!items.length) return null;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((d) => (
        <li key={d.id}>
          <EntityCard d={d} />
        </li>
      ))}
    </ul>
  );
}
