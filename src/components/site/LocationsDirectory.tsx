import { useMemo } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { listDestinationsByTypes } from "@/lib/destinations.functions";
import { listPublishedTours } from "@/lib/tours.functions";
import { JOURNEYS, journeyPath } from "@/lib/seo/journeys";

/**
 * Stable hash of the current path so every page surfaces a different slice of
 * the directory — the section is an internal-linking hub, so repeating the same
 * four rows site-wide wastes it.
 */
function pathSeed(path: string): number {
  let h = 0;
  for (let i = 0; i < path.length; i++) h = (h * 31 + path.charCodeAt(i)) % 100003;
  return h;
}

/** Rotating window over a list; wraps around so it is always `count` long. */
function rotate<T>(list: T[], seed: number, count: number): T[] {
  if (list.length === 0) return [];
  const start = seed % list.length;
  return Array.from({ length: Math.min(count, list.length) }, (_, i) => list[(start + i) % list.length]!);
}


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

/**
 * Static fallbacks so all three columns render on every page, including the
 * server-rendered HTML before the live location/tour queries resolve.
 */
const FALLBACK_LOCATIONS: Item[] = [
  { key: "edinburgh", label: "Edinburgh", meta: "Lothian", to: "/areas/edinburgh" },
  { key: "glasgow", label: "Glasgow", meta: "Strathclyde", to: "/areas/glasgow" },
  { key: "aberdeen", label: "Aberdeen", meta: "Aberdeenshire", to: "/areas/aberdeen" },
  { key: "inverness", label: "Inverness", meta: "Highlands", to: "/areas/inverness" },
];

const FALLBACK_TOURS: Item[] = [
  { key: "loch-ness-and-the-highlands", label: "Loch Ness & the Highlands", meta: "Full day", to: "/tours" },
  { key: "st-andrews-and-fife-coast", label: "St Andrews & the Fife Coast", meta: "Full day", to: "/tours" },
  { key: "loch-lomond-and-the-trossachs", label: "Loch Lomond & the Trossachs", meta: "Half day", to: "/tours" },
  { key: "speyside-whisky-trail", label: "Speyside Whisky Trail", meta: "Full day", to: "/tours" },
];

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
      <h3 className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--gold-ink)]">
        {title}
      </h3>
      <ul className="mt-3">
        {items.map((it) => (
          <li key={it.key} className="border-b border-[var(--navy)]/10">
            <Link to={it.to} className="group flex items-center justify-between gap-3 py-2.5">
              <span className="min-w-0">
                <span className="block truncate font-display text-[15px] font-semibold sm:text-base text-[var(--navy)] transition-colors group-hover:text-[var(--gold-ink)]">
                  {it.label}
                </span>
                {it.meta ? (
                  <span className="mt-0.5 block truncate text-[10px] uppercase tracking-[0.12em] text-[var(--navy)]/45">
                    {it.meta}
                  </span>
                ) : null}
              </span>
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-[var(--navy)]/15 text-[var(--navy)]/70 transition-all group-hover:border-[var(--gold)] group-hover:bg-[var(--gold)] group-hover:text-[var(--gold-foreground)]">
                <ArrowRight className="size-3.5 -rotate-45 transition-transform group-hover:rotate-0" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        to={ctaTo}
        className="mt-3 inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold text-[var(--navy)] transition-all hover:gap-3 hover:text-[var(--gold-ink)]"
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
      cities.length === 0
        ? FALLBACK_LOCATIONS.slice(0, limit)
        : [...cities]
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
    if (tours.length === 0) return FALLBACK_TOURS.slice(0, limit);
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
    <section className="bg-background py-12 md:py-16">
      <div className="container-x">
        <div className="max-w-2xl">
          <p className="eyebrow-gold text-[11px]">{eyebrow}</p>
          <h2 className="mt-2.5 font-display text-3xl font-bold leading-[1.05] text-[var(--navy)] sm:text-4xl">
            {heading}
            <span className="text-[var(--gold-ink)]">{headingAccent}</span>
          </h2>
          {intro ? (
            <p className="mt-3 text-sm leading-relaxed text-[var(--navy)]/65">{intro}</p>
          ) : null}
        </div>

        <div className="mt-7 grid gap-7 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3 lg:gap-x-12">
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
