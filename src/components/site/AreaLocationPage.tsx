/**
 * AreaLocationPage — the authoritative Local SEO location page.
 * Consolidates all keyword variations (taxi, cab, airport transfer, private
 * hire, executive car, chauffeur, luxury transfer, minibus, coach, etc.) into
 * one comprehensive, entity-rich page per location.
 */
import { Link } from "@tanstack/react-router";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { FaqBlock } from "@/components/seo/FaqBlock";
import { EntityGrid } from "@/components/explore/EntityCard";
import type { AreaSeoContext } from "@/lib/explore.functions";
import type { Destination } from "@/lib/destinations.functions";
import { SiteLayout } from "@/components/site/SiteLayout";
import { journeyLinksForLocation } from "@/lib/seo/coverage";
import { servicePagesForLocation } from "@/lib/seo/service-locations";

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
  { href: "/fleet", label: "Minibus & Coach Hire", blurb: "Groups from 7 to 55 passengers." },
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
    <div className="container-x py-10">
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Locations", href: "/areas" },
          // Region crumb points at its own region page so no two crumbs share a href.
          ...(region
            ? [{ name: region, href: `/areas/region/${region.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}` }]
            : []),
          { name: locName, href: `/areas/${d.slug}` },
        ]}
      />


      {/* Hero */}
      <section className="mt-6 rounded-3xl bg-[var(--navy)] px-6 py-14 text-white sm:px-12">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">
            {region ? `${region} · Airport Travel` : "UK Airport Travel"}
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Professional Airport Taxi &amp; Private Transfer Services in {locName}
          </h1>
          {heroSub && <p className="mt-2 text-white/60 text-sm">{heroSub}</p>}
          <p className="mt-5 max-w-3xl text-white/80 leading-relaxed">
            Cabslink provides reliable airport transfers, private hire, executive cars, corporate
            transport, luxury chauffeur services and minibus hire in <strong>{locName}</strong>.
            Book a fixed-price taxi or cab from {locName} to Edinburgh, Glasgow or any UK airport —
            with 24/7 availability, meet-and-greet, and door-to-door service.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/book"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-6 py-3 text-sm font-bold uppercase tracking-[0.14em] text-[var(--navy)]"
            >
              Get instant quote <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Speak to us
            </Link>
          </div>
        </div>
      </section>

      {/* Why choose */}
      <section className="mt-14">
        <SectionHeader eyebrow="Why Cabslink" title={`Why book with us in ${locName}`} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map((w) => (
            <div key={w.title} className="rounded-2xl border border-[var(--navy)]/10 bg-white p-5 shadow-raised">
              <w.icon className="size-6 text-[var(--gold-ink)]" />
              <div className="mt-3 font-semibold text-[var(--navy)]">{w.title}</div>
              <div className="mt-1 text-sm text-[var(--navy)]/70">{w.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="mt-14">
        <SectionHeader eyebrow="Our services" title={`Airport travel services in ${locName}`} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <a
              key={s.href}
              href={s.href}
              className="group flex flex-col justify-between rounded-2xl border border-[var(--navy)]/10 bg-white p-5 transition hover:border-[var(--gold)] shadow-raised hover:shadow-raised-hover"
            >
              <div>
                <div className="font-semibold text-[var(--navy)]">{s.label}</div>
                <div className="mt-1 text-sm text-[var(--navy)]/65">{s.blurb}</div>
              </div>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--gold-ink)]">
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
      <section className="mt-14 rounded-3xl border border-[var(--navy)]/10 bg-white p-8 shadow-raised">
        <SectionHeader eyebrow="Our fleet" title="Vehicles available" />
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm text-[var(--navy)]/80">
          {[
            "Executive Saloon (Mercedes-Benz E-Class)",
            "Luxury Saloon (Mercedes-Benz S-Class)",
            "Executive MPV (Mercedes-Benz V-Class)",
            "Range Rover",
            "Mini Bus (16-seater)",
            "Coaster Bus (24-seater)",
            "Coach Bus (55-seater)",
          ].map((v) => (
            <li key={v} className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-[var(--gold-ink)]" /> {v}
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

      {/* FAQ */}
      <section className="mt-14">
        <FaqBlock items={buildFaqs(data)} />
      </section>


      {/* CTA */}
      <section className="mt-14 rounded-3xl bg-[var(--navy)] p-10 text-center text-white">
        <h2 className="text-3xl font-bold">Book your {locName} transfer</h2>
        <p className="mt-2 text-white/70">Instant fixed-price quote. No hidden fees. 24/7 support.</p>
        <Link
          to="/book"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-7 py-3 text-sm font-bold uppercase tracking-[0.14em] text-[var(--navy)]"
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
      <h2 className="mt-1 text-2xl font-bold text-[var(--navy)] sm:text-3xl">{title}</h2>
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
    <section className="mt-12">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="size-5 text-[var(--gold-ink)]" />
        <h2 className="text-xl font-bold text-[var(--navy)] sm:text-2xl">{title}</h2>
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
      a: `Yes. Our driver waits in the arrivals hall with a name-board, tracks your flight, and includes free waiting time.`,
    },
    {
      q: `Can I book a Mercedes V-Class or minibus in ${name}?`,
      a: `Yes. We offer executive Mercedes V-Class, 16-seater minibus, 24-seater coaster and 55-seater coach for group and family transfers.`,
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
    <section className="mt-14 rounded-3xl border border-[var(--navy)]/10 bg-white p-8 shadow-raised">
      <SectionHeader eyebrow="Local pages" title={`More on travel in ${name}`} />
      {services.length > 0 && (
        <div className="mt-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--navy)]/50">
            Services in {name}
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {services.map((s) => (
              <li key={s.to}>
                <Link
                  to={s.to}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--navy)]/10 bg-[var(--navy)]/[0.03] px-3 py-2 text-sm font-medium text-[var(--navy)] transition hover:border-[var(--gold)]"
                >
                  {s.label} <ArrowRight className="size-3.5 text-[var(--gold-ink)]" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {journeys.length > 0 && (
        <div className="mt-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--navy)]/50">
            Fixed-price journeys
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {journeys.map((j) => (
              <li key={j.to}>
                <Link
                  to={j.to}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--navy)]/20 px-3 py-2 text-sm font-medium text-[var(--navy)] transition hover:border-[var(--gold)]"
                >
                  {j.label} <ArrowRight className="size-3.5 text-[var(--gold-ink)]" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
