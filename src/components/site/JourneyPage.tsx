/**
 * JourneyPage — shared template for journey (route) pages, e.g.
 * /routes/edinburgh-to-glasgow. Content is facts-gated in
 * src/lib/seo/journeys.ts; this file only renders it.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, Car, Check, Clock, MapPin, Phone, Route as RouteIcon } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { SectionHeader } from "@/components/site/PageHero";
import { LocalPageHero } from "@/components/site/LocalPageHero";
import { LabelRouteMap } from "@/components/site/LabelRouteMap";
import { defaultLocalImage } from "@/lib/local-page";
import { DirectAnswer } from "@/components/seo/DirectAnswer";
import { Button } from "@/components/ui/button";
import type { JourneyContent } from "@/lib/seo/journeys";
import type { RouteFareTable as RouteFareTableData } from "@/lib/seo/route-fares.functions";
import { RouteFareTable } from "@/components/seo/RouteFareTable";
import { PageBand, LinkCards, FaqBand } from "@/components/site/PageBand";
import { TransportComparison } from "@/components/seo/TransportComparison";
import { getJourneyTransport } from "@/lib/seo/transport-modes";

import { SITE } from "@/lib/site";
import { FACT_TEXT } from "@/lib/site-facts";
import { GoogleReviewsSection } from "@/components/site/GoogleReviewsSection";
import { resolveFaqs } from "@/components/site/JourneyPage.head";


export function JourneyPage({
  content: c,
  fares,
}: {
  content: JourneyContent;
  fares?: RouteFareTableData | null;
}) {

  const pair = `${c.from.name} to ${c.to.name}`;
  const transport = getJourneyTransport(c.slug);
  const airportEnd = [c.from.name, c.to.name].find((n) => /airport/i.test(n));

  // Carry the advertised journey into the booking form so the customer does
  // not have to retype the route this page is about.
  const bookSearch = {
    q: new URLSearchParams({ pickupText: c.from.name, dropoffText: c.to.name }).toString(),
  };

  return (
    <SiteLayout cta={{ heading: <>{c.from.name} to <span className="text-gold">{c.to.name}</span></>, label: "Get a fixed price for this route", href: "#booking", trackAs: "final_cta_route", subtitle: "Your journey details are already in the booking form above. Check the fixed price before you pay, or call our team any time." }}>
      <LocalPageHero
        breadcrumbs={[
          { name: "Home", href: "/" },
          { name: "Popular routes", href: "/routes" },
          { name: pair, href: c.canonicalPath },
        ]}
        eyebrow="Popular journey"
        title={c.h1}
        subtitle={`${c.miles} miles via ${c.via} — about ${c.hours} door to door, at a price fixed before you travel.`}
        prefill={{ pickup: c.from.name, dropoff: c.to.name }}
        image={defaultLocalImage("journey")}
        imageAlt={`Cabslink vehicle for the ${pair} journey`}
        imageCaption={`${pair} · fixed-price private transfer`}
        intro={{
          eyebrow: pair,
          heading: "Journey at a glance",
          body: (
            <DirectAnswer
              className="!border-0 !bg-transparent !p-0"
              sentences={[
            `${c.from.name} to ${c.to.name} is about ${c.miles} miles by road via ${c.via}, roughly ${c.hours} door to door.`,
            fares?.fares.length
              ? `A private transfer costs from ${fares.currencySymbol}${Math.min(...fares.fares.map((f) => f.price)).toFixed(2)} per vehicle, fixed before you travel.`
              : "Every fare is fixed and confirmed before you travel.",
              ]}
            />
          ),
          details: [
            { icon: MapPin, label: "Distance", value: `${c.miles} miles` },
            { icon: Clock, label: "Door to door", value: `about ${c.hours}` },
            { icon: Car, label: "Route", value: c.via },
          ],
        }}
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

          <aside className="flex flex-col rounded-3xl border bg-background p-6 shadow-[var(--shadow-raised)]">
            <h2 className="font-display text-lg font-semibold">
              {c.stops.length > 0 ? "Along the way" : "Route map"}
            </h2>
            {c.stops.length > 0 && (
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {c.stops.map((s) => (
                  <li key={s} className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--gold-ink)]" /> {s}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex-1 overflow-hidden rounded-2xl">
              <LabelRouteMap from={c.from.name} to={c.to.name} />
            </div>
          </aside>
        </div>
      </section>

      {/* Published fares: an AI answer or searcher can only quote a price we
          actually put on the page. Omitted entirely when the engine cannot
          produce a reliable figure for this route. */}
      {fares && fares.fares.length > 0 && (
        <section className="section-y">
          <div className="container-x">
            <RouteFareTable data={fares} routeName={`${c.from.name} to ${c.to.name}`} />
          </div>
        </section>
      )}

      {/* Honest multi-modal comparison. Only rendered for journeys where we
          hold verified operator fares and times. */}
      {transport && (
        <section className="section-y">
          <div className="container-x">
            <TransportComparison data={transport} routeName={pair} />
          </div>
        </section>
      )}




      <section className="bg-[var(--navy)] text-[var(--navy-foreground)] section-y">
        <div className="container-x">
          <SectionHeader dark eyebrow="Planning" title={`How we plan ${pair}`} />
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {c.planning.map((p) => (
              <li key={p} className="rounded-2xl border border-navy-foreground/10 bg-navy-foreground/[0.04] p-6 text-sm">
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
                    className="group flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-raised transition hover:border-[var(--gold)]"
                  >
                    <h3 className="font-display text-lg font-semibold text-[var(--navy)]">{s.name}</h3>
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

      {airportEnd && (
        <PageBand eyebrow="Airport pickup" title={`Pickup at ${airportEnd}`}>
          <ul className="grid gap-4 md:grid-cols-2">
            {[FACT_TEXT.flightTracking, FACT_TEXT.airportWait, FACT_TEXT.meetGreet, FACT_TEXT.feesIncluded].map((t) => (
              <li key={t} className="flex gap-3 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
                <Check className="mt-0.5 size-5 shrink-0 text-[var(--gold-ink)]" /> {t}
              </li>
            ))}
          </ul>
        </PageBand>
      )}

      {c.relatedJourneys.length > 0 && (
        <PageBand eyebrow="Other journeys" title="Related routes we run">
          <LinkCards links={[...c.relatedJourneys.map((r) => ({ href: r.to, label: r.label })), ...(c.slug === "edinburgh-airport-to-city-centre" ? [{ href: "/guides/edinburgh-airport-to-city-centre", label: "Guide: tram, bus, taxi or private transfer" }] : []), { href: "/routes", label: "All popular routes" }]} />
        </PageBand>
      )}

      <GoogleReviewsSection />

      <FaqBand title={`${pair} — questions`} items={resolveFaqs(c, fares)}>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild variant="gold" className="rounded-lg">
            <Link to="/book" search={bookSearch}>Get a fixed price</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-lg">
            <a href={`tel:${SITE.phoneUK.replace(/\s/g, "")}`}>
              <Phone className="size-4" /> {SITE.phoneUK}
            </a>
          </Button>
        </div>
      </FaqBand>
    </SiteLayout>
  );
}
export { journeySchema, journeyHead } from "@/components/site/JourneyPage.head";
