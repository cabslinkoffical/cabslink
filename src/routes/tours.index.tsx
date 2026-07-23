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

function TourCard({ tour }: { tour: PublicTourListItem }) {
  const duration = formatDuration(tour.direct_duration_seconds);
  return (
    <Link
      to="/tours/$slug"
      params={{ slug: tour.slug }}
      className="group block rounded-3xl overflow-hidden border border-white/10 bg-[var(--surface)] shadow-[var(--shadow-elegant)] hover:shadow-2xl transition-all"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-black/40">
        {tour.hero_image_url ? (
          <img
            src={tour.hero_image_url}
            alt={`${tour.name} private tour`}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-black/60 to-black/20" />
        )}
        {tour.featured && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-[var(--gold)]/95 text-black text-[11px] font-semibold px-2.5 py-1">
            <Star className="size-3" /> Popular
          </span>
        )}
        {tour.long_day && (
          <span className="absolute top-3 right-3 rounded-full bg-black/70 text-white text-[11px] font-medium px-2.5 py-1">
            Long day
          </span>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-display text-xl font-semibold leading-tight">{tour.name}</h3>
        {tour.short_description && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{tour.short_description}</p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {tour.origin_label && tour.destination_label && (
            <span className="inline-flex items-center gap-1"><MapPin className="size-3.5 text-[var(--gold)]" />{tour.origin_label} → {tour.destination_label}</span>
          )}
          {duration && <span className="inline-flex items-center gap-1"><Clock className="size-3.5 text-[var(--gold)]" />{duration}</span>}
          {tour.recommended_stop_count > 0 && (
            <span>{tour.recommended_stop_count} stop{tour.recommended_stop_count === 1 ? "" : "s"}</span>
          )}
        </div>
        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{tour.starting_price_pence == null ? "Enquire" : "From"}</p>
            <p className={`font-display font-semibold ${tour.starting_price_pence == null ? "text-base text-foreground" : "text-2xl text-foreground"}`}>
              {formatPrice(tour.starting_price_pence, tour.currency)}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--gold)] text-black text-xs font-semibold px-4 py-2 group-hover:gap-2 transition-all shadow-md">
            View tour <ArrowRight className="size-3.5" />
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
                <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {featured.map((t) => (
                    <Reveal key={t.slug}><TourCard tour={t} /></Reveal>
                  ))}
                </div>
              )}
              {rest.length > 0 && (
                <div className={`grid gap-6 md:grid-cols-2 lg:grid-cols-3 ${featured.length > 0 ? "mt-8" : "mt-10"}`}>
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
