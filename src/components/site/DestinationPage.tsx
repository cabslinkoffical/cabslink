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
  // Tier 3 records exist for booking search only — never render a page.
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
  const d = data.destination;
  const tpl = getTemplate(d.type);
  const quality = evaluateQuality(d);
  const sections = buildSections(data, tpl.sections);

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

      {quality.effectiveNoindex && d.seo_tier !== 2 && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This page is not indexed by search engines yet — it is missing required data.
        </div>
      )}

      <DestinationSections sections={sections} loaded={data} />
    </main>
  );
}
