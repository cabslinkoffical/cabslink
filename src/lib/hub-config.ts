import { queryOptions } from "@tanstack/react-query";
import { loadDestination } from "@/components/site/DestinationPage";
import {
  listDestinationsByType,
  listDestinationsByTypes,
  type DestinationType,
} from "@/lib/destinations.functions";

type HubDef =
  | { type: DestinationType; types?: never; title: string; intro: string }
  | { types: DestinationType[]; type: DestinationType; title: string; intro: string };

export const HUBS = {
  // Areas spans the geographic destination types so seeded cities/towns show up.
  areas:          { type: "city" as const,       types: ["location", "city", "town", "village"] as DestinationType[], title: "Areas We Cover",      intro: "Private travel across the United Kingdom." },
  stations:       { type: "station" as const,     title: "Train Stations",      intro: "Station transfers to every mainline UK rail hub." },
  "cruise-ports": { type: "cruise_port" as const, title: "Cruise Ports",        intro: "Direct transfers to UK cruise terminals." },
  universities:   { type: "university" as const,  title: "Universities",        intro: "Move-in, term travel and campus transfers." },
  hospitals:      { type: "hospital" as const,    title: "Hospitals",           intro: "Medical appointment transport, UK-wide." },
  corporate:      { type: "corporate" as const,   title: "Corporate Locations", intro: "Business travel for teams and offices." },
  attractions:    { type: "attraction" as const,  title: "Attractions",         intro: "Guided private travel to UK landmarks." },
  distilleries:   { type: "distillery" as const,  title: "Distilleries",        intro: "Whisky trail and distillery day tours." },
  guides:         { type: "guide" as const,       title: "Travel Guides",       intro: "Editorial travel guides across the UK." },
} satisfies Record<string, HubDef>;

export type HubKey = keyof typeof HUBS;

export function hubQueryOptions(key: HubKey) {
  const cfg = HUBS[key] as HubDef;
  if ("types" in cfg && cfg.types) {
    const types = cfg.types;
    return queryOptions({
      queryKey: ["destinations", "hub", key, types.join(",")],
      queryFn: () => listDestinationsByTypes({ data: { types, tiers: [1, 2, 3] } }),
    });
  }
  return queryOptions({
    queryKey: ["destinations", "hub", cfg.type],
    queryFn: () => listDestinationsByType({ data: { type: cfg.type, tiers: [1, 2, 3] } }),
  });
}

export function destinationQueryOptions(key: HubKey, slug: string) {
  const cfg = HUBS[key] as HubDef;
  // Try the primary type first; if not found we try alternate types (areas).
  const tryTypes: DestinationType[] = "types" in cfg && cfg.types ? cfg.types : [cfg.type];
  return queryOptions({
    queryKey: ["destination", key, slug],
    queryFn: async () => {
      let lastErr: unknown;
      for (const t of tryTypes) {
        try {
          return await loadDestination(t, slug);
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr;
    },
  });
}
