import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { CtaBand } from "@/components/site/CtaBand";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import { TourCard } from "@/components/site/TourCard";
import { listPublishedTours } from "@/lib/tours.functions";

const toursQuery = queryOptions({
  queryKey: ["published-tours"],
  queryFn: () => listPublishedTours(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/tours/")({
  head: () => ({
    meta: [
      { title: "Scotland & UK Private Driver Tours — Cabslink" },
      { name: "description", content: "Private driver tours across Scotland and the UK. Curated multi-stop itineraries with transparent per-mile pricing and hand-picked stops." },
      { property: "og:title", content: "Private UK Driver Tours — Cabslink" },
      { property: "og:description", content: "Curated multi-stop driver tours. See Scotland's icons with a private driver, transparent pricing, no hidden fees." },
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






function ToursPage() {
  const { data: allTours } = useSuspenseQuery(toursQuery);
  // Day trips first; long-day itineraries get their own section below so every
  // published tour page is reachable from this hub (no orphan pages).
  const byFeatured = (a: { featured: boolean }, b: { featured: boolean }) =>
    Number(b.featured) - Number(a.featured);
  const tours = allTours.filter((t) => !t.long_day).slice().sort(byFeatured);
  const longDayTours = allTours.filter((t) => t.long_day).slice().sort(byFeatured);




  return (
    <SiteLayout>
      <PageHero
        eyebrow="Private Driver Tours"
        title="Curated tours. Real drivers. Tailored quotes."
        subtitle="Pick a route, choose your stops, and travel in comfort with a professional driver. Enquire and we'll quote your exact itinerary."

        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Tours" }]}
      />

      <section className="section-y">
        <div className="container-x">
          <SectionHeader
            eyebrow="Choose your route"
            title="Tours ready to book"
            titleAccent="today"
            subtitle="Each tour includes a suggested itinerary. Tell us your date, stops and group size and we'll send a tailored quote."
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
