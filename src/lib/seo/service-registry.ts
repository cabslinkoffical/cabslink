/**
 * Canonical service URL registry (Phase A — single source of truth for
 * SERVICE identity and URLs).
 *
 * Source-of-truth decision:
 *  - LOCATION identity (id, name, slug, type, region, council, lat/lng,
 *    place_id, seo_tier, active) stays in the `destinations` table. Nothing in
 *    this file may restate or override those fields.
 *  - SERVICE identity (canonical slug, canonical URL, local child pattern,
 *    aliases, publication status) lives here, because no table currently
 *    models it and the routes are code-defined anyway.
 *  - Editorial content (intro, local facts, FAQs, verification) is keyed by
 *    `serviceId` + destination slug so it always resolves back to the
 *    canonical database record.
 */

export type ServicePublication = "published" | "draft";

export type ServiceRecord = {
  /** Stable id used to key editorial content and combination records. */
  id: string;
  name: string;
  /** Canonical slug — identical for the national page and its local children. */
  slug: string;
  /** Canonical absolute path of the national page. */
  url: string;
  /** True when the national route already exists in src/routes. */
  routeExists: boolean;
  /** Local child pattern, or null when local children are not planned. */
  localPattern: string | null;
  /** Search/wording aliases. Never become indexable URLs of their own. */
  aliases: string[];
  /** Legacy or duplicate paths that must 301 to `url`. */
  redirectFrom: string[];
  publication: ServicePublication;
  /** Distinct intent statement — used to reject cannibalising pages. */
  intent: string;
  /** Canonical service this one defers to when intent overlaps. */
  consolidatedInto?: string;
};

export const SERVICE_REGISTRY: ServiceRecord[] = [
  {
    id: "airport-transfers",
    name: "Airport Transfers",
    slug: "airport-transfers",
    url: "/airport-transfers",
    routeExists: true,
    localPattern: "/airport-transfers/{location}",
    aliases: [
      "airport taxi",
      "airport cab",
      "airport pickup",
      "airport drop off",
      "meet and greet transfer",
      "flight transfer",
    ],
    redirectFrom: [],
    publication: "published",
    intent: "Booking a pre-arranged door-to-airport or airport-to-door transfer.",
  },
  {
    id: "private-hire",
    name: "Private Hire",
    slug: "private-hire",
    url: "/private-hire",
    routeExists: true,
    localPattern: "/private-hire/{location}",
    aliases: ["private car", "private taxi", "phv", "licensed private hire car"],
    publication: "published",
    redirectFrom: [],
    intent: "General licensed point-to-point private car travel that is not airport specific.",
  },
  {
    id: "executive-transfers",
    name: "Executive Transfers",
    slug: "executive-transfers",
    url: "/executive-transfers",
    routeExists: true,
    localPattern: "/executive-transfers/{location}",
    aliases: [
      "chauffeur service",
      "chauffeur hire",
      "executive car service",
      "executive driver",
      "executive taxi",
      "luxury transfer",
      "premium transfer",
    ],
    redirectFrom: [],
    publication: "published",
    intent:
      "Premium saloon/MPV travel with a professional driver for business and high-comfort journeys. Canonical target for all chauffeur and executive-car wording.",
  },
  {
    id: "vip-transfers",
    name: "VIP Transfers",
    slug: "vip-transfers",
    url: "/vip-transfers",
    routeExists: true,
    localPattern: null,
    aliases: ["vip car", "celebrity transport", "discreet transport"],
    redirectFrom: [],
    publication: "published",
    intent:
      "Discretion-led travel for public figures and high-profile guests — privacy and security needs, not general executive comfort.",
  },
  {
    id: "corporate-travel",
    name: "Corporate Travel",
    slug: "corporate-travel",
    url: "/corporate-travel",
    routeExists: true,
    localPattern: "/corporate-travel/{location}",
    aliases: [
      "corporate transfers",
      "business transfers",
      "business travel account",
      "company taxi account",
    ],
    redirectFrom: [],
    publication: "published",
    intent: "Account-based, billed business travel for organisations rather than one-off consumer bookings.",
  },
  {
    id: "long-distance-transfers",
    name: "Long-Distance Transfers",
    slug: "long-distance-transfers",
    url: "/long-distance-transfers",
    routeExists: true,
    localPattern: null,
    aliases: ["intercity transfer", "cross country taxi", "long distance taxi"],
    redirectFrom: [],
    publication: "published",
    intent: "Single-vehicle journeys over long distances between UK cities and regions.",
  },
  {
    id: "group-transfers",
    name: "Group Transfers",
    slug: "group-transfers",
    url: "/group-transfers",
    routeExists: true,
    localPattern: null,
    aliases: ["group taxi", "group transport", "large party transfer"],
    redirectFrom: [],
    publication: "published",
    intent:
      "Coordinating travel for a party too large for one car — vehicle mix and capacity planning. Minibus and coach hire are the vehicle-specific children.",
  },
  {
    id: "minibus-hire",
    name: "Minibus Hire",
    slug: "minibus-hire",
    url: "/minibus-hire",
    routeExists: true,
    localPattern: "/minibus-hire/{location}",
    aliases: ["minibus with driver", "16 seater hire", "8 seater minibus", "van hire with driver"],
    redirectFrom: [],
    publication: "published",
    intent: "Hiring a specific minibus class with a driver for 8–24 passengers.",
  },
  {
    id: "coach-hire",
    name: "Coach Hire",
    slug: "coach-hire",
    url: "/coach-hire",
    routeExists: true,
    localPattern: null,
    aliases: ["coach with driver", "55 seater coach", "bus hire"],
    redirectFrom: [],
    publication: "published",
    intent: "Hiring a full-size coach with a driver for 25+ passengers.",
  },
  {
    id: "cruise-transfers",
    name: "Cruise Transfers",
    slug: "cruise-transfers",
    url: "/cruise-transfers",
    routeExists: true,
    localPattern: "/cruise-transfers/{location}",
    aliases: ["cruise port taxi", "port transfer", "ship terminal transfer"],
    redirectFrom: [],
    publication: "published",
    intent: "Travel between airports/hotels and cruise terminals with cruise-luggage handling.",
  },
  {
    id: "university-transfers",
    name: "University Transfers",
    slug: "university-transfers",
    url: "/university-transfers",
    routeExists: true,
    localPattern: "/university-transfers/{location}",
    aliases: ["student taxi", "campus transfer", "move in transfer"],
    redirectFrom: [],
    publication: "published",
    intent: "Arrival, term-start and campus travel tied to a specific university.",
  },
  {
    id: "hospital-transfers",
    name: "Hospital Transfers",
    slug: "hospital-transfers",
    url: "/hospital-transfers",
    routeExists: true,
    localPattern: null,
    aliases: ["medical appointment transport", "hospital taxi", "patient transport"],
    redirectFrom: [],
    publication: "published",
    intent: "Non-emergency travel to and from medical appointments and discharge.",
  },
  {
    id: "golf-transfers",
    name: "Golf Transfers",
    slug: "golf-transfers",
    url: "/golf-transfers",
    routeExists: true,
    localPattern: "/golf-transfers/{location}",
    aliases: ["golf taxi", "golf tour transport", "golf bag transfer"],
    redirectFrom: [],
    publication: "published",
    intent: "Travel for golf itineraries where clubs, bags and tee times drive the vehicle choice.",
  },
  {
    id: "wedding-transport",
    name: "Wedding Transport",
    slug: "wedding-transport",
    url: "/wedding-transport",
    routeExists: true,
    localPattern: null,
    aliases: ["wedding car", "bridal car hire", "wedding guest transport"],
    redirectFrom: [],
    publication: "published",
    intent: "Wedding-day vehicles and guest shuttles on a fixed schedule.",
  },
  {
    id: "event-transport",
    name: "Event Transport",
    slug: "event-transport",
    url: "/event-transport",
    routeExists: true,
    localPattern: null,
    aliases: ["event shuttle", "conference transport", "concert transfer"],
    redirectFrom: [],
    publication: "published",
    intent:
      "Multi-vehicle scheduled movement around a dated event. Stadium Transfers stays the sport-venue-specific child.",
  },
  {
    id: "hourly-hire",
    name: "Hourly Hire",
    slug: "hourly-hire",
    url: "/book/hourly",
    routeExists: true,
    localPattern: null,
    aliases: ["hourly chauffeur", "car by the hour", "as directed hire", "day hire"],
    redirectFrom: [],
    publication: "published",
    intent: "Booking a vehicle and driver for a block of time rather than a fixed route.",
  },
  {
    id: "tours",
    name: "Private Tours",
    slug: "tours",
    url: "/tours",
    routeExists: true,
    localPattern: null,
    aliases: ["sightseeing tours", "day tours", "private tour", "driver guided tour"],
    redirectFrom: [],
    publication: "published",
    intent:
      "Multi-stop leisure itineraries with a driver. Canonical target for all sightseeing wording — no separate /sightseeing-tours page.",
  },
  {
    id: "football-transfers",
    name: "Football Transfers",
    slug: "football-transfers",
    url: "/football-transfers",
    routeExists: true,
    localPattern: null,
    aliases: ["match day travel", "football taxi", "away game travel"],
    redirectFrom: [],
    publication: "published",
    intent: "Match-day travel for supporters and groups.",
  },
  {
    id: "stadium-transfers",
    name: "Stadium Transfers",
    slug: "stadium-transfers",
    url: "/stadium-transfers",
    routeExists: true,
    localPattern: null,
    aliases: ["arena transfer", "venue transfer", "concert stadium travel"],
    redirectFrom: [],
    publication: "published",
    intent: "Arrival and departure planning around large venues and road closures.",
  },
  {
    id: "team-sports-travel",
    name: "Team Sports Travel",
    slug: "team-sports-travel",
    url: "/team-sports-travel",
    routeExists: true,
    localPattern: null,
    aliases: ["squad travel", "kit transport", "club coach hire"],
    redirectFrom: [],
    publication: "published",
    intent: "Squad, staff and kit movement for clubs and academies.",
  },
  {
    id: "vip-sports-hospitality",
    name: "VIP Sports Hospitality",
    slug: "vip-sports-hospitality",
    url: "/vip-sports-hospitality",
    routeExists: true,
    localPattern: null,
    aliases: ["hospitality travel", "corporate box transport"],
    redirectFrom: [],
    publication: "published",
    intent: "Guest travel attached to a hospitality package on an event day.",
  },
];

/** Permanent (301) path redirects owned by the SEO layer. */
export const SEO_REDIRECTS: Array<{ from: string; to: string; statusCode: 301 }> = [
  // `/locations/:slug` duplicated `/areas/:slug`; `/areas` is canonical.
  { from: "/locations/:slug", to: "/areas/:slug", statusCode: 301 },
];

export function getService(id: string): ServiceRecord | undefined {
  return SERVICE_REGISTRY.find((s) => s.id === id);
}

export function publishedServices(): ServiceRecord[] {
  return SERVICE_REGISTRY.filter((s) => s.publication === "published");
}

/** Local child path for a service + canonical destination slug. */
export function serviceLocationPath(id: string, locationSlug: string): string | null {
  const svc = getService(id);
  if (!svc?.localPattern) return null;
  return svc.localPattern.replace("{location}", locationSlug);
}

/** Every alias, lowercased — used to assert no alias is also a canonical slug. */
export function allAliases(): string[] {
  return SERVICE_REGISTRY.flatMap((s) => s.aliases.map((a) => a.toLowerCase()));
}
