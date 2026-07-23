/**
 * Deterministic internal-link resolvers for the SEO hierarchy.
 * Pure functions — no I/O. Consumers pass in Destination arrays already
 * fetched via destinations.functions.ts.
 */
import type { Destination } from "@/lib/destinations.functions";
import { destinationHref } from "@/lib/destinations.functions";

export type LinkModule = {
  heading: string;
  links: Array<{ href: string; label: string; sublabel?: string }>;
};

/** Type → segment for the hub route. */
export const HUB_SEGMENTS: Record<Destination["type"], string> = {
  location: "areas",
  route: "routes",
  airport: "airports",
  station: "stations",
  cruise_port: "cruise-ports",
  university: "universities",
  hospital: "hospitals",
  corporate: "corporate",
  attraction: "attractions",
  distillery: "distilleries",
  business_park: "corporate",
  service: "services",
  guide: "guides",
  region: "areas",
  council: "areas",
  city: "areas",
  town: "areas",
  village: "areas",
};

/** Human label per type. */
export const HUB_LABELS: Record<Destination["type"], string> = {
  location: "Areas",
  route: "Popular Routes",
  airport: "Airports",
  station: "Stations",
  cruise_port: "Cruise Ports",
  university: "Universities",
  hospital: "Hospitals",
  corporate: "Corporate Locations",
  attraction: "Attractions",
  distillery: "Distilleries",
  business_park: "Business Parks",
  service: "Services",
  guide: "Travel Guides",
  region: "Regions",
  council: "Councils",
};

export function nearbyLinks(nearby: Destination[]): LinkModule {
  return {
    heading: "Nearby destinations",
    links: nearby.map((d) => ({
      href: destinationHref(d),
      label: d.display_name ?? d.name,
      sublabel: [d.council, d.region].filter(Boolean).join(", ") || undefined,
    })),
  };
}

export function popularRouteLinks(routes: Destination[]): LinkModule {
  return {
    heading: "Popular routes from here",
    links: routes.map((d) => ({
      href: destinationHref(d),
      label: d.display_name ?? d.name,
    })),
  };
}

export function relatedServiceLinks(services: Destination[]): LinkModule {
  return {
    heading: "Related services",
    links: services.map((d) => ({
      href: destinationHref(d),
      label: d.display_name ?? d.name,
    })),
  };
}

/** Homepage → hub links. */
export const HOME_TO_HUBS: Array<{ href: string; label: string }> = [
  { href: "/services", label: "Services" },
  { href: "/areas", label: "Areas we cover" },
  { href: "/routes", label: "Popular routes" },
  { href: "/airports", label: "Airports" },
  { href: "/stations", label: "Train stations" },
  { href: "/cruise-ports", label: "Cruise ports" },
  { href: "/universities", label: "Universities" },
  { href: "/hospitals", label: "Hospitals" },
  { href: "/corporate", label: "Corporate travel" },
  { href: "/attractions", label: "Attractions" },
  { href: "/distilleries", label: "Distilleries" },
  { href: "/guides", label: "Travel guides" },
];
