/**
 * AreaLocationPage — the authoritative Local SEO location page.
 * Consolidates all keyword variations (taxi, cab, airport transfer, private
 * hire, executive car, private driver, luxury transfer, minibus, coach, etc.) into
 * one comprehensive, entity-rich page per location.
 */
import { RelatedLinks } from "@/components/site/RelatedLinks";
import { PageBand, GroupLabel, LinkCards, FaqBand } from "@/components/site/PageBand";
import { useQuery } from "@tanstack/react-query";
import { listPublicVehicleClasses } from "@/lib/vehicle-classes.functions";
import { PlaceGuideBlock } from "@/components/seo/PlaceGuideBlock";
import { guideFor } from "@/content/place-guides";
import { buildAreaFaqs } from "@/lib/seo/area-faqs";
import { EntityCard, EntityGrid } from "@/components/explore/EntityCard";
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
  { href: "/airport-transfers", label: "Airport Transfers", blurb: "Fixed-price airport runs, optional meet & greet." },
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
  { icon: CheckCircle2, title: "Meet & greet", text: "Name-board pickup on any booking, small extra charge." },
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
  const nearbyGroups = [
    { icon: MapPin, title: `Nearby areas around ${locName}`, items: data.nearbyAreas },
    { icon: Landmark, title: `Attractions near ${locName}`, items: data.attractions },
    { icon: Hotel, title: `Hotels near ${locName}`, items: data.hotels },
    { icon: GraduationCap, title: `Universities near ${locName}`, items: data.universities },
    { icon: Hospital, title: `Hospitals near ${locName}`, items: data.hospitals },
    { icon: Train, title: `Train stations near ${locName}`, items: data.stations },
    { icon: Anchor, title: `Cruise ports near ${locName}`, items: data.cruisePorts },
  ].filter((g) => g.items.length > 0);

  return (
    <SiteLayout cta={{ heading: <>Travelling in <span className="text-gold">{locName}</span>?</>, label: `Get a price in ${locName}`, href: "#booking", trackAs: "final_cta_area", subtitle: "Your journey details are already in the booking form above. Check the fixed price before you pay, or call our team any time." }}>
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
        intro={{
          eyebrow: "Why Cabslink",
          heading: `Airport travel and private hire in ${locName}`,
          body: <p>Cabslink provides reliable airport transfers, private hire, executive cars, corporate
            transport, luxury private-driver travel and group transfers in <strong>{locName}</strong>.
            Book a fixed-price taxi or cab from {locName} to Edinburgh Airport, Glasgow Airport or any other UK airport —
            with 24/7 availability, optional meet-and-greet and door-to-door service.</p>,
          details: WHY.map((w) => ({ icon: w.icon, value: w.title, note: w.text })),
        }}
      />

      {/* Bands sit directly in <main> so the shared white / cream rhythm applies. */}
      <PageBand eyebrow="Our services" title={`Airport travel services in ${locName}`}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <a
              key={s.href}
              href={s.href}
              className="group flex min-h-40 flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-raised transition hover:border-[var(--gold)]"
            >
              <div>
                <div className="font-display text-xl font-semibold text-[var(--navy)]">{s.label}</div>
                <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.blurb}</div>
              </div>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gold-ink)]">
                Learn more <ArrowRight className="size-3.5" />
              </span>
            </a>
          ))}
        </div>
      </PageBand>

      {(data.airports.length > 0 || data.popularRoutes.length > 0) && (
        <PageBand eyebrow="Getting around" title={`Airports and routes from ${locName}`}>
          <div className={`grid gap-10 ${data.airports.length && data.popularRoutes.length ? "lg:grid-cols-2" : ""}`}>
            {data.airports.length > 0 && (
              <div>
                <GroupLabel icon={Plane}>Airport transfers from {locName}</GroupLabel>
                {data.popularRoutes.length ? <EntityList items={data.airports} /> : <EntityGrid items={data.airports} />}
              </div>
            )}
            {data.popularRoutes.length > 0 && (
              <div>
                <GroupLabel icon={MapPin}>Popular routes from {locName}</GroupLabel>
                {data.airports.length ? <EntityList items={data.popularRoutes} /> : <EntityGrid items={data.popularRoutes} />}
              </div>
            )}
          </div>
        </PageBand>
      )}

      {(vehicleClasses ?? []).length > 0 && (
        <PageBand eyebrow="Our fleet" title="Vehicles available">
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-raised">
            <table className="w-full min-w-[30rem] text-left text-sm">
              <caption className="sr-only">Vehicle classes available for journeys from {locName}</caption>
              <thead className="bg-[var(--navy)] text-[var(--navy-foreground)]">
                <tr>
                  <th scope="col" className="px-5 py-3.5 font-semibold">Vehicle</th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">Passengers</th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">Large bags</th>
                </tr>
              </thead>
              <tbody>
                {(vehicleClasses ?? []).map((c) => (
                  <tr key={c.id} className="border-t border-border even:bg-[var(--surface-2)]">
                    <th scope="row" className="px-5 py-3.5 font-semibold text-[var(--navy)]">{c.name}</th>
                    <td className="px-5 py-3.5 text-muted-foreground">{c.passengers ?? "—"}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{c.large_luggage ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <a href="/fleet" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[var(--gold-ink)] hover:underline">
            View full fleet <ArrowRight className="size-4" />
          </a>
        </PageBand>
      )}

      {nearbyGroups.length > 0 && (
        <PageBand eyebrow="Nearby" title={`Places near ${locName}`}>
          <div className="space-y-10">
            {nearbyGroups.map((g) => (
              <div key={g.title}>
                <GroupLabel icon={g.icon}>{g.title}</GroupLabel>
                <EntityGrid items={g.items} />
              </div>
            ))}
          </div>
        </PageBand>
      )}

      <LocalPagesSection slug={d.slug} name={locName} />

      {/* Phase 7 guide text. */}
      {guide ? <PlaceGuideBlock guide={guide} /> : null}

      <FaqBand items={buildAreaFaqs(data)} />

      <LocalMapSection
        focus={
          typeof d.lat === "number" && typeof d.lng === "number"
            ? { lat: d.lat, lng: d.lng, label: locName }
            : null
        }
      />
      <RelatedLinks center={typeof d.lat === "number" && typeof d.lng === "number" ? { lat: d.lat, lng: d.lng } : null} />
    </SiteLayout>
  );
}

/** Compact one-column list of destination links (inside a two-column band). */
function EntityList({ items }: { items: Destination[] }) {
  return (
    <ul className="grid gap-3">
      {items.map((x) => (
        <li key={x.id}>
          <EntityCard d={x} />
        </li>
      ))}
    </ul>
  );
}

function LocalPagesSection({ slug, name }: { slug: string; name: string }) {
  const services = servicePagesForLocation(slug);
  const journeys = journeyLinksForLocation(slug);
  if (services.length === 0 && journeys.length === 0) return null;

  return (
    <PageBand eyebrow="Local pages" title={`More on travel in ${name}`}>
      <div className={`grid gap-10 ${services.length && journeys.length ? "lg:grid-cols-2" : ""}`}>
        {services.length > 0 && (
          <div>
            <GroupLabel>Services in {name}</GroupLabel>
            <LinkCards columns={services.length && journeys.length ? 1 : 3} links={services.map((x) => ({ href: x.to, label: x.label }))} />
          </div>
        )}
        {journeys.length > 0 && (
          <div>
            <GroupLabel>Fixed-price journeys</GroupLabel>
            <LinkCards columns={services.length && journeys.length ? 1 : 3} links={journeys.map((j) => ({ href: j.to, label: j.label }))} />
          </div>
        )}
      </div>
    </PageBand>
  );
}
