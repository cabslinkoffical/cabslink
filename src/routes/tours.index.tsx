import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
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
