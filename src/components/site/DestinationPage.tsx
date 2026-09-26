/**
 * Shared renderer for every destination-typed route.
 *
 * The route file only supplies the loader key; this component pulls the
 * template config, runs the content engine, and renders sections in the
 * template's declared order. No route file needs to know section-level
 * details — one page pattern for all 15 destination types.
 */
import { notFound } from "@tanstack/react-router";
import {
  getDestination,
  getDestinationsByIds,
  type Destination,
  type DestinationType,
} from "@/lib/destinations.functions";
import { Breadcrumbs, type Crumb } from "@/components/seo/Breadcrumbs";
import { DestinationSections } from "@/components/seo/DestinationSections";
import { buildSections } from "@/lib/seo/content-engine";
import { getTemplate } from "@/lib/seo/template-registry";
import { evaluateQuality } from "@/lib/seo/quality";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Link } from "@tanstack/react-router";
import { MapPin, Clock, Car, Phone, PoundSterling } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getFromFare } from "@/lib/from-fare.functions";

export type LoadedDestination = {
  destination: Destination;
  nearby: Destination[];
  popularRoutes: Destination[];
  relatedServices: Destination[];
};

/** Loader helper — call from route `loader`. Throws notFound() when missing. */
export async function loadDestination(
  type: DestinationType,
  slug: string,
): Promise<LoadedDestination> {
  const destination = await getDestination({ data: { type, slug } });
  if (!destination) throw notFound();
  // Tier 3 rows still render — evaluateQuality will force noindex on them.
  const [nearby, popularRoutes, relatedServices] = await Promise.all([
    destination.nearby_ids.length
      ? getDestinationsByIds({ data: { ids: destination.nearby_ids.slice(0, 12) } })
      : Promise.resolve([]),
    destination.popular_route_ids.length
      ? getDestinationsByIds({ data: { ids: destination.popular_route_ids.slice(0, 12) } })
      : Promise.resolve([]),
    destination.related_service_ids.length
      ? getDestinationsByIds({ data: { ids: destination.related_service_ids.slice(0, 12) } })
      : Promise.resolve([]),
  ]);
  return { destination, nearby, popularRoutes, relatedServices };
}

export function buildBreadcrumbs(d: Destination, hubHref: string, hubLabel: string): Crumb[] {
  const items: Crumb[] = [{ name: "Home", href: "/" }, { name: hubLabel, href: hubHref }];
  if (d.region) items.push({ name: d.region, href: hubHref });
  items.push({ name: d.display_name ?? d.name, href: `${hubHref}/${d.slug}` });
  return items;
}

/** Reference points for journey estimates (city-centre coordinates). */
const ORIGINS = [
  { name: "Edinburgh city centre", lat: 55.9533, lng: -3.1883 },
  { name: "Glasgow city centre", lat: 55.8609, lng: -4.2514 },
];

/** Rough road estimate from straight-line distance: x1.3 road factor, ~65 km/h average. */
export function estimateDrive(lat: number, lng: number, o: { lat: number; lng: number }) {
  const R = 6371;
  const toR = (x: number) => (x * Math.PI) / 180;
  const a =
    Math.sin(toR(lat - o.lat) / 2) ** 2 +
    Math.cos(toR(o.lat)) * Math.cos(toR(lat)) * Math.sin(toR(lng - o.lng) / 2) ** 2;
  const km = 2 * R * Math.asin(Math.sqrt(a)) * 1.3;
  const miles = Math.max(1, Math.round(km * 0.621));
  const mins = Math.max(10, Math.round(((km / 65) * 60) / 5) * 5);
  return { miles, mins };
}

function fmtMins(m: number) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export function DestinationPage({
  data,
  breadcrumbs,
}: {
  data: LoadedDestination;
  breadcrumbs: Crumb[];
}) {
  const d = data.destination;
  const tpl = getTemplate(d.type);
  const quality = evaluateQuality(d);
  // Generic service definitions are dropped: they read as boilerplate.
  const sections = buildSections(data, tpl.sections.filter((k) => k !== "related_services"));
  const name = d.display_name ?? d.name;
  const place = [d.town, d.council, d.region].filter(Boolean).join(" · ");
  const image = (d as { hero_image_url?: string | null }).hero_image_url ?? null;
  const hasGeo = typeof d.lat === "number" && typeof d.lng === "number";
  const drives = hasGeo
    ? ORIGINS.map((o) => ({ from: o.name, ...estimateDrive(d.lat as number, d.lng as number, o) }))
    : [];
  const fare = useQuery({
    queryKey: ["from-fare", d.lat, d.lng],
    queryFn: () => getFromFare({ data: { lat: d.lat as number, lng: d.lng as number } }),
    enabled: hasGeo,
    staleTime: 10 * 60_000,
  }).data;

  return (
    <SiteLayout>
      <section className="relative overflow-hidden bg-[var(--navy)] text-white">
        {image && (
          <img
            src={image}
            alt={name}
            width={1600}
            height={700}
            loading="eager"
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        )}
        <div className="relative mx-auto max-w-6xl px-4 py-14 md:py-20">
          <Breadcrumbs items={breadcrumbs} />
          <h1 className="mt-5 font-display text-4xl font-bold leading-tight md:text-5xl">
            {name} <span className="text-[var(--gold)]">transfers</span>
          </h1>
          {place && (
            <p className="mt-3 flex items-center gap-2 text-white/75">
              <MapPin className="size-4" /> {place}
            </p>
          )}
          <p className="mt-4 max-w-2xl text-lg text-white/85">
            Private, pre-booked car to or from {name}. Fixed fare confirmed before you pay, with a
            professional driver collecting you at the pickup address you choose.
          </p>
          {fare && (
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/50 bg-white/5 px-4 py-2 text-sm">
              <PoundSterling className="size-4 text-[var(--gold)]" />
              From <strong className="text-[var(--gold)]">{fare.symbol}{fare.amount}</strong> from Edinburgh · {fare.vehicle}
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/book"
              search={{ to: name } as never}
              className="rounded-full bg-[var(--gold)] px-7 py-3.5 font-semibold text-[var(--navy)] hover:brightness-110"
            >
              Get a price
            </Link>
            <a
              href="tel:+443338882991"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-7 py-3.5 font-semibold text-white hover:border-[var(--gold)]"
            >
              <Phone className="size-4" /> +44 333 888 2991
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {quality.effectiveNoindex && d.seo_tier !== 2 && (
          <div className="mb-6 rounded-xl border border-warning/40 bg-warning/12 px-4 py-3 text-sm text-warning">
            This page is not indexed by search engines yet — it is missing required data.
          </div>
        )}

        <section aria-label="Journey facts" className="mb-10 grid gap-4 md:grid-cols-3">
          {drives.map((j) => (
            <div key={j.from} className="rounded-2xl border border-[var(--navy)]/10 bg-white p-5 shadow-raised">
              <Clock className="size-5 text-[var(--gold-ink)]" />
              <p className="mt-3 text-sm text-[var(--navy)]/60">From {j.from}</p>
              <p className="mt-1 text-xl font-bold text-[var(--navy)]">
                approx. {fmtMins(j.mins)} · {j.miles} miles
              </p>
              <p className="mt-1 text-xs text-[var(--navy)]/55">Estimate — traffic varies. Your quote shows the exact route.</p>
            </div>
          ))}
          <div className="rounded-2xl border border-[var(--navy)]/10 bg-white p-5 shadow-raised">
            <Car className="size-5 text-[var(--gold-ink)]" />
            <p className="mt-3 text-sm text-[var(--navy)]/60">Pickup</p>
            <p className="mt-1 font-semibold text-[var(--navy)]">
              Your driver meets you at the exact address or entrance you enter when booking.
            </p>
            <p className="mt-1 text-xs text-[var(--navy)]/55">Add notes (gate, door, flight number) at checkout.</p>
          </div>
        </section>

        <DestinationSections sections={sections} loaded={data} />
      </div>
    </SiteLayout>
  );
}
