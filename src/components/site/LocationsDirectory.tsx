import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { listDestinationsByTypes } from "@/lib/destinations.functions";
import { listPublishedTours } from "@/lib/tours.functions";
import { JOURNEYS, journeyPath } from "@/lib/seo/journeys";

export const locationsDirectoryQuery = {
  queryKey: ["destinations", "locations-directory"] as const,
  queryFn: () => listDestinationsByTypes({ data: { types: ["city", "town"], tiers: [1, 2, 3] } }),
  staleTime: 10 * 60_000,
};

const directoryToursQuery = queryOptions({
  queryKey: ["published-tours"],
  queryFn: () => listPublishedTours(),
  staleTime: 60_000,
});

type Item = { key: string; label: string; meta?: string; to: string };

function DirectoryColumn({
  title,
  items,
  ctaLabel,
  ctaTo,
}: {
  title: string;
  items: Item[];
  ctaLabel: string;
  ctaTo: string;
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <h3 className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--gold-ink)]">
        {title}
      </h3>
      <ul className="mt-5">
        {items.map((it) => (
          <li key={it.key} className="border-b border-[var(--navy)]/10">
            <Link to={it.to} className="group flex items-center justify-between gap-4 py-4">
              <span className="min-w-0">
                <span className="block truncate font-display text-lg font-semibold text-[var(--navy)] transition-colors group-hover:text-[var(--gold-ink)]">
                  {it.label}
                </span>
                {it.meta ? (
                  <span className="mt-0.5 block text-[11px] uppercase tracking-[0.14em] text-[var(--navy)]/45">
                    {it.meta}
                  </span>
                ) : null}
              </span>
              <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--navy)]/15 text-[var(--navy)]/70 transition-all group-hover:border-[var(--gold)] group-hover:bg-[var(--gold)] group-hover:text-[var(--gold-foreground)]">
                <ArrowRight className="size-4 -rotate-45 transition-transform group-hover:rotate-0" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        to={ctaTo}
        className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--navy)] transition-all hover:gap-3 hover:text-[var(--gold-ink)]"
      >
        {ctaLabel} <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

/**
 * Site-wide directory — popular locations, transfers and tours as crawlable
 * lists on a light background beneath the closing CTA.
 */
export function LocationsDirectory({
  eyebrow = "— Popular with our clients",
  heading = "Where we ",
  headingAccent = "drive.",
  intro,
  limit = 4,
}: {
  eyebrow?: string;
  heading?: string;
  headingAccent?: string;
  intro?: string;
  limit?: number;
}) {
  const { data: cities = [] } = useQuery(locationsDirectoryQuery);
  const { data: tours = [] } = useQuery(directoryToursQuery);

  const locationItems = useMemo<Item[]>(
    () =>
      [...cities]
        .sort((a, b) => (a.seo_tier ?? 9) - (b.seo_tier ?? 9) || a.name.localeCompare(b.name))
        .slice(0, limit)
        .map((d) => ({
          key: d.slug,
          label: d.name,
          meta: d.region ?? undefined,
          to: `/areas/${d.slug}`,
        })),
    [cities, limit],
  );

  const transferItems = useMemo<Item[]>(
    () =>
      JOURNEYS.slice(0, limit).map((j) => ({
        key: j.slug,
        label: `${j.from.name} to ${j.to.name}`,
        meta: `${j.miles} miles · ${j.via}`,
        to: journeyPath(j.slug),
      })),
    [limit],
  );

  const tourItems = useMemo<Item[]>(() => {
    const sorted = [...tours].sort(
      (a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name),
    );
    return sorted.slice(0, limit).map((t) => ({
      key: t.slug,
      label: t.name,
      meta: t.theme ?? t.origin_label ?? undefined,
      to: `/tours/${t.slug}`,
    }));
  }, [tours, limit]);

  if (locationItems.length === 0 && transferItems.length === 0 && tourItems.length === 0) {
    return null;
  }

  return (
    <section className="section-y bg-background">
      <div className="container-x">
        <div className="max-w-2xl">
          <p className="eyebrow-gold text-[11px]">{eyebrow}</p>
          <h2 className="mt-3 font-display text-4xl font-bold leading-[1.05] text-[var(--navy)] md:text-5xl">
            {heading}
            <span className="text-[var(--gold-ink)]">{headingAccent}</span>
          </h2>
          {intro ? (
            <p className="mt-4 leading-relaxed text-[var(--navy)]/65">{intro}</p>
          ) : null}
        </div>

        <div className="mt-10 grid gap-10 md:grid-cols-2 lg:grid-cols-3 lg:gap-x-14">
          <DirectoryColumn
            title="Popular locations"
            items={locationItems}
            ctaLabel="All locations"
            ctaTo="/areas"
          />
          <DirectoryColumn
            title="Popular transfers"
            items={transferItems}
            ctaLabel="All transfer routes"
            ctaTo="/routes"
          />
          <DirectoryColumn
            title="Popular tours"
            items={tourItems}
            ctaLabel="All private tours"
            ctaTo="/tours"
          />
        </div>
      </div>
    </section>
  );
}
