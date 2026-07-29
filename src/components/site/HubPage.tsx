/**
 * Shared hub renderer — lists all Tier 1/2 destinations of a given type.
 */
import { Link } from "@tanstack/react-router";
import type { Destination, DestinationType } from "@/lib/destinations.functions";
import { destinationHref } from "@/lib/destinations.functions";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

export function HubPage({
  title,
  intro,
  destinations,
}: {
  title: string;
  intro: string;
  destinations: Destination[];
  type?: DestinationType;
}) {
  const grouped = new Map<string, Destination[]>();
  for (const d of destinations) {
    const key = d.region ?? "United Kingdom";
    const list = grouped.get(key) ?? [];
    list.push(d);
    grouped.set(key, list);
  }
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: title, href: "#" }]} />
      <header className="mt-4 mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-[var(--navy)]">{title}</h1>
        <p className="mt-2 max-w-3xl text-[var(--navy)]/70">{intro}</p>
      </header>
      {destinations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--navy)]/20 bg-white p-8 text-center shadow-raised">
          <p className="text-[var(--navy)]/70">
            We haven't published dedicated pages for this category yet, but we still
            cover every UK postcode. Get a fixed-fare quote in under 30 seconds.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link to="/book" className="rounded-full bg-[var(--gold)] px-6 py-3 font-semibold text-[var(--navy)]">
              Get an instant quote
            </Link>
            <Link to="/areas" className="rounded-full border border-[var(--navy)]/20 px-6 py-3 font-semibold text-[var(--navy)]">
              Browse all locations
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {[...grouped.entries()].map(([region, items]) => (
            <section key={region}>
              <h2 className="mb-3 text-lg font-semibold text-[var(--navy)]">{region}</h2>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((d) => (
                  <li key={d.id}>
                    <Link
                      to={destinationHref(d)}
                      className="block rounded-xl border border-[var(--navy)]/10 bg-white p-4 hover:border-[var(--gold)] shadow-raised hover:shadow-raised-hover"
                    >
                      <span className="block font-medium text-[var(--navy)]">
                        {d.display_name ?? d.name}
                      </span>
                      {(d.council || d.town) && (
                        <span className="block text-xs text-[var(--navy)]/60">
                          {[d.town, d.council].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
