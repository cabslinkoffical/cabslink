import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, MapPin, Star } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import { listPublishedTours, type PublicTourListItem } from "@/lib/tours.functions";

const toursQuery = queryOptions({
  queryKey: ["published-tours"],
  queryFn: () => listPublishedTours(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/tours/")({
  head: () => ({
    meta: [
      { title: "Scotland & UK Private Driver Tours — Cabslink" },
      { name: "description", content: "Private private tours across Scotland and the UK. Curated multi-stop itineraries with transparent per-mile pricing and hand-picked famous stops." },
      { property: "og:title", content: "Private UK Driver Tours — Cabslink" },
      { property: "og:description", content: "Curated multi-stop driver tours. See Scotland's icons with a private driver, transparent pricing, no hidden fees." },
      { property: "og:url", content: "https://cabslink.lovable.app/tours" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.lovable.app/tours" }],
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

function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function TourCard({ tour }: { tour: PublicTourListItem }) {
  const duration = formatDuration(tour.direct_duration_seconds);
  return (
    <Link
      to="/tours/$slug"
      params={{ slug: tour.slug }}
      className="group flex h-full flex-col overflow-hidden rounded-[28px] bg-white ring-1 ring-[var(--navy)]/8 transition-all shadow-raised hover:shadow-raised-hover"
    >
      {/* Media — identical ratio on every card */}
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-[var(--navy)]/90">
        {tour.hero_image_url ? (
          <img
            src={tour.hero_image_url}
            alt={`${tour.name} private tour`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="h-full w-full bg-[var(--navy)]" />
        )}

        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          {tour.featured ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--gold)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--navy)] shadow-sm">
              <Star className="size-3 fill-current" /> Signature
            </span>
          ) : (
            <span />
          )}
          {duration && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-[var(--navy)] backdrop-blur">
              <Clock className="size-3" /> {duration}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="font-display text-lg sm:text-xl font-semibold leading-snug text-[var(--navy)] line-clamp-2 min-h-[3.25rem]">
          {tour.name}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--navy)]/65 line-clamp-2 min-h-[2.5rem]">
          {tour.short_description ?? "Private door-to-door day tour with a professional driver."}
        </p>

        <div className="mt-3.5 flex min-h-[1.25rem] flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-[var(--navy)]/70">
          {tour.origin_label && tour.destination_label && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5 text-[var(--gold)]" />
              {tour.origin_label} → {tour.destination_label}
            </span>
          )}
          {tour.recommended_stop_count > 0 && (
            <span className="inline-flex items-center gap-1">
              <span className="size-1 rounded-full bg-[var(--navy)]/30" />
              {tour.recommended_stop_count} stops
            </span>
          )}
        </div>

        {/* Footer pinned to bottom — enquire only, no pricing */}
        <div className="mt-auto pt-5">
          <div className="h-px w-full bg-[var(--navy)]/8" />
          <span className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[var(--navy)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all group-hover:bg-[var(--gold)] group-hover:text-[var(--navy)]">
            Enquire about this tour
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}



function ToursPage() {
  const { data: allTours } = useSuspenseQuery(toursQuery);
  // Day trips only — exclude long-day / multi-day itineraries.
  // Featured tours first, but every card renders identically.
  const tours = allTours
    .filter((t) => !t.long_day)
    .slice()
    .sort((a, b) => Number(b.featured) - Number(a.featured));



  return (
    <SiteLayout>
      <PageHero
        eyebrow="Private Driver Tours"
        title="Curated tours. Real drivers. Transparent prices."
        subtitle="Pick a route, choose your stops, and travel in comfort with a professional driver. Every itinerary is priced live — no fabricated fares."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Tours" }]}
      />

      <section className="section-y">
        <div className="container-x">
          <SectionHeader
            eyebrow="Choose your route"
            title="Tours ready to book"
            titleAccent="today"
            subtitle="Each tour includes a suggested itinerary. Customise stops and duration during booking — the price updates live."
          />

          {tours.length === 0 ? (
            <div className="mt-12 rounded-3xl border border-white/10 bg-[var(--surface)] p-10 text-center">
              <h3 className="font-display text-2xl font-semibold">New tours coming soon</h3>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                We're finalising itineraries. In the meantime, you can request a bespoke private day out — tell us your route and we'll price it.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Button asChild><Link to="/contact">Request a bespoke tour</Link></Button>
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
