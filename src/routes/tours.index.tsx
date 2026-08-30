import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Search, X } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { CtaBand } from "@/components/site/CtaBand";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TourCard } from "@/components/site/TourCard";
import { CustomTourBuilder } from "@/components/site/CustomTourBuilder";
import { listPublishedTours, type PublicTourListItem } from "@/lib/tours.functions";
import { cn } from "@/lib/utils";

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
  head: () => ({
    meta: [
      { title: "Scotland & UK Private Driver Tours — Cabslink" },
      { name: "description", content: "Search private driver tours across Scotland and the UK, or build a custom tour with your own start, finish and stops. Transparent per-mile pricing." },
      { property: "og:title", content: "Private UK Driver Tours — Cabslink" },
      { property: "og:description", content: "Search curated multi-stop driver tours or build your own itinerary with famous stops along the way." },
      { property: "og:url", content: "https://cabslink.com/tours" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/tours" }],
  }),
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
        title="Curated tours. Real drivers. Tailored quotes."
        subtitle="Search a ready-made tour or build your own — pick your start, finish and the famous stops in between."

        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Tours" }]}
      />

      <section className="pt-8 sm:pt-10">
        <div className="container-x">
          <CustomTourBuilder />
        </div>
      </section>

      <section className="section-y">
        <div className="container-x">
          <SectionHeader
            eyebrow="Choose your route"
            title="Tours ready to book"
            titleAccent="today"
            subtitle="Each tour includes a suggested itinerary. Search by place, name or theme — then edit the stops when you book."
          />

          {/* Search + theme filters */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setSearch({ q: e.target.value })}
                placeholder="Search tours — e.g. Loch Ness, whisky, Edinburgh"
                aria-label="Search tours"
                className="h-12 pl-10 pr-10"
              />
              {q && (
                <button
                  type="button"
                  aria-label="Clear tour search"
                  onClick={() => setSearch({ q: "" })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            {themes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSearch({ theme: "" })}
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-xs font-medium transition",
                    !theme
                      ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold-ink)]"
                      : "border-white/15 hover:border-[var(--gold)]/50",
                  )}
                >
                  All themes
                </button>
                {themes.map((th) => (
                  <button
                    key={th}
                    type="button"
                    onClick={() => setSearch({ theme: theme === th ? "" : th })}
                    className={cn(
                      "rounded-full border px-3.5 py-2 text-xs font-medium capitalize transition",
                      theme === th
                        ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold-ink)]"
                        : "border-white/15 hover:border-[var(--gold)]/50",
                    )}
                  >
                    {th.replace(/[-_]/g, " ")}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
            {filtered.length} tour{filtered.length === 1 ? "" : "s"}
            {isFiltering ? " match your search" : " available"}.
          </p>

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
        tone="navy"
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
