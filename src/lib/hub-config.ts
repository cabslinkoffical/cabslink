import { queryOptions } from "@tanstack/react-query";
import { loadDestination } from "@/components/site/DestinationPage";
import {
  listDestinationsByType,
  listDestinationsByTypes,
  type DestinationType,
} from "@/lib/destinations.functions";

type HubExtras = {
  /** Search-result description (aim 120-160 chars). Falls back to `intro`. */
  metaDescription?: string;
  /** Two or three sentences of genuine context, rendered under the intro. */
  longIntro?: string;
  /** Short factual "what to expect" points, rendered as a list. */
  notes?: { title: string; body: string }[];
};

type HubDef = HubExtras &
  (
    | { type: DestinationType; types?: never; title: string; intro: string }
    | { types: DestinationType[]; type: DestinationType; title: string; intro: string }
  );

const PICKUP_NOTE = {
  title: "Pick-up that is agreed in advance",
  body: "You tell us the door, entrance or bay when you book, and the driver confirms it by message before setting off — no hunting for a car in a queue.",
};
const PRICE_NOTE = {
  title: "One price, quoted before you commit",
  body: "The fare you see covers the vehicle, the driver and the route. Waiting time and extras are listed separately so there is nothing to settle at the end of the journey.",
};

export const HUBS = {
  // Areas spans the geographic destination types so seeded cities/towns show up.
  areas: {
    type: "city" as const,
    types: ["location", "city", "town", "village"] as DestinationType[],
    title: "Areas We Cover",
    metaDescription: "Private car travel across the UK. Browse the towns and cities we cover for airport runs, station transfers, day trips and corporate account travel.",
    intro: "Private travel across the United Kingdom.",
    longIntro:
      "Each area page below covers the journeys we run most often from that town or city: airport runs, station transfers, day trips and account travel. Pages list typical routes, driving times and the vehicle classes that fit the roads and parking in that area.",
    notes: [PRICE_NOTE, PICKUP_NOTE],
  },
  stations: {
    type: "station" as const,
    title: "Train Stations",
    metaDescription: "Private transfers to UK mainline stations. Pre-booked pick-up points, train-delay tracking and fixed pricing for onward journeys with luggage.",
    intro: "Station transfers to every mainline UK rail hub.",
    longIntro:
      "Rail stations are the hardest places to arrange a car: taxi ranks move, drop-off bays are timed, and platforms change late. Every station page below records where our drivers wait, how long the run takes from the surrounding area, and what happens when a train is delayed or cancelled.",
    notes: [
      {
        title: "We track the train, not the clock",
        body: "Give us your service and we watch it. If the train runs late the driver waits; if it is cancelled we move the booking to the next realistic arrival.",
      },
      PICKUP_NOTE,
      {
        title: "Luggage and connections",
        body: "Tell us the case and bike or ski count when booking so we send a vehicle with the boot space you actually need for the onward leg.",
      },
    ],
  },
  "cruise-ports": {
    type: "cruise_port" as const,
    title: "Cruise Ports",
    metaDescription: "Private transfers to UK cruise terminals. Timed to your boarding window, sized for cruise luggage and quoted at a fixed price before you travel.",
    intro: "Direct transfers to UK cruise terminals.",
    longIntro:
      "Cruise travel runs to a fixed boarding window, and most UK terminals sit well outside the nearest city. The port pages below cover the drive from the main airports and city centres, the terminal each line uses, and how far in advance we recommend leaving on embarkation day.",
    notes: [
      {
        title: "Timed to the boarding window",
        body: "We work backwards from your check-in slot and build in road-traffic margin, rather than quoting a bare driving time.",
      },
      {
        title: "Luggage-first vehicle choice",
        body: "Cruise luggage is bulky. We size the vehicle around the number of large cases per passenger, not just the seat count.",
      },
      PRICE_NOTE,
    ],
  },
  universities: {
    type: "university" as const,
    title: "Universities",
    metaDescription: "Private transfers for UK universities: move-in and move-out loads, airport and station runs, and bookings a parent or department can pay for.",
    intro: "Move-in, term travel and campus transfers.",
    longIntro:
      "Term-start weekends, reading weeks and end-of-year move-outs all mean travelling with far more luggage than a normal transfer. Each university page below covers the campus and halls we drive to, the airport and station runs students use most, and how parents can pay for a journey they are not travelling on.",
    notes: [
      {
        title: "Move-in and move-out loads",
        body: "Boxes, bedding and a term's worth of luggage need an estate or van-class vehicle. Tell us the load and we send the right one.",
      },
      {
        title: "Someone else can book and pay",
        body: "A parent or department can book, pay and receive the confirmation while the student travels — the driver only needs the passenger's name and phone number.",
      },
      PICKUP_NOTE,
    ],
  },
  hospitals: {
    type: "hospital" as const,
    title: "Hospitals",
    metaDescription: "Private transport to UK hospitals for appointments and discharges. Accessible vehicles, drivers who wait and open-time return journeys.",
    intro: "Medical appointment transport, UK-wide.",
    longIntro:
      "Appointment travel has different priorities from a normal transfer: arriving with time to spare, a driver who waits, and a car that is easy to get in and out of. The hospital pages below cover the site entrances we use, the drive from the surrounding towns, and how return journeys work when a discharge time is not known in advance.",
    notes: [
      {
        title: "Return journeys with an open time",
        body: "For discharges and follow-ups you can book the outbound leg and call us for the return, so an over-running appointment does not cost you the fare.",
      },
      {
        title: "Access and assistance",
        body: "Tell us about walking aids, wheelchairs or a travelling companion when booking so we allocate a vehicle with easy step-in height and space.",
      },
      PRICE_NOTE,
    ],
  },
  corporate: {
    type: "corporate" as const,
    // Business parks live under the same /corporate/:slug hub, so both types
    // must resolve or their pages 404 while still being linked internally.
    types: ["corporate", "business_park"] as DestinationType[],

    title: "Corporate Locations",
    metaDescription: "Business travel to UK offices, campuses and business parks. Agreed pick-up points, airport runs and monthly invoicing on a corporate account.",
    intro: "Business travel for teams and offices.",
    longIntro:
      "Business parks, campuses and financial districts each have their own access rules, barriers and visitor bays. The location pages below cover where drivers can legitimately pick up, the airport runs that feed each site, and how account travel is billed for teams booking repeatedly.",
    notes: [
      {
        title: "Account billing, not card entry",
        body: "Corporate accounts book without paying per trip: journeys are consolidated onto one monthly invoice with cost-centre and PO references.",
      },
      {
        title: "Repeat and multi-passenger travel",
        body: "Recurring commutes, client collections and multi-car movements for the same meeting can all be arranged on one reference.",
      },
      PICKUP_NOTE,
    ],
  },
  attractions: {
    type: "attraction" as const,
    title: "Attractions",
    metaDescription: "Private driver travel to UK landmarks and attractions. Your car waits while you visit, and stops can be combined into one full private day out.",
    intro: "Guided private travel to UK landmarks.",
    longIntro:
      "Visiting landmarks by private car is mostly about parking, timing and how long you actually want on site. Each attraction page below covers the drive from the nearest cities, the drop-off point, and whether it works better as a single stop or part of a longer day with the driver waiting.",
    notes: [
      {
        title: "The driver waits while you visit",
        body: "On day itineraries the car stays with you: you leave bags and coats on board and set the pace at each stop rather than rushing a return time.",
      },
      {
        title: "Combine stops into one day",
        body: "Most of these sites sit within an hour of each other, so two or three can be built into a single private day out.",
      },
      PRICE_NOTE,
    ],
  },
  distilleries: {
    type: "distillery" as const,
    title: "Distilleries",
    metaDescription: "Private distillery day tours with a driver, so every passenger can taste. Realistic itineraries of two to three distilleries with tour timings.",
    intro: "Whisky trail and distillery day tours.",
    longIntro:
      "The point of a private driver on a distillery day is simple: everyone in the group can taste. The pages below cover the distilleries we drive to, the realistic number of visits in a day given the roads between them, and how tour and tasting timings shape the route.",
    notes: [
      {
        title: "Nobody has to stay sober",
        body: "Your driver covers the whole day, so every passenger can take part in tastings and tours.",
      },
      {
        title: "Two to three distilleries is a full day",
        body: "Tours run 60–90 minutes and the roads between sites are slow. We plan a realistic day rather than an over-packed one.",
      },
      PICKUP_NOTE,
    ],
  },
  guides: {
    type: "guide" as const,
    title: "Travel Guides",
    metaDescription: "Travel guides written around journeys we actually drive: real route timings, when roads and airports are busiest, and stops worth making.",
    intro: "Editorial travel guides across the UK.",
    longIntro:
      "These guides are written around journeys we actually drive: how long routes really take, when roads and airports are busiest, and what is worth stopping for on the way. They are reference reading rather than booking pages — every guide links through to the relevant transfer or tour.",
    notes: [
      {
        title: "Written from the road",
        body: "Timings and route notes come from journeys our drivers run regularly, not from generic mapping estimates.",
      },
      PRICE_NOTE,
    ],
  },
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
