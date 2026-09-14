import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { CtaBand } from "@/components/site/CtaBand";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import { TourCard } from "@/components/site/TourCard";
import { CustomTourBuilder } from "@/components/site/CustomTourBuilder";
import { listPublishedTours, type PublicTourListItem } from "@/lib/tours.functions";
import { collectionPageSchema } from "@/components/seo/schema";
import { itemListSchema } from "@/lib/seo/hub-head";


const toursQuery = queryOptions({
  queryKey: ["published-tours"],
  queryFn: () => listPublishedTours(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/tours/")({
  // Keys are omitted when empty so bare `/tours` stays a 200 (no 307 rewrite).
  validateSearch: (search: Record<string, unknown>): { q?: string; theme?: string } => {
    const out: { q?: string; theme?: string } = {};
    if (typeof search.q === "string" && search.q.length > 0) out.q = search.q.slice(0, 80);
    if (typeof search.theme === "string" && search.theme.length > 0) out.theme = search.theme.slice(0, 60);
    return out;
  },
  head: ({ loaderData }) => {
    const title = "Private Day Tours & Hourly Hire — Edinburgh & Glasgow | CabsLink";
    const description =
      "Private day tours from Edinburgh and Glasgow with your own driver, booked by the hour with miles included. Choose a ready-made tour or build a custom day with fixed pricing.";
    const url = "https://cabslink.com/tours";
    const tours = (loaderData ?? []) as PublicTourListItem[];
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: "Private Day Tours & Hourly Hire — Edinburgh & Glasgow" },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(
            collectionPageSchema({
              name: title,
              description,
              url,
              breadcrumbs: [
                { name: "Home", url: "/" },
                { name: "Tours", url: "/tours" },
              ],
            }),
          ),
        },
        ...(tours.length > 0
          ? [
              {
                type: "application/ld+json",
                children: JSON.stringify(
                  itemListSchema(
                    "Private driver tours",
                    tours.map((t) => ({ name: t.name, url: `/tours/${t.slug}` })),
                  ),
                ),
              },
            ]
          : []),
      ],
    };
  },

  loader: ({ context }) => context.queryClient.ensureQueryData(toursQuery),
  errorComponent: () => (
    <SiteLayout>
      <div className="container-x section-y text-center">
        <h1 className="font-display text-3xl font-semibold">Tours are temporarily unavailable</h1>
        <p className="mt-3 text-muted-foreground">Please refresh the page in a moment.</p>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => null,
  component: ToursPage,
});

function matchesQuery(t: PublicTourListItem, needle: string) {
  if (!needle) return true;
  const hay = [t.name, t.short_description, t.origin_label, t.destination_label, t.theme]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return needle
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}






function ToursPage() {
  const { data: allTours } = useSuspenseQuery(toursQuery);
  const { q = "", theme = "" } = Route.useSearch();
  const navigate = useNavigate({ from: "/tours/" });

  const setSearch = (next: { q?: string; theme?: string }) =>
    navigate({
      search: (prev) => {
        const merged = { ...prev, ...next };
        return {
          ...(merged.q ? { q: merged.q } : {}),
          ...(merged.theme ? { theme: merged.theme } : {}),
        };
      },
      replace: true,
    });

  const themes = useMemo(
    () =>
      Array.from(new Set(allTours.map((t) => t.theme).filter((t): t is string => !!t))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [allTours],
  );

  // Day trips first; long-day itineraries get their own section below so every
  // published tour page is reachable from this hub (no orphan pages).
  const byFeatured = (a: { featured: boolean }, b: { featured: boolean }) =>
    Number(b.featured) - Number(a.featured);
  const filtered = useMemo(
    () =>
      allTours.filter(
        (t) => matchesQuery(t, q.trim()) && (!theme || (t.theme ?? "").toLowerCase() === theme.toLowerCase()),
      ),
    [allTours, q, theme],
  );
  const tours = filtered.filter((t) => !t.long_day).slice().sort(byFeatured);
  const longDayTours = filtered.filter((t) => t.long_day).slice().sort(byFeatured);
  const isFiltering = !!q.trim() || !!theme;

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Private Driver Tours"
        title="Private day tours and hourly car hire in Scotland"
        subtitle="Booked by the hour with miles included. Take a ready-made tour from Edinburgh or Glasgow, or build your own day — your start, your stops, your finish."

        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Tours" }]}
      />

      <section className="pt-8 sm:pt-10">
        <div className="container-x">
          <CustomTourBuilder
            search={{
              q,
              onQ: (v) => setSearch({ q: v }),
              theme,
              onTheme: (v) => setSearch({ theme: v }),
              themes,
              resultCount: filtered.length,
            }}
          />
        </div>
      </section>

      <section className="section-y">
        <div className="container-x">
          <SectionHeader
            eyebrow="Choose your route"
            title="Tours ready to book"
            titleAccent="today"
            subtitle="Each tour includes a suggested itinerary. Search above by place, name or theme — then edit the stops when you book."
          />


          {tours.length === 0 && longDayTours.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-white/10 bg-[var(--surface)] p-10 text-center">
              <h3 className="font-display text-2xl font-semibold">
                {isFiltering ? "No tours match that search" : "New tours coming soon"}
              </h3>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                {isFiltering
                  ? "Try a different place or clear the filters — or build your own tour above with any start, finish and stops."
                  : "We're finalising itineraries. In the meantime, build your own private day out above and we'll price it."}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {isFiltering && (
                  <Button onClick={() => setSearch({ q: "", theme: "" })}>Clear filters</Button>
                )}
                <Button asChild variant="outline"><Link to="/contact">Talk to us</Link></Button>
                <Button asChild variant="outline"><Link to="/book">Book a transfer</Link></Button>
              </div>
            </div>
          ) : (
            <div className="mt-10 grid items-stretch gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tours.map((t) => (
                <Reveal key={t.slug} className="h-full">
                  <TourCard tour={t} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {longDayTours.length > 0 && (
        <section className="section-y bg-[var(--surface)]/60">
          <div className="container-x">
            <SectionHeader
              eyebrow="Full-day & long-distance"
              title="Longer itineraries for"
              titleAccent="bigger days out"
              subtitle="These routes cover more ground — expect an early start, a longer day with your driver and more time at each stop. Mileage and hours are quoted before you commit."
            />
            <div className="mt-10 grid items-stretch gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {longDayTours.map((t) => (
                <Reveal key={t.slug} className="h-full">
                  <TourCard tour={t} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}


      <CtaBand
        eyebrow="Private tours"
        title="Plan your Scottish tour with a private driver"
        subtitle="Tell us your dates and we will build the itinerary and quote around you."
        primaryLabel="Book now"
        secondaryLabel="Talk to us"
        secondaryTo="/contact"
        tone="gold"
      />

      <section className="section-y bg-[var(--surface)]/60">
        <div className="container-x text-center max-w-3xl mx-auto">
          <SectionHeader
            center
            eyebrow="Something bespoke?"
            title="Design your own"
            titleAccent="private tour"
            subtitle="Send us your must-see stops and preferred pace. We'll build the itinerary and quote it transparently."
          />
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild size="lg"><Link to="/contact">Request a custom tour</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/book">Standard transfer</Link></Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
