/**
 * AreaLocationPage — the authoritative Local SEO location page.
 * Consolidates all keyword variations (taxi, cab, airport transfer, private
 * hire, executive car, private driver, luxury transfer, minibus, coach, etc.) into
 * one comprehensive, entity-rich page per location.
 */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listPublicVehicleClasses } from "@/lib/vehicle-classes.functions";
import { FACTS, FACT_TEXT } from "@/lib/site-facts";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { FaqBlock } from "@/components/seo/FaqBlock";
import { EntityGrid } from "@/components/explore/EntityCard";
import type { AreaSeoContext } from "@/lib/explore.functions";
import type { Destination } from "@/lib/destinations.functions";
import { SiteLayout } from "@/components/site/SiteLayout";
import { journeyLinksForLocation } from "@/lib/seo/coverage";
import { servicePagesForLocation } from "@/lib/seo/service-locations";
import { InternalLinkHub } from "@/components/seo/InternalLinkHub";

import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  Star,
  ArrowRight,
  Plane,
  Train,
  GraduationCap,
  Hospital,
  Landmark,
  Anchor,
  Hotel,
  MapPin,
} from "lucide-react";

const SERVICES = [
  { href: "/airport-transfers", label: "Airport Transfers", blurb: "Fixed-price meet & greet, flight tracking." },
  { href: "/vip-transfers", label: "Executive & VIP Cars", blurb: "Discreet luxury travel for VIPs." },
  { href: "/corporate-travel", label: "Corporate Transport", blurb: "Business accounts and monthly billing." },
  { href: "/tours", label: "Private Tours", blurb: "Custom driver-guided day tours." },
  { href: "/fleet", label: "Group Transfers", blurb: "MPVs and eight-seater vans for groups." },
  { href: "/services", label: "All Services", blurb: "Full list of what we cover." },
] as const;

const WHY = [
  { icon: ShieldCheck, title: "Fully licensed", text: "PHV-licensed drivers, insured vehicles." },
  { icon: Clock, title: "24/7 availability", text: "Round-the-clock bookings & dispatch." },
  { icon: Star, title: "Fixed prices", text: "No surge pricing. Quote is what you pay." },
  { icon: CheckCircle2, title: "Meet & greet", text: "Terminal name-board pickup, flight tracked." },
] as const;

export function AreaLocationPage({ data }: { data: AreaSeoContext }) {
  const d = data.destination;
  const locName = d.display_name ?? d.name;
  const region = d.region;
  const heroSub = [d.town, d.council, region].filter(Boolean).join(" · ");

  return (
    <SiteLayout>
      <section className="bg-navy text-navy-foreground">
        <div className="container-x py-12 md:py-20">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Locations", href: "/areas" },
              ...(region
                ? [{ name: region, href: `/areas/region/${region.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}` }]
                : []),
              { name: locName, href: `/areas/${d.slug}` },
            ]}
            dark
          />
          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(15rem,0.65fr)] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">
                {region ? `${region} · Airport Travel` : "UK Airport Travel"}
              </p>
              <h1 className="mt-4 max-w-4xl font-display text-4xl font-semibold leading-[1.04] sm:text-6xl">
                Professional Airport Taxi &amp; Private Transfer Services in {locName}
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-relaxed text-navy-foreground/72">
                Cabslink provides reliable airport transfers, private hire, executive cars, corporate
                transport, luxury private-driver travel and group transfers in <strong>{locName}</strong>.
                Book a fixed-price taxi or cab from {locName} to Edinburgh, Glasgow or any UK airport —
                with 24/7 availability, meet-and-greet, and door-to-door service.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/book"
                  className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-bold uppercase tracking-[0.14em] text-gold-foreground"
                >
                  Get instant quote <ArrowRight className="size-4" />
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 rounded-full border border-navy-foreground/25 px-6 py-3 text-sm font-semibold text-navy-foreground hover:bg-navy-foreground/10"
                >
                  Speak to us
                </Link>
              </div>
            </div>
            <div className="border-l border-gold/40 pl-6">
              <p className="text-xs uppercase tracking-[0.2em] text-navy-foreground/45">Location</p>
              <p className="mt-2 font-display text-2xl font-semibold">{locName}</p>
              {heroSub && <p className="mt-2 text-sm leading-relaxed text-navy-foreground/60">{heroSub}</p>}
              <p className="mt-6 text-xs uppercase tracking-[0.2em] text-gold">Available 24/7</p>
            </div>
          </div>
        </div>
      </section>

      <div className="container-x py-16 md:py-24">

      {/* Why choose */}
      <section className="border-t border-border pt-8">
        <SectionHeader eyebrow="Why Cabslink" title={`Why book with us in ${locName}`} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map((w) => (
            <div key={w.title} className="border-t border-gold/50 bg-card py-5">
              <w.icon className="size-6 text-gold" />
              <div className="mt-4 font-display text-lg font-semibold text-foreground">{w.title}</div>
              <div className="mt-1 text-sm leading-relaxed text-muted-foreground">{w.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="mt-20">
        <SectionHeader eyebrow="Our services" title={`Airport travel services in ${locName}`} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <a
              key={s.href}
              href={s.href}
              className="group flex min-h-40 flex-col justify-between border-t border-border bg-card py-5 transition hover:border-gold"
            >
              <div>
                <div className="font-display text-xl font-semibold text-foreground">{s.label}</div>
                <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.blurb}</div>
              </div>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-gold">
                Learn more <ArrowRight className="size-3.5" />
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Airport transfers from */}
      {data.airports.length > 0 && (
        <NearbySection icon={Plane} title={`Airport transfers from ${locName}`} items={data.airports} />
      )}

      {/* Popular routes */}
      {data.popularRoutes.length > 0 && (
        <NearbySection icon={MapPin} title={`Popular routes from ${locName}`} items={data.popularRoutes} />
      )}

      {/* Vehicles callout */}
      <section className="mt-20 border-y border-border py-8">
        <SectionHeader eyebrow="Our fleet" title="Vehicles available" />
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm text-[var(--navy)]/80">
          {(vehicleClasses ?? []).map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-[var(--gold-ink)]" /> {c.name} · {c.passengers} passengers · {c.large_bags} large bags
            </li>
          ))}
        </ul>
        <a
          href="/fleet"
          className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[var(--gold-ink)]"
        >
          View full fleet <ArrowRight className="size-4" />
        </a>
      </section>

      {/* Nearby entity sections */}
      {data.nearbyAreas.length > 0 && (
        <NearbySection icon={MapPin} title={`Nearby areas around ${locName}`} items={data.nearbyAreas} />
      )}
      {data.attractions.length > 0 && (
        <NearbySection icon={Landmark} title={`Attractions near ${locName}`} items={data.attractions} />
      )}
      {data.hotels.length > 0 && (
        <NearbySection icon={Hotel} title={`Hotels near ${locName}`} items={data.hotels} />
      )}
      {data.universities.length > 0 && (
        <NearbySection icon={GraduationCap} title={`Universities near ${locName}`} items={data.universities} />
      )}
      {data.hospitals.length > 0 && (
        <NearbySection icon={Hospital} title={`Hospitals near ${locName}`} items={data.hospitals} />
      )}
      {data.stations.length > 0 && (
        <NearbySection icon={Train} title={`Train stations near ${locName}`} items={data.stations} />
      )}
      {data.cruisePorts.length > 0 && (
        <NearbySection icon={Anchor} title={`Cruise ports near ${locName}`} items={data.cruisePorts} />
      )}

      <LocalPagesSection slug={d.slug} name={locName} />

      {/* Automated services ↔ airports ↔ areas cross-links */}
      <InternalLinkHub kind="location" slug={d.slug} heading={`More ways to travel from ${locName}`} />

      {/* FAQ */}
      <section className="mt-14">
        <FaqBlock items={buildFaqs(data)} />
      </section>


      {/* CTA */}
      <section className="mt-20 bg-navy p-8 text-center text-navy-foreground md:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">Plan your journey</p>
        <h2 className="mt-3 font-display text-3xl font-semibold md:text-4xl">Book your {locName} transfer</h2>
        <p className="mt-3 text-navy-foreground/70">Instant fixed-price quote. No hidden fees. 24/7 support.</p>
        <Link
          to="/book"
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3 text-sm font-bold uppercase tracking-[0.14em] text-gold-foreground"
        >
          Get a quote <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
    </SiteLayout>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-5">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--gold-ink)]">
        {eyebrow}
      </div>
      <h2 className="mt-2 font-display text-2xl font-semibold text-foreground sm:text-3xl">{title}</h2>
    </div>
  );
}

function NearbySection({
  icon: Icon,
  title,
  items,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: Destination[];
}) {
  return (
    <section className="mt-16 grid gap-6 border-t border-border pt-7 lg:grid-cols-[minmax(14rem,0.7fr)_2fr]">
      <div>
        <Icon className="size-5 text-gold" />
        <h2 className="mt-3 font-display text-xl font-semibold text-foreground sm:text-2xl">{title}</h2>
      </div>
      <EntityGrid items={items} />
    </section>
  );
}

function buildFaqs(ctx: AreaSeoContext): { q: string; a: string }[] {
  const d = ctx.destination;
  const name = d.display_name ?? d.name;
  const airport = ctx.airports[0];
  const airportName = airport ? airport.display_name ?? airport.name : "Edinburgh Airport";

  return [
    {
      q: `How much is a taxi from ${name} to ${airportName}?`,
      a: `Fares from ${name} to ${airportName} are fixed and quoted instantly on our booking page. Prices depend on vehicle class (executive saloon, MPV, minibus) — start a quote to see the exact total.`,
    },
    {
      q: `Can I pre-book an airport transfer from ${name}?`,
      a: `Yes — book online 24/7 or by phone. Pre-booked transfers include flight tracking and meet-and-greet at no extra cost.`,
    },
    {
      q: `Do you offer meet and greet at the airport?`,
      a: `Yes. ${FACT_TEXT.meetGreet} ${FACT_TEXT.airportWait}`,
    },
    {
      q: `Can I book a larger vehicle for a group in ${name}?`,
      a: `Yes. MPVs and eight-seater vans are available for group and family transfers. Exact seats and bags for every class are listed on our fleet page.`,
    },
    {
      q: `Are child seats available?`,
      a: `Yes — child, booster and infant seats can be added during checkout at no extra charge (subject to availability).`,
    },
    {
      q: `Do you provide corporate transport in ${name}?`,
      a: `Yes. Business accounts include monthly billing, priority dispatch, and dedicated account management. Visit our corporate page to open an account.`,
    },
  ];
}

function LocalPagesSection({ slug, name }: { slug: string; name: string }) {
  const services = servicePagesForLocation(slug);
  const journeys = journeyLinksForLocation(slug);
  if (services.length === 0 && journeys.length === 0) return null;

  return (
    <section className="mt-16 border-y border-border py-8">
      <SectionHeader eyebrow="Local pages" title={`More on travel in ${name}`} />
      {services.length > 0 && (
        <div className="mt-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Services in {name}
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {services.map((s) => (
              <li key={s.to}>
                <Link
                  to={s.to}
                  className="inline-flex items-center gap-1.5 border-b border-border px-1 py-2 text-sm font-medium text-foreground transition hover:border-gold"
                >
                  {s.label} <ArrowRight className="size-3.5 text-gold" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {journeys.length > 0 && (
        <div className="mt-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Fixed-price journeys
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {journeys.map((j) => (
              <li key={j.to}>
                <Link
                  to={j.to}
                  className="inline-flex items-center gap-1.5 border-b border-dashed border-border px-1 py-2 text-sm font-medium text-foreground transition hover:border-gold"
                >
                  {j.label} <ArrowRight className="size-3.5 text-gold" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
