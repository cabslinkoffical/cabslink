import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Plane, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { listDestinationsByType, type Destination } from "@/lib/destinations.functions";

const airportsQuery = queryOptions({
  queryKey: ["destinations", "airports", "all"],
  queryFn: () => listDestinationsByType({ data: { type: "airport", tiers: [1, 2, 3] } }),
});

export const Route = createFileRoute("/airports/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(airportsQuery),
  head: () => ({
    meta: [
      { title: "UK Airport Transfers — Every Major Airport | Cabslink" },
      { name: "description", content: "Fixed-fare private transfers to every major UK airport. Meet & greet, flight tracking, 24/7 dispatch across England, Scotland, Wales and Northern Ireland." },
      { property: "og:title", content: "UK Airport Transfers — Every Major Airport" },
      { property: "og:description", content: "Private transfers to every major UK airport. Fixed fares, meet & greet, flight tracking." },
    ],
  }),
  component: AirportsIndex,
});

function AirportsIndex() {
  const { data: airports } = useSuspenseQuery(airportsQuery);
  const grouped = new Map<string, Destination[]>();
  for (const a of airports) {
    const key = a.region ?? "United Kingdom";
    const list = grouped.get(key) ?? [];
    list.push(a);
    grouped.set(key, list);
  }
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Airport Transfers"
        title="Every major UK airport."
        subtitle="Fixed-fare private transfers with meet & greet, flight tracking and 24/7 dispatch."
      />
      <section className="section-y">
        <div className="container-x space-y-12">
          {[...grouped.entries()].map(([region, list]) => (
            <div key={region}>
              <h2 className="mb-4 font-display text-2xl font-semibold text-[var(--navy)]">{region}</h2>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {list.map((a) => {
                  const iata = (a.meta?.iata as string | undefined) ?? "";
                  return (
                    <Link
                      key={a.id}
                      to="/airports/$iata"
                      params={{ iata: iata.toLowerCase() || a.slug }}
                      className="group relative overflow-hidden rounded-[20px] border border-[var(--navy)]/10 bg-white p-6 hover:border-[var(--gold)] hover:-translate-y-1 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <Plane className="size-6 text-[var(--gold-ink)]" />
                        {iata && <span className="font-mono text-[10px] text-[var(--navy)]/40 tracking-widest">{iata}</span>}
                      </div>
                      <h3 className="mt-6 font-display text-lg font-semibold text-[var(--navy)]">
                        {a.short_name ?? a.name.replace(/ Airport$/, "")}
                      </h3>
                      <p className="text-xs text-[var(--navy)]/55">{a.town ?? a.council ?? a.region}</p>
                      <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-[var(--navy)] group-hover:text-[var(--gold-ink)] group-hover:gap-2 transition-all">
                        Book transfer <ArrowRight className="size-3" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
