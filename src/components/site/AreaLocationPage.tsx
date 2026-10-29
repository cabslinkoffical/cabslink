/**
 * AreaLocationPage — the authoritative Local SEO location page.
 * Consolidates all keyword variations (taxi, cab, airport transfer, private
 * hire, executive car, private driver, luxury transfer, minibus, coach, etc.) into
 * one comprehensive, entity-rich page per location.
 */
import { RelatedLinks } from "@/components/site/RelatedLinks";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listPublicVehicleClasses } from "@/lib/vehicle-classes.functions";
import { FaqBlock } from "@/components/seo/FaqBlock";
import { PlaceGuideBlock } from "@/components/seo/PlaceGuideBlock";
import { guideFor } from "@/content/place-guides";
import { buildAreaFaqs } from "@/lib/seo/area-faqs";
import { EntityGrid } from "@/components/explore/EntityCard";
import type { AreaSeoContext } from "@/lib/explore.functions";
import type { Destination } from "@/lib/destinations.functions";
import { SiteLayout } from "@/components/site/SiteLayout";
import { LocalMapSection } from "@/components/site/LocalMapSection";
import { LocalPageHero } from "@/components/site/LocalPageHero";
import { areaPrefill, defaultLocalImage } from "@/lib/local-page";
import { journeyLinksForLocation } from "@/lib/seo/coverage";
import { servicePagesForLocation } from "@/lib/seo/service-locations";
import edinburghImage from "@/assets/edinburgh.jpg";

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
  const guide = guideFor(`/areas/${d.slug}`);
  // Same query key as the fleet page, so the cache is shared.
  const { data: vehicleClasses } = useQuery({
    queryKey: ["public-vehicle-classes"],
    queryFn: () => listPublicVehicleClasses(),
    staleTime: 60_000,
  });
  const region = d.region;
  const heroSub = [d.town, d.council, region].filter(Boolean).join(" · ");

  return (
    <SiteLayout>
      <LocalPageHero
        breadcrumbs={[
          { name: "Home", href: "/" },
          { name: "Locations", href: "/areas" },
          ...(region
            ? [{ name: region, href: `/areas/region/${region.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}` }]
            : []),
          { name: locName, href: `/areas/${d.slug}` },
        ]}
        eyebrow={region ? `${region} · Airport Travel` : "UK Airport Travel"}
        title={`Professional Airport Taxi & Private Transfer Services in ${locName}`}
        subtitle={
          <>
            Cabslink provides reliable airport transfers, private hire, executive cars, corporate
            transport, luxury private-driver travel and group transfers in <strong>{locName}</strong>.
            Book a fixed-price taxi or cab from {locName} to Edinburgh, Glasgow or any UK airport —
            with 24/7 availability, meet-and-greet, and door-to-door service.
          </>
        }
        facts={[
          ...(heroSub ? [{ label: "Location", value: heroSub }] : []),
          { label: "Availability", value: "24/7" },
        ]}
        prefill={areaPrefill(locName)}
        mapFocus={
          typeof d.lat === "number" && typeof d.lng === "number"
            ? { lat: d.lat, lng: d.lng, label: locName }
            : null
        }
        image={d.slug === "edinburgh" ? edinburghImage : (d as { hero_image_url?: string | null }).hero_image_url ?? defaultLocalImage(d.type)}
        imageAlt={d.slug === "edinburgh" ? "Edinburgh Castle above Princes Street Gardens" : `Cabslink transfers in ${locName}`}
        imageCaption={`${locName} · airport transfers & private hire`}
      />

      <div className="container-x py-16 md:py-24">

      {/* Why choose */}
      <section className="border-t border-border pt-8">
        <SectionHeader eyebrow="Why Cabslink" title={`Why book with us in ${locName}`} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map((w) => (
            <div key={w.title} className="border-t border-gold/50 bg-card py-5">
              <w.icon className="size-6 text-[var(--gold-ink)]" />
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
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gold-ink)]">
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
              <CheckCircle2 className="size-4 text-[var(--gold-ink)]" /> {c.name} · {c.passengers} passengers · {c.large_luggage} large bags
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
        <FaqBlock items={buildAreaFaqs(data)} />
      </section>



      {/* Phase 7 guide text — added below all existing content. */}
      {guide ? <div className="mt-16"><PlaceGuideBlock guide={guide} /></div> : null}
      <LocalMapSection
        focus={
          typeof d.lat === "number" && typeof d.lng === "number"
            ? { lat: d.lat, lng: d.lng, label: locName }
            : null
        }
      />
      <RelatedLinks center={typeof d.lat === "number" && typeof d.lng === "number" ? { lat: d.lat, lng: d.lng } : null} />
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
        <Icon className="size-5 text-[var(--gold-ink)]" />
        <h2 className="mt-3 font-display text-xl font-semibold text-foreground sm:text-2xl">{title}</h2>
      </div>
      <EntityGrid items={items} />
    </section>
  );
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
                  {s.label} <ArrowRight className="size-3.5 text-[var(--gold-ink)]" />
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
