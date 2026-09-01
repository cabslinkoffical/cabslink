/**
 * Template registry — single source of truth for how each destination type
 * renders and what JSON-LD it emits. Adding a new type = one entry here.
 */
import type { Destination, DestinationType } from "@/lib/destinations.functions";
import {
  airportSchema,
  localBusinessSchema,
  serviceSchema,
  touristAttractionSchema,
  travelActionSchema,
} from "@/components/seo/schema";

export type SchemaNode = Record<string, unknown>;

export type TemplateConfig = {
  /** Human title used in breadcrumbs / hub headings. */
  hubLabel: string;
  /** URL segment (must match HUB_SEGMENTS in internal-links.ts). */
  hubSegment: string;
  /** Sentence stem used to build the auto meta description. */
  descriptionStem: (d: Destination) => string;
  /** Auto SEO title template. */
  titleTemplate: (d: Destination) => string;
  /** JSON-LD nodes specific to this type (merged into the @graph). */
  typeSchema: (d: Destination) => SchemaNode[];
  /** Section ids allowed for this type, in render order. */
  sections: SectionKey[];
};

export const SECTION_KEYS = [
  "summary",       // Speakable intro paragraph derived from data
  "route_action",  // TravelAction card for /routes/*
  "facts",         // EntityBox with structured facts
  "geo_context",   // Region → council → town breakdown
  "airport_info",  // Airport-specific facts (IATA, terminals if in meta)
  "attraction_info", // Attraction facts (visit time, category)
  "popular_routes", // Link module
  "nearby",        // Link module
  "related_services", // Link module
  "faq",           // Generated FAQs
  "book_cta",      // Persistent booking CTA
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

const commonSections: SectionKey[] = [
  "summary", "facts", "geo_context",
  "popular_routes", "nearby", "related_services", "faq", "book_cta",
];

/** Destination display name, preferring the override. */
const nameOf = (d: Destination) => d.display_name ?? d.name;

/**
 * Many destination names already carry the category noun the template is about
 * to append ("Edinburgh Waverley Station", "University of Edinburgh"), which
 * produced titles like "… Station Station Taxis". This appends the noun only
 * when the name does not already contain it as a whole word.
 */
export function withNoun(name: string, noun: string): string {
  const n = name.trim();
  if (new RegExp(`\\b${noun}\\b`, "i").test(n)) return n;
  return `${n} ${noun}`;
}


/**
 * Composes `${base}${tail}` with the " — CabsLink" suffix only when the whole
 * title still fits inside 60 characters, so nothing is truncated by Google.
 */
export function titleWithin(base: string, limit = 60, suffix = " — CabsLink"): string {
  return base.length + suffix.length <= limit ? `${base}${suffix}` : base;
}


export const TEMPLATES: Record<DestinationType, TemplateConfig> = {
  location: {
    hubLabel: "Areas We Cover",
    hubSegment: "areas",
    titleTemplate: (d) => `${d.display_name ?? d.name} Taxis & Private Transfers — Fixed Fares`,
    descriptionStem: (d) => `Pre-booked taxis and airport transfers serving ${d.display_name ?? d.name}. Fixed fares, professional drivers, book online or by phone.`,
    typeSchema: (d) => [localBusinessSchema(d)],
    sections: commonSections,
  },
  city: {
    hubLabel: "Cities",
    hubSegment: "areas",
    titleTemplate: (d) => `${d.display_name ?? d.name} Taxis & Airport Transfers — Fixed Fares`,
    descriptionStem: (d) => `Pre-booked taxis, private hire and airport transfers in ${d.display_name ?? d.name}. Fixed prices by vehicle class, no meter, 24/7.`,
    typeSchema: (d) => [localBusinessSchema(d)],
    sections: commonSections,
  },
  town: {
    hubLabel: "Towns",
    hubSegment: "areas",
    titleTemplate: (d) => `${d.display_name ?? d.name} Taxis & Private Transfers — Fixed Fares`,
    descriptionStem: (d) => `Pre-booked taxis and airport transfers serving ${d.display_name ?? d.name}. Fixed fares, professional drivers, book online or by phone.`,
    typeSchema: (d) => [localBusinessSchema(d)],
    sections: commonSections,
  },
  village: {
    hubLabel: "Villages",
    hubSegment: "areas",
    titleTemplate: (d) => `${d.display_name ?? d.name} Taxis & Private Transfers — Fixed Fares`,
    descriptionStem: (d) => `Pre-booked taxis and airport transfers serving ${d.display_name ?? d.name}. Fixed fares, professional drivers, book online or by phone.`,
    typeSchema: (d) => [localBusinessSchema(d)],
    sections: commonSections,
  },
  region: {
    hubLabel: "Regions",
    hubSegment: "areas",
    titleTemplate: (d) => `${d.name} Private Travel — CabsLink`,
    descriptionStem: (d) => `Private travel across the ${d.name} region.`,
    typeSchema: (d) => [localBusinessSchema(d)],
    sections: commonSections,
  },
  council: {
    hubLabel: "Councils",
    hubSegment: "areas",
    titleTemplate: (d) => `${d.name} Private Travel — CabsLink`,
    descriptionStem: (d) => `Private travel throughout ${d.name}${d.region ? `, ${d.region}` : ""}.`,
    typeSchema: (d) => [localBusinessSchema(d)],
    sections: commonSections,
  },
  route: {
    hubLabel: "Popular Routes",
    hubSegment: "routes",
    titleTemplate: (d) => {
      const m = d.meta as { from_name?: string; to_name?: string };
      return `${m.from_name ?? "From"} to ${m.to_name ?? "Destination"} Taxi | Fixed Price Transfer`;
    },
    descriptionStem: (d) => {
      const m = d.meta as { from_name?: string; to_name?: string };
      return `How much is a taxi from ${m.from_name ?? ""} to ${m.to_name ?? ""}? Fixed fares by vehicle class, flight tracking and no meter. Book online with CabsLink.`;
    },
    typeSchema: (d) => {
      const m = d.meta as { from_name?: string; to_name?: string };
      return m.from_name && m.to_name ? [travelActionSchema(m.from_name, m.to_name)] : [];
    },
    sections: ["summary", "route_action", "facts", "faq", "book_cta"],
  },
  airport: {
    hubLabel: "Airports",
    hubSegment: "airports",
    titleTemplate: (d) => titleWithin(`${withNoun(nameOf(d), "Airport")} Taxi & Transfers`),
    descriptionStem: (d) => `Fixed-price taxis and private transfers to and from ${nameOf(d)}. Meet & greet, flight tracking, 24/7 UK support.`,
    typeSchema: (d) => [airportSchema(d)],
    sections: ["summary", "airport_info", "facts", "popular_routes", "nearby", "faq", "book_cta"],
  },
  station: {
    hubLabel: "Train Stations",
    hubSegment: "stations",
    titleTemplate: (d) => titleWithin(`${withNoun(nameOf(d), "Station")} Taxis & Transfers`),
    descriptionStem: (d) => `Pre-booked transfers to and from ${nameOf(d)} rail station.`,
    typeSchema: (d) => [localBusinessSchema(d)],
    sections: commonSections,
  },
  cruise_port: {
    hubLabel: "Cruise Ports",
    hubSegment: "cruise-ports",
    titleTemplate: (d) => {
      const n = nameOf(d).trim();
      // "… Cruise Terminal" / "… Cruise Anchorage" already carry the noun.
      const base = /\b(cruise (terminal|anchorage|port)|terminal|harbour|port)$/i.test(n)
        ? `${n} Transfers`
        : `${n} Cruise Transfers`;
      return titleWithin(base);
    },
    descriptionStem: (d) => `Private transfers to the ${nameOf(d)} cruise terminal.`,
    typeSchema: (d) => [localBusinessSchema(d)],
    sections: commonSections,
  },
  university: {
    hubLabel: "Universities",
    hubSegment: "universities",
    titleTemplate: (d) => titleWithin(`${withNoun(nameOf(d), "University")} Student Taxis & Transfers`),
    descriptionStem: (d) => `Term travel, move-in and airport runs for ${nameOf(d)}.`,
    typeSchema: (d) => [localBusinessSchema(d)],
    sections: commonSections,
  },
  hospital: {
    hubLabel: "Hospitals",
    hubSegment: "hospitals",
    titleTemplate: (d) => titleWithin(`${withNoun(nameOf(d), "Hospital")} Transport`),
    descriptionStem: (d) => `Reliable private transport for appointments at ${nameOf(d)}.`,
    typeSchema: (d) => [localBusinessSchema(d)],
    sections: commonSections,
  },

  corporate: {
    hubLabel: "Corporate Locations",
    hubSegment: "corporate",
    titleTemplate: (d) => `${d.display_name ?? d.name} Business Travel — CabsLink`,
    descriptionStem: (d) => `Executive and team transfers serving ${d.display_name ?? d.name}.`,
    typeSchema: (d) => [localBusinessSchema(d)],
    sections: commonSections,
  },
  business_park: {
    hubLabel: "Business Parks",
    hubSegment: "corporate",
    titleTemplate: (d) => `${d.display_name ?? d.name} Business Travel — CabsLink`,
    descriptionStem: (d) => `Corporate transfers to ${d.display_name ?? d.name}.`,
    typeSchema: (d) => [localBusinessSchema(d)],
    sections: commonSections,
  },
  attraction: {
    hubLabel: "Attractions",
    hubSegment: "attractions",
    titleTemplate: (d) => titleWithin(`${nameOf(d)} Private Tours & Transfers`),
    descriptionStem: (d) => `Guided private travel to ${nameOf(d)}${d.region ? `, ${d.region}` : ""}.`,
    typeSchema: (d) => [touristAttractionSchema(d)],
    sections: ["summary", "attraction_info", "facts", "popular_routes", "nearby", "faq", "book_cta"],
  },
  distillery: {
    hubLabel: "Distilleries",
    hubSegment: "distilleries",
    titleTemplate: (d) => titleWithin(`${withNoun(nameOf(d), "Distillery")} Tours & Transfers`),
    descriptionStem: (d) => `Whisky-trail transfers to ${nameOf(d)}.`,
    typeSchema: (d) => [touristAttractionSchema(d)],
    sections: ["summary", "attraction_info", "facts", "popular_routes", "nearby", "faq", "book_cta"],
  },

  service: {
    hubLabel: "Services",
    hubSegment: "services",
    titleTemplate: (d) => `${d.display_name ?? d.name} — CabsLink`,
    descriptionStem: (d) => {
      const m = d.meta as { summary?: string };
      return m.summary ? m.summary.slice(0, 155) : `${d.display_name ?? d.name} from CabsLink.`;
    },
    typeSchema: (d) => [serviceSchema(d)],
    sections: ["summary", "facts", "faq", "book_cta"],
  },
  guide: {
    hubLabel: "Travel Guides",
    hubSegment: "guides",
    titleTemplate: (d) => `${d.display_name ?? d.name} — CabsLink Guide`,
    descriptionStem: (d) => {
      const m = d.meta as { summary?: string };
      return m.summary ? m.summary.slice(0, 155) : `Travel guide: ${d.display_name ?? d.name}.`;
    },
    typeSchema: () => [],
    sections: ["summary", "facts", "nearby", "related_services", "faq"],
  },
};

export function getTemplate(type: DestinationType): TemplateConfig {
  return TEMPLATES[type];
}
