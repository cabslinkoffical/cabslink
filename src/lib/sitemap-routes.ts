/**
 * Static route paths that appear in the core sitemap.
 * Extracted so multiple sitemap handlers can import without circular refs.
 */
import { publishedCombinations } from "@/lib/seo/service-locations";
import { publishedJourneyPaths } from "@/lib/seo/journeys";

/** Published service + location combination pages (facts-gated). */
export const SERVICE_LOCATION_ROUTES = publishedCombinations().map((c) => c.path);

/** Published journey (route) pages (facts-gated). */
export const JOURNEY_ROUTES = publishedJourneyPaths();

export const PUBLIC_ROUTES = [

  "/", "/about", "/services", "/airport-transfers", "/vip-transfers",
  "/golf-transfers", "/football-transfers", "/stadium-transfers",
  "/team-sports-travel", "/vip-sports-hospitality",
  "/corporate-travel", "/tours", "/fleet", "/drive-with-us",
  "/corporate-booking", "/contact", "/book", "/reviews",
  "/privacy", "/terms", "/cookies",
  "/booking-policy", "/refund-policy", "/accessibility",
  "/private-hire", "/executive-transfers", "/long-distance-transfers", "/group-transfers", "/minibus-hire", "/coach-hire", "/cruise-transfers", "/university-transfers", "/hospital-transfers", "/wedding-transport", "/event-transport",
  "/travel-solutions", "/travel-solutions/business-travel", "/travel-solutions/student-travel", "/travel-solutions/family-travel", "/travel-solutions/group-travel", "/travel-solutions/event-travel",
  "/blog",
  "/areas", "/stations", "/cruise-ports", "/universities",
  "/hospitals", "/corporate", "/attractions", "/distilleries", "/guides",
  "/routes",
  ...JOURNEY_ROUTES,
  ...SERVICE_LOCATION_ROUTES,

];
