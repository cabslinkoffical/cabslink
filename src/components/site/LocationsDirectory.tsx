import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { listDestinationsByTypes } from "@/lib/destinations.functions";

export const locationsDirectoryQuery = {
  queryKey: ["destinations", "locations-directory"] as const,
  queryFn: () => listDestinationsByTypes({ data: { types: ["city", "town"], tiers: [1, 2, 3] } }),
  staleTime: 10 * 60_000,
};

/**
 * Site-wide locations directory — a plain, crawlable list of the area pages,
 * rendered on a light background beneath the closing CTA.
 */
export function LocationsDirectory({
  eyebrow = "— Locations",
  heading = "Where we ",
  headingAccent = "drive.",
  intro,
  limit = 16,
}: {
  eyebrow?: string;
  heading?: string;
  headingAccent?: string;
  intro?: string;
  limit?: number;
}) {
  const { data: cities = [] } = useQuery(locationsDirectoryQuery);

  const items = useMemo(
    () =>
      [...cities]
        .sort((a, b) => (a.seo_tier ?? 9) - (b.seo_tier ?? 9) || a.name.localeCompare(b.name))
        .slice(0, limit),
    [cities, limit],
  );

  if (items.length === 0) return null;

  return (
    <section className="section-y bg-background">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow-gold text-[11px]">{eyebrow}</p>
            <h2 className="mt-3 font-display text-4xl md:text-5xl font-bold leading-[1.05] text-[var(--navy)]">
              {heading}
              <span className="text-[var(--gold-ink)]">{headingAccent}</span>
            </h2>
            {intro ? (
              <p className="mt-4 max-w-xl leading-relaxed text-[var(--navy)]/65">{intro}</p>
            ) : null}
          </div>
          <Link
            to="/areas"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--navy)]/70 hover:text-[var(--gold-ink)] transition-colors"
          >
            All locations <ArrowRight className="size-4" />
          </Link>
        </div>

        <ul className="mt-10 grid gap-x-12 md:grid-cols-2">
          {items.map((d) => (
            <li key={d.slug} className="border-b border-[var(--navy)]/10">
              <Link
                to="/areas/$slug"
                params={{ slug: d.slug }}
                className="group flex items-center justify-between gap-6 py-4"
              >
                <span className="min-w-0">
                  <span className="font-display text-lg md:text-xl font-semibold text-[var(--navy)] group-hover:text-[var(--gold-ink)] transition-colors">
                    {d.name}
                  </span>
                  {d.region ? (
                    <span className="ml-3 text-xs uppercase tracking-[0.14em] text-[var(--navy)]/45">
                      {d.region}
                    </span>
                  ) : null}
                </span>
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--navy)]/15 text-[var(--navy)]/70 transition-all group-hover:border-[var(--gold)] group-hover:bg-[var(--gold)] group-hover:text-[var(--gold-foreground)]">
                  <ArrowRight className="size-4 -rotate-45 group-hover:rotate-0 transition-transform" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
