/**
 * Data-built content for /areas/region/:slug.
 *
 * Every sentence is assembled from the places we hold in `destinations` and
 * the signed-off journeys in journeys.ts — nothing is invented. Shared policy
 * answers come from FACT_TEXT. The same builder decides indexability, so the
 * page head and the sitemap always agree.
 */
import { FACT_TEXT } from "@/lib/site-facts";
import { estimateDrive, fmtMins, MAIN_AIRPORTS } from "@/lib/drive-estimate";
import { JOURNEYS, journeyPath } from "@/lib/seo/journeys";

/** URL slug for a region name; the region route matches on this. */
export function regionSlug(name: string): string {
  return name.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
}

/** Regions outside our main market stay noindex whatever their content. */
export const NON_MAIN_MARKET_REGIONS = ["England", "Wales", "Northern Ireland"];

/**
 * Island regions: straight-line road estimates are meaningless across water
 * (a ferry is involved), so no distance table is shown for them.
 */
export const ISLAND_REGIONS = ["Islay", "Skye", "Orkney", "Shetland", "Arran", "Mull"];

/** Unique, region-specific words needed before a region page is indexed. */
export const REGION_INDEX_MIN_WORDS = 300;

export type RegionPlace = {
  type: string;
  slug: string;
  name: string;
  display_name: string | null;
  lat: number | null;
  lng: number | null;
  href: string;
};

export type RegionDistanceRow = {
  name: string;
  href: string;
  kind: string;
  edinburgh: string;
  glasgow: string;
  edinburghMins: number;
};

export type RegionRouteRow = {
  label: string;
  href: string;
  miles: number;
  time: string;
  via: string;
};

export type RegionContent = {
  intro: string[];
  distances: RegionDistanceRow[];
  routes: RegionRouteRow[];
  faqs: { q: string; a: string }[];
  /** Words of region-specific text (shared policy answers excluded). */
  uniqueWords: number;
  indexable: boolean;
};

const KIND: Record<string, string> = {
  airport: "Airport", station: "Station", cruise_port: "Cruise port", university: "University",
  hospital: "Hospital", attraction: "Attraction", distillery: "Distillery", business_park: "Business park",
  city: "City", town: "Town", village: "Village", location: "Area", council: "Area",
};

const label = (p: RegionPlace) => p.display_name ?? p.name;

function listNames(names: string[], max = 6): string {
  const shown = names.slice(0, max);
  const more = names.length - shown.length;
  if (shown.length === 0) return "";
  if (shown.length === 1) return shown[0];
  if (more > 0) return `${shown.join(", ")} and ${more} more`;
  return `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
}

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

export function buildRegionContent(regionName: string, places: RegionPlace[]): RegionContent {
  const byKind = (types: string[]) => places.filter((p) => types.includes(p.type)).map(label);
  const towns = byKind(["city", "town", "village", "location", "council"]);
  const airports = byKind(["airport"]);
  const visits = byKind(["attraction", "distillery"]);
  const study = byKind(["university", "hospital", "station", "cruise_port", "business_park"]);

  // Estimated road distances to the two main Scottish airports.
  const allDistances: RegionDistanceRow[] = (ISLAND_REGIONS.includes(regionName) ? [] : places)
    .filter((p) => p.type !== "airport" && p.lat != null && p.lng != null)
    .map((p) => {
      const [edi, gla] = MAIN_AIRPORTS.map((a) => estimateDrive(p.lat!, p.lng!, a));
      return {
        name: label(p), href: p.href, kind: KIND[p.type] ?? "Place",
        edinburgh: `${edi.miles} miles · ${fmtMins(edi.mins)}`,
        glasgow: `${gla.miles} miles · ${fmtMins(gla.mins)}`,
        edinburghMins: edi.mins,
      };
    })
    .sort((a, b) => a.edinburghMins - b.edinburghMins);
  const distances = allDistances.slice(0, 20);
  const nearest = allDistances[0];
  const farthest = allDistances[allDistances.length - 1];

  // Signed-off journeys that start or end at one of this region's pages.
  const hrefs = new Set(places.map((p) => p.href));
  const routes: RegionRouteRow[] = JOURNEYS
    .filter((j) => !j.review && ((j.from.path && hrefs.has(j.from.path)) || (j.to.path && hrefs.has(j.to.path))))
    .map((j) => ({
      label: `${j.from.name} to ${j.to.name}`,
      href: journeyPath(j.slug),
      miles: j.miles,
      time: fmtMins(j.mins),
      via: j.via,
    }));

  const intro: string[] = [];
  intro.push(
    `Cabslink runs fixed-price private hire and airport transfers across ${regionName}. ` +
      `We currently have ${places.length} ${places.length === 1 ? "page" : "pages"} for places in ${regionName}` +
      (towns.length ? `, including ${listNames(towns)}` : "") +
      ".",
  );
  if (airports.length) {
    intro.push(`${regionName} is served by ${listNames(airports)}, and we collect from the terminal as well as from any address in the region.`);
  }
  if (visits.length) {
    intro.push(`Places people travel to in ${regionName} include ${listNames(visits, 8)}, and we can drive you there and back or wait while you visit.`);
  }
  if (study.length) {
    intro.push(`We also cover ${listNames(study, 8)}.`);
  }
  if (nearest) {
    const near = nearest;
    const far = farthest;
    intro.push(
      allDistances.length > 1
        ? `By road, ${near.name} is the closest of these to Edinburgh Airport at about ${near.edinburgh.replace(" · ", ", ")}, while ${far.name} is about ${far.edinburgh.replace(" · ", ", ")}.`
        : `By road, ${near.name} is about ${near.edinburgh.replace(" · ", ", ")} from Edinburgh Airport.`,
    );
  }

  const regionFaqs: { q: string; a: string }[] = [];
  if (places.length) {
    regionFaqs.push({
      q: `Which places in ${regionName} does Cabslink cover?`,
      a: `We have pages for ${listNames(places.map(label), 12)} in ${regionName}, and we collect from any other address in the region too.`,
    });
  }
  if (nearest) {
    const d = nearest;
    regionFaqs.push({
      q: `How far is ${regionName} from Edinburgh Airport?`,
      a: `It depends where you start. ${d.name} is about ${d.edinburgh.replace(" · ", ", ")} by road${allDistances.length > 1 ? `, and ${farthest.name} is about ${farthest.edinburgh.replace(" · ", ", ")}` : ""}. These are estimates; your quote uses the real routed distance.`,
    });
  }
  if (routes.length) {
    regionFaqs.push({
      q: `Do you have fixed-price routes for ${regionName}?`,
      a: `Yes. ${listNames(routes.map((r) => r.label), 6)} each have their own page with distance, journey time and fares.`,
    });
  }
  const sharedFaqs = [
    { q: "How do I pay?", a: FACT_TEXT.payment },
    { q: "Can I cancel my booking?", a: FACT_TEXT.transferCancellation },
    { q: "Is Meet & Greet available?", a: FACT_TEXT.meetGreet },
  ];

  const uniqueWords =
    intro.reduce((n, s) => n + words(s), 0) +
    distances.reduce((n, r) => n + words(`${r.name} ${r.kind} ${r.edinburgh} ${r.glasgow}`), 0) +
    routes.reduce((n, r) => n + words(`${r.label} ${r.miles} miles ${r.time} ${r.via}`), 0) +
    regionFaqs.reduce((n, f) => n + words(`${f.q} ${f.a}`), 0);

  const indexable =
    !NON_MAIN_MARKET_REGIONS.includes(regionName) &&
    uniqueWords >= REGION_INDEX_MIN_WORDS &&
    (routes.length > 0 || distances.length > 0) &&
    regionFaqs.length > 0;

  return { intro, distances, routes, faqs: [...regionFaqs, ...sharedFaqs], uniqueWords, indexable };
}

/**
 * Region paths that pass the indexing rule, from raw destination rows.
 * Used by the sitemap so it lists exactly the region pages that are indexable.
 */
export function indexableRegionPaths(
  rows: Array<Omit<RegionPlace, "href"> & { region: string | null; seo_tier: number | null }>,
  href: (p: { type: string; slug: string }) => string,
): string[] {
  const byRegion = new Map<string, RegionPlace[]>();
  for (const r of rows) {
    if (!r.region || r.seo_tier === 4) continue;
    const list = byRegion.get(r.region) ?? [];
    list.push({ type: r.type, slug: r.slug, name: r.name, display_name: r.display_name, lat: r.lat, lng: r.lng, href: href(r) });
    byRegion.set(r.region, list);
  }
  return [...byRegion.entries()]
    .filter(([name, places]) => buildRegionContent(name, places).indexable)
    .map(([name]) => `/areas/region/${regionSlug(name)}`)
    .sort();
}
