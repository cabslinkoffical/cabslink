/**
 * Shared renderer for every destination-typed route.
 * Tier 1 → renders editorial page (from seo_pages, via existing CMS).
 * Tier 2 → sparse hub template with facts + internal links + booking widget.
 * Tier 3/4 or missing → 404 (thrown by loader).
 */
import { notFound } from "@tanstack/react-router";
import {
  getDestination,
  getDestinationsByIds,
  type Destination,
  type DestinationType,
} from "@/lib/destinations.functions";
import {
  nearbyLinks,
  popularRouteLinks,
  relatedServiceLinks,
} from "@/lib/internal-links";
import { Breadcrumbs, type Crumb } from "@/components/seo/Breadcrumbs";
import { EntityBox } from "@/components/seo/EntityBox";
import { LinkModuleList } from "@/components/seo/LinkModuleList";
import { SpeakableBlock } from "@/components/seo/SpeakableBlock";

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
  // Tier 3 records exist for search only — never render a page.
  if (destination.seo_tier === 3) throw notFound();
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

export function DestinationPage({
  data,
  breadcrumbs,
}: {
  data: LoadedDestination;
  breadcrumbs: Crumb[];
}) {
  const { destination: d, nearby, popularRoutes, relatedServices } = data;
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Breadcrumbs items={breadcrumbs} />
      <header className="mt-4 mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-[var(--navy)]">
          {d.display_name ?? d.name}
        </h1>
        {(d.town || d.council || d.region) && (
          <p className="mt-2 text-[var(--navy)]/70">
            {[d.town, d.council, d.region].filter(Boolean).join(" · ")}
          </p>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <SpeakableBlock>
            <p>
              CabsLink provides pre-booked private travel to and from{" "}
              <strong>{d.display_name ?? d.name}</strong>
              {d.region ? ` in ${d.region}` : ""}. Fixed all-inclusive fares, meet
              &amp; greet on request, and 24/7 UK support.
            </p>
          </SpeakableBlock>

          <LinkModuleList
            modules={[
              popularRouteLinks(popularRoutes),
              nearbyLinks(nearby),
              relatedServiceLinks(relatedServices),
            ]}
          />
        </div>
        <div className="space-y-4">
          <EntityBox d={d} />
          <a
            href={`/book?to=${encodeURIComponent(d.display_name ?? d.name)}`}
            className="block rounded-2xl bg-[var(--gold)] px-4 py-3 text-center font-semibold text-[var(--navy)] hover:brightness-95"
          >
            Book a ride
          </a>
        </div>
      </div>
    </main>
  );
}
