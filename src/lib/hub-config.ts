import { queryOptions } from "@tanstack/react-query";
import { loadDestination } from "@/components/site/DestinationPage";
import { listDestinationsByType } from "@/lib/destinations.functions";

export const HUBS = {
  areas:          { type: "location" as const,    title: "Areas We Cover",      intro: "Private travel across the United Kingdom." },
  stations:       { type: "station" as const,     title: "Train Stations",      intro: "Station transfers to every mainline UK rail hub." },
  "cruise-ports": { type: "cruise_port" as const, title: "Cruise Ports",        intro: "Direct transfers to UK cruise terminals." },
  universities:   { type: "university" as const,  title: "Universities",        intro: "Move-in, term travel and campus transfers." },
  hospitals:      { type: "hospital" as const,    title: "Hospitals",           intro: "Medical appointment transport, UK-wide." },
  corporate:      { type: "corporate" as const,   title: "Corporate Locations", intro: "Business travel for teams and offices." },
  attractions:    { type: "attraction" as const,  title: "Attractions",         intro: "Guided private travel to UK landmarks." },
  distilleries:   { type: "distillery" as const,  title: "Distilleries",        intro: "Whisky trail and distillery day tours." },
  guides:         { type: "guide" as const,       title: "Travel Guides",       intro: "Editorial travel guides across the UK." },
};

export type HubKey = keyof typeof HUBS;

export function hubQueryOptions(key: HubKey) {
  const cfg = HUBS[key];
  return queryOptions({
    queryKey: ["destinations", "hub", cfg.type],
    queryFn: () => listDestinationsByType({ data: { type: cfg.type, tiers: [1, 2] } }),
  });
}

export function destinationQueryOptions(key: HubKey, slug: string) {
  const cfg = HUBS[key];
  return queryOptions({
    queryKey: ["destination", cfg.type, slug],
    queryFn: () => loadDestination(cfg.type, slug),
  });
}

