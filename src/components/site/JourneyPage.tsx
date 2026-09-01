/**
 * JourneyPage — shared template for journey (route) pages, e.g.
 * /routes/edinburgh-to-glasgow. Content is facts-gated in
 * src/lib/seo/journeys.ts; this file only renders it.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Clock, MapPin, Phone, Route as RouteIcon, Ruler } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero, SectionHeader } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import type { JourneyContent } from "@/lib/seo/journeys";
import type { RouteFareTable as RouteFareTableData } from "@/lib/seo/route-fares.functions";
import { RouteFareTable } from "@/components/seo/RouteFareTable";
import { SITE } from "@/lib/site";

const ORIGIN = "https://cabslink.com";

export function JourneyPage({
  content: c,
  fares,
}: {
  content: JourneyContent;
  fares?: RouteFareTableData | null;
}) {

  const pair = `${c.from.name} to ${c.to.name}`;
  // Carry the advertised journey into the booking form so the customer does
  // not have to retype the route this page is about.
  const bookSearch = {
    q: new URLSearchParams({ pickupText: c.from.name, dropoffText: c.to.name }).toString(),
  };

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Popular journey"
        title={c.h1}
        subtitle={`${c.miles} miles via ${c.via} — about ${c.hours} door to door, at a price fixed before you travel.`}
        primaryLabel="Get a fixed price"
        primaryTo="/book"
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Popular routes", to: "/routes" },
          { label: pair },
        ]}
      />

      <section className="section-y">
        <div className="container-x grid gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <SectionHeader
              eyebrow={pair}
              title={`What the ${pair} drive is actually like`}
              subtitle={c.note}
            />
            <p className="speakable mt-6 text-sm leading-relaxed text-muted-foreground">
              {pair} is {c.miles} miles via {c.via}, typically {c.hours} door to door off-peak.
              Cabslink quotes the journey as a fixed price before you confirm, so traffic on the day
              does not change what you pay.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="gold" className="rounded-lg">
                <Link to="/book" search={bookSearch}>
                  Book this journey <ArrowRight className="size-4" />
                </Link>
              </Button>
              {c.from.path && (
                <Button asChild variant="outline" className="rounded-lg">
                  <Link to={c.from.path}>About {c.from.name}</Link>
                </Button>
              )}
              {c.to.path && (
                <Button asChild variant="outline" className="rounded-lg">
                  <Link to={c.to.path}>About {c.to.name}</Link>
                </Button>
              )}
            </div>
          </div>

          <aside className="rounded-3xl border bg-background p-6 shadow-[var(--shadow-raised)]">
            <h2 className="font-display text-lg font-semibold">Journey facts</h2>
            <ul className="mt-4 space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <Ruler className="mt-0.5 size-4 shrink-0 text-[var(--gold-ink)]" />
                <span>
                  <span className="font-medium">Distance</span>
                  <span className="block text-muted-foreground">{c.miles} miles by road</span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-[var(--gold-ink)]" />
                <span>
                  <span className="font-medium">Typical duration</span>
                  <span className="block text-muted-foreground">{c.hours} door to door</span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <RouteIcon className="mt-0.5 size-4 shrink-0 text-[var(--gold-ink)]" />
                <span>
                  <span className="font-medium">Route</span>
                  <span className="block text-muted-foreground">{c.via}</span>
                </span>
              </li>
            </ul>
            {c.stops.length > 0 && (
              <>
                <h3 className="mt-6 font-display text-lg font-semibold">Along the way</h3>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {c.stops.map((s) => (
                    <li key={s} className="flex items-start gap-2">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--gold-ink)]" /> {s}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </aside>
        </div>
      </section>

      {/* Published fares: an AI answer or searcher can only quote a price we
          actually put on the page. Omitted entirely when the engine cannot
          produce a reliable figure for this route. */}
      {fares && fares.fares.length > 0 && (
        <section className="section-y border-t">
          <div className="container-x max-w-4xl">
            <RouteFareTable data={fares} routeName={`${c.from.name} to ${c.to.name}`} />
          </div>
        </section>
      )}


      <section className="bg-[var(--navy)] text-[var(--navy-foreground)] section-y">
        <div className="container-x">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)]">Planning</p>
          <h2 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
            How we plan {pair}
          </h2>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {c.planning.map((p) => (
              <li key={p} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-sm">
                <Check className="size-5 text-[var(--gold)]" />
                <p className="mt-3 text-[var(--navy-foreground)]/80">{p}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {c.services.length > 0 && (
        <section className="section-y">
          <div className="container-x">
            <SectionHeader
              eyebrow="Service options"
              title={`Ways to travel ${pair}`}
              subtitle="Each option is priced from the same journey, so you can choose on comfort and capacity."
            />
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {c.services.map((s) => (
                <li key={s.url}>
                  <Link
                    to={s.url}
                    className="group flex h-full flex-col rounded-2xl border bg-background p-6 shadow-[var(--shadow-raised)] transition hover:border-[var(--gold)]"
                  >
                    <h3 className="font-display text-lg font-semibold">{s.name}</h3>
                    <p className="mt-2 flex-1 text-sm text-muted-foreground">{s.intent}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--gold-ink)]">
                      View service <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {c.relatedJourneys.length > 0 && (
        <section className="bg-muted/40 section-y">
          <div className="container-x">
            <SectionHeader eyebrow="Other journeys" title="Related routes we run" />
            <ul className="mt-8 flex flex-wrap gap-3">
              {c.relatedJourneys.map((r) => (
                <li key={r.to}>
                  <Link
                    to={r.to}
                    className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium shadow-[var(--shadow-raised)] hover:border-[var(--gold)]"
                  >
                    <RouteIcon className="size-4 text-[var(--gold-ink)]" /> {r.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/routes"
                  className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium shadow-[var(--shadow-raised)] hover:border-[var(--gold)]"
                >
                  All popular routes <ArrowRight className="size-4" />
                </Link>
              </li>
            </ul>
          </div>
        </section>
      )}

      <section className="section-y">
        <div className="container-x max-w-3xl">
          <SectionHeader eyebrow="FAQs" title={`${pair} — questions`} />
          <div className="mt-8 space-y-6">
            {resolveFaqs(c, fares).map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold">{f.q}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </div>
            ))}

          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild variant="gold" className="rounded-lg">
              <Link to="/book" search={bookSearch}>Get a quote</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-lg">
              <a href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}>
                <Phone className="size-4" /> {SITE.phoneUK}
              </a>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

/**
 * FAQ answers may reference the real saloon fare with `{{saloonFare}}` rather
 * than a hardcoded figure. The token is filled from the live pricing engine;
 * if no fare is available the question is dropped rather than shipped with a
 * placeholder or a vague "price on request".
 */
function resolveFaqs(c: JourneyContent, fares?: RouteFareTableData | null) {
  const cheapest = fares?.fares.length
    ? fares.fares.reduce((a, b) => (b.price < a.price ? b : a))
    : null;
  const saloon =
    fares?.fares.find((f) => /^saloon$/i.test(f.className) || f.classSlug === "saloon") ?? cheapest;
  const value = saloon && fares ? `${fares.currencySymbol}${saloon.price.toFixed(2)}` : null;

  return c.faqs
    .map((f) => ({ ...f, a: value ? f.a.replaceAll("{{saloonFare}}", value) : f.a }))
    .filter((f) => !f.a.includes("{{"));
}



/** TravelAction + Offer + FAQPage + BreadcrumbList graph for a journey page. */
export function journeySchema(c: JourneyContent, fares?: RouteFareTableData | null) {
  const url = `${ORIGIN}${c.canonicalPath}`;
  const pair = `${c.from.name} to ${c.to.name}`;
  const currency = fares?.currency || "GBP";
  return {
    "@context": "https://schema.org",
    "@graph": [
      ...(fares && fares.fares.length
        ? [
            {
              "@type": "Offer",
              name: `${pair} fixed-price taxi transfer`,
              url,
              priceCurrency: currency,
              // Headline price = cheapest publishable vehicle class.
              price: Math.min(...fares.fares.map((f) => f.price)).toFixed(2),
              availability: "https://schema.org/InStock",
              priceValidUntil: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
              areaServed: { "@type": "Country", name: "United Kingdom" },
              priceSpecification: fares.fares.map((f) => ({
                "@type": "UnitPriceSpecification",
                name: f.className,
                price: f.price.toFixed(2),
                priceCurrency: currency,
                valueAddedTaxIncluded: fares.taxIncluded,
              })),
              itemOffered: {
                "@type": "Service",
                name: `${pair} private transfer`,
                serviceType: "Taxi and private transfer",
                provider: { "@type": "Organization", name: "Cabslink", url: ORIGIN },
              },
            },
          ]
        : []),

      {
        "@type": "TravelAction",
        name: `${c.from.name} to ${c.to.name} private transfer`,
        description: c.metaDescription,
        url,
        fromLocation: { "@type": "Place", name: c.from.name },
        toLocation: { "@type": "Place", name: c.to.name },
        distance: `${c.miles} mi`,
        provider: { "@type": "Organization", name: "Cabslink", url: ORIGIN },
      },
      {
        "@type": "FAQPage",
        mainEntity: resolveFaqs(c, fares).map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),

      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: ORIGIN },
          { "@type": "ListItem", position: 2, name: "Popular routes", item: `${ORIGIN}/routes` },
          {
            "@type": "ListItem",
            position: 3,
            name: `${c.from.name} to ${c.to.name}`,
            item: url,
          },
        ],
      },
    ],
  };
}

export function journeyHead(c: JourneyContent, fares?: RouteFareTableData | null) {
  const url = `${ORIGIN}${c.canonicalPath}`;
  return {
    meta: [
      { title: c.metaTitle },
      { name: "description", content: c.metaDescription },
      { property: "og:title", content: c.metaTitle },
      { property: "og:description", content: c.metaDescription },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(journeySchema(c, fares)) }],

  };
}
