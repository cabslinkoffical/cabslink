/**
 * Phase F — internal-linking architecture.
 *
 * Single source of truth for how the SEO surfaces link to each other:
 *   /areas          → coverage map (region → location → local service pages)
 *   /areas/:slug    → published service+location pages + journeys touching it
 *   /routes         → journey hub (see seo/journeys.ts)
 *
 * Pure functions over the facts-gated registries — no I/O, safe anywhere.
 */
import { LOCATION_FACTS, servicePagesForLocation } from "@/lib/seo/service-locations";
import { JOURNEYS, journeyPath, type JourneyRecord } from "@/lib/seo/journeys";

export type CoverageLink = { label: string; to: string };

export type CoverageLocation = {
  slug: string;
  name: string;
  region: string;
  areaPath: string;
  /** Published service + location combination pages. */
  services: CoverageLink[];
  /** Journeys that start or end at this location. */
  journeys: CoverageLink[];
};

export type CoverageRegion = {
  region: string;
  locations: CoverageLocation[];
};

const areaPath = (slug: string) => `/areas/${slug}`;

/** Journeys whose from/to resolves to this location's canonical area page. */
export function journeysForLocation(slug: string): JourneyRecord[] {
  const path = areaPath(slug);
  return JOURNEYS.filter((j) => j.from.path === path || j.to.path === path);
}

/** Journey links for a location, labelled from that location's perspective. */
export function journeyLinksForLocation(slug: string): CoverageLink[] {
  const path = areaPath(slug);
  return journeysForLocation(slug).map((j) => {
    const outbound = j.from.path === path;
    const other = outbound ? j.to.name : j.from.name;
    return {
      label: outbound ? `To ${other}` : `From ${other}`,
      to: journeyPath(j.slug),
    };
  });
}

/** Every location we hold local facts for, with its outbound link set. */
export function coverageLocations(): CoverageLocation[] {
  return Object.values(LOCATION_FACTS)
    .map((f) => ({
      slug: f.slug,
      name: f.name,
      region: f.region,
      areaPath: areaPath(f.slug),
      services: servicePagesForLocation(f.slug),
      journeys: journeyLinksForLocation(f.slug),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Coverage map grouped by region, regions and locations alphabetical. */
export function coverageByRegion(): CoverageRegion[] {
  const byRegion = new Map<string, CoverageLocation[]>();
  for (const loc of coverageLocations()) {
    const list = byRegion.get(loc.region) ?? [];
    list.push(loc);
    byRegion.set(loc.region, list);
  }
  return [...byRegion.entries()]
    .map(([region, locations]) => ({ region, locations }))
    .sort((a, b) => a.region.localeCompare(b.region));
}

/** Total counts used for hub copy and internal-link audits. */
export function coverageTotals() {
  const locations = coverageLocations();
  return {
    locations: locations.length,
    servicePages: locations.reduce((n, l) => n + l.services.length, 0),
    journeys: JOURNEYS.length,
  };
}
