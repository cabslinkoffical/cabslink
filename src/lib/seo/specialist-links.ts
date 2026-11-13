/**
 * Hand-picked links from related area, airport and tour pages to specialist
 * pages that otherwise had at most one internal link pointing at them.
 * Each target is listed on at least two relevant source pages.
 */
export type SpecialistLink = { href: string; label: string };

const L = {
  prices: { href: "/edinburgh-airport-taxi-prices", label: "Edinburgh Airport taxi prices" },
  chauffeur: { href: "/edinburgh-chauffeur", label: "Edinburgh chauffeur service" },
  glaAirport: { href: "/glasgow-airport-transfers", label: "Glasgow Airport transfers" },
  skye: { href: "/isle-of-skye-tours", label: "Private Isle of Skye tours" },
  lochNess: { href: "/loch-ness-tours", label: "Private Loch Ness tours" },
  outlander: { href: "/outlander-tours", label: "Private Outlander tours" },
  golf: { href: "/st-andrews-golf-transfers", label: "St Andrews golf transfers" },
  business: { href: "/travel-solutions/business-travel", label: "Business travel" },
  event: { href: "/travel-solutions/event-travel", label: "Event travel" },
  family: { href: "/travel-solutions/family-travel", label: "Family travel" },
  group: { href: "/travel-solutions/group-travel", label: "Group travel" },
  student: { href: "/travel-solutions/student-travel", label: "Student travel" },
} satisfies Record<string, SpecialistLink>;

export const SPECIALIST_LINKS: Record<string, SpecialistLink[]> = {
  "/airports/edinburgh-airport": [L.prices, L.chauffeur, L.business, L.family],
  "/airports/glasgow-airport": [L.glaAirport, L.group],
  "/areas/edinburgh": [L.prices, L.chauffeur, L.outlander, L.event, L.student],
  "/areas/glasgow": [L.glaAirport, L.event, L.group],
  "/areas/inverness": [L.lochNess, L.skye],
  "/areas/fort-william": [L.skye, L.lochNess],
  "/areas/st-andrews": [L.golf, L.student],
  "/areas/stirling": [L.outlander, L.family],
  "/areas/perth": [L.business],
  "/areas/dundee": [L.golf],
  "/tours/stirling-and-doune-castles-day": [L.outlander],
  "/tours/glencoe-highlands-private-day": [L.skye],
};

export function specialistLinksFor(path: string): SpecialistLink[] {
  return SPECIALIST_LINKS[path.replace(/\/+$/, "") || "/"] ?? [];
}
