/**
 * Static route paths that appear in the core sitemap.
 * Extracted so multiple sitemap handlers can import without circular refs.
 */
import { publishedCombinations } from "@/lib/seo/service-locations";
import { publishedJourneyPaths } from "@/lib/seo/journeys";
import { publishedGuidePaths } from "@/lib/seo/guides";

/** Published service + location combination pages (facts-gated). */
export const SERVICE_LOCATION_ROUTES = publishedCombinations().map((c) => c.path);

/** Published journey (route) pages (facts-gated). */
export const JOURNEY_ROUTES = publishedJourneyPaths();

/** Published code-defined editorial guides. */
export const GUIDE_ROUTES = publishedGuidePaths();

/** Utility, booking-flow and legal pages that are deliberately not in the sitemap. */
export const SITEMAP_EXCLUDED = [
  "/book", "/book/hourly", "/book/tour", "/distance",
  "/privacy", "/terms", "/cookies", "/image-credits",
];

/** Read every row of a query in 1000-row pages (PostgREST caps responses). */
export async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error?: unknown }>,
  size = 1000,
  max = 50000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < max; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw error;
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < size) break;
  }
  return out;
}

export const PUBLIC_ROUTES = [

  "/", "/about", "/services", "/airport-transfers", "/vip-transfers",
  "/golf-transfers", "/football-transfers", "/stadium-transfers",
  "/team-sports-travel", "/vip-sports-hospitality",
  "/corporate-travel", "/tours", "/fleet", "/drive-with-us",
  "/corporate-booking", "/contact", "/reviews",
  "/booking-policy", "/refund-policy", "/accessibility",
  "/private-hire", "/executive-transfers", "/long-distance-transfers", "/group-transfers", "/minibus-hire", "/coach-hire", "/cruise-transfers", "/university-transfers", "/hospital-transfers", "/event-transport",
  "/travel-solutions", "/travel-solutions/business-travel", "/travel-solutions/student-travel", "/travel-solutions/family-travel", "/travel-solutions/group-travel", "/travel-solutions/event-travel",
  "/blog",
  "/areas", "/airports", "/stations", "/cruise-ports", "/universities",
  "/hospitals", "/corporate", "/attractions", "/distilleries", "/guides",
  "/routes",
  ...JOURNEY_ROUTES,
  ...GUIDE_ROUTES,
  ...SERVICE_LOCATION_ROUTES,

];

if (PUBLIC_ROUTES.some((p) => SITEMAP_EXCLUDED.includes(p))) {
  throw new Error("sitemap-routes: an excluded page was listed in PUBLIC_ROUTES");
}
