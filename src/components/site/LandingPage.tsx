import { Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { PageBand } from "@/components/site/PageBand";
import { FaqSection, LongFormSections } from "@/components/site/ContentSections";
import { TourCard } from "@/components/site/TourCard";
import { Button } from "@/components/ui/button";
import { listPublishedTours } from "@/lib/tours.functions";
import { LANDING_PAGES } from "@/content/landing-pages";

export const landingToursQuery = queryOptions({
  queryKey: ["published-tours"],
  queryFn: () => listPublishedTours(),
  staleTime: 60_000,
});

export function LandingPageView({ path }: { path: string }) {
  const p = LANDING_PAGES[path];
  const { data: tours } = useSuspenseQuery(landingToursQuery);
  const matched = (p.tourSlugs ?? [])
    .map((s) => tours.find((t) => t.slug === s))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
  return (
    <SiteLayout cta={{ heading: <>Get a <span className="text-gold">fixed price</span></>, label: "Get a fixed price", trackAs: "final_cta_landing" }}>
      <PageHero
        eyebrow={p.eyebrow}
        title={p.h1}
        subtitle={p.subtitle}
        primaryTo={p.primaryTo}
        breadcrumbs={[{ label: "Home", to: "/" }, { label: p.breadcrumbLabel }]}
      />
      <LongFormSections sections={p.sections} />
      {matched.length > 0 && (
        <PageBand eyebrow="Ready-made tours" title="Tours you can book now">
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {matched.map((t) => (
              <li key={t.slug}><TourCard tour={t} /></li>
            ))}
          </ul>
        </PageBand>
      )}
      <PageBand eyebrow="Plan your trip" title="Useful pages">
        <ul className="flex flex-wrap gap-3">
          {p.links.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium shadow-[var(--shadow-raised)] hover:border-[var(--gold)]"
              >
                {l.label} <ArrowRight className="size-4 text-[var(--gold-ink)]" />
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <Button asChild variant="gold" size="lg">
            <Link to={p.primaryTo}>Get a fixed price</Link>
          </Button>
        </div>
      </PageBand>
      <FaqSection faqs={p.faqs} />
    </SiteLayout>
  );
}
