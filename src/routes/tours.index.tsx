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

function formatPrice(pence: number | null, currency: string): string {
  if (pence == null) return "Price on request";
  const symbol = currency === "GBP" ? "£" : currency === "EUR" ? "€" : currency === "USD" ? "$" : "";
  return `${symbol}${Math.round(pence / 100).toLocaleString()}`;
}

function TourCard({ tour, hero = false }: { tour: PublicTourListItem; hero?: boolean }) {
  const duration = formatDuration(tour.direct_duration_seconds);
  const isQuote = tour.starting_price_pence == null;
  return (
    <Link
      to="/tours/$slug"
      params={{ slug: tour.slug }}
      className="group relative block overflow-hidden rounded-[28px] bg-white ring-1 ring-[var(--navy)]/8 transition-all shadow-raised hover:shadow-raised-hover"
    >
      {/* Media */}
      <div className={`relative overflow-hidden bg-[var(--navy)]/90 ${hero ? "aspect-[4/5] sm:aspect-[16/9]" : "aspect-[5/6] sm:aspect-[4/3]"}`}>
        {tour.hero_image_url ? (
          <img
            src={tour.hero_image_url}
            alt={`${tour.name} private tour`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[var(--navy)] to-[var(--navy)]/60" />
        )}
        {/* Bottom scrim for overlay title on mobile hero */}
        {hero && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[var(--navy)] via-[var(--navy)]/70 to-transparent sm:hidden" />
        )}

        {/* Badges */}
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

        {/* Hero-only overlay title on mobile */}
        {hero && (
          <div className="absolute inset-x-4 bottom-4 sm:hidden">
            <h3 className="font-display text-2xl font-bold leading-[1.05] tracking-[-0.01em] text-white">
              {tour.name}
            </h3>
            {tour.origin_label && tour.destination_label && (
              <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-white/85">
                <MapPin className="size-3 text-[var(--gold)]" />
                {tour.origin_label} → {tour.destination_label}
                {tour.recommended_stop_count > 0 && (
                  <span className="ml-1 text-white/60">· {tour.recommended_stop_count} stops</span>
                )}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Body — hero hides duplicate title on mobile */}
      <div className="p-5 sm:p-6">
        <h3 className={`font-display text-[1.15rem] sm:text-xl font-semibold leading-tight text-[var(--navy)] ${hero ? "hidden sm:block" : ""}`}>
          {tour.name}
        </h3>
        {tour.short_description && (
          <p className={`text-sm leading-relaxed text-[var(--navy)]/65 line-clamp-2 ${hero ? "mt-0 sm:mt-2" : "mt-2"}`}>
            {tour.short_description}
          </p>
        )}

        {/* Meta chips — hidden on hero mobile (shown as overlay) */}
        <div className={`flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-[var(--navy)]/70 ${hero ? "hidden sm:flex mt-4" : "flex mt-3.5"}`}>
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


        {/* Divider */}
        <div className="mt-4 h-px w-full bg-[var(--navy)]/8" />

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--navy)]/50">
              {isQuote ? "Enquire" : "From"}
            </p>
            <p className={`font-display font-bold text-[var(--navy)] ${isQuote ? "text-sm" : "text-2xl leading-none tracking-[-0.02em]"}`}>
              {isQuote ? "Price on request" : formatPrice(tour.starting_price_pence, tour.currency)}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--navy)] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all group-hover:bg-[var(--gold)] group-hover:text-[var(--navy)]">
            View tour <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}


function ToursPage() {
  const { data: allTours } = useSuspenseQuery(toursQuery);
  // Day trips only — exclude long-day / multi-day itineraries
  const tours = allTours.filter((t) => !t.long_day);
  const featured = tours.filter((t) => t.featured);
  const rest = tours.filter((t) => !t.featured);


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
            <>
              {featured.length > 0 && (
                <div className="mt-10 grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {featured.map((t, i) => (
                    <Reveal key={t.slug} className={i === 0 ? "md:col-span-2 lg:col-span-1" : ""}>
                      <TourCard tour={t} hero={i === 0} />
                    </Reveal>
                  ))}
                </div>
              )}
              {rest.length > 0 && (
                <div className={`grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 ${featured.length > 0 ? "mt-6 sm:mt-8" : "mt-10"}`}>
                  {rest.map((t) => (
                    <Reveal key={t.slug}><TourCard tour={t} /></Reveal>
                  ))}
                </div>
              )}
            </>

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
