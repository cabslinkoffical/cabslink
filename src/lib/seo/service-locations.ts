/**
 * Phase D — service + location combination pages.
 *
 * Rules enforced here:
 *  - A combination page only exists when we hold genuine LOCAL FACTS for that
 *    location (landmarks, airport drive times, real journeys). No facts, no
 *    page — the route 404s instead of publishing thin duplicate content.
 *  - LOCATION identity still belongs to the `destinations` table; the facts
 *    below are editorial colour keyed by the canonical destination slug, and
 *    every location links back to its canonical `/areas/:slug` page.
 *  - SERVICE identity comes from `service-registry.ts`; the canonical URL of a
 *    combination page is always `{service.localPattern}` with the destination
 *    slug substituted.
 */
import { getService, serviceLocationPath } from "@/lib/seo/service-registry";

export type LocationFacts = {
  slug: string;
  name: string;
  region: string;
  /** One-sentence, factual orientation used in the intro. */
  orientation: string;
  landmarks: string[];
  airports: { name: string; code: string; miles: number; mins: number }[];
  journeys: { to: string; note: string }[];
  /** Local pickup/practical detail unique to this town. */
  logistics: string[];
};

export const LOCATION_FACTS: Record<string, LocationFacts> = {
  edinburgh: {
    slug: "edinburgh",
    name: "Edinburgh",
    region: "Lothian",
    orientation:
      "Edinburgh's city centre is split between the Georgian New Town and the medieval Old Town, with most hotels within two miles of Waverley station.",
    landmarks: [
      "Edinburgh Waverley and Haymarket stations",
      "Edinburgh Castle and the Royal Mile",
      "EICC and Exchange business district",
      "Murrayfield Stadium",
      "Leith and Ocean Terminal",
    ],
    airports: [
      { name: "Edinburgh Airport", code: "EDI", miles: 8, mins: 30 },
      { name: "Glasgow Airport", code: "GLA", miles: 52, mins: 70 },
    ],
    journeys: [
      { to: "Edinburgh Airport", note: "Tram works and Gogar roundabout queues make a fixed pickup time essential at peak." },
      { to: "Glasgow city centre", note: "M8 door to door, typically 65–80 minutes depending on Charing Cross traffic." },
      { to: "St Andrews", note: "Forth Road crossing then the A91 — around 1h 40m for golf parties." },
    ],
    logistics: [
      "New Town streets are controlled-access in places, so we confirm an exact kerbside collection point.",
      "During the August festivals road closures around the Old Town shift pickups to Chambers Street or Johnston Terrace.",
      "Waverley pickups use the Market Street ramp rather than the taxi rank.",
    ],
  },
  glasgow: {
    slug: "glasgow",
    name: "Glasgow",
    region: "Greater Glasgow",
    orientation:
      "Glasgow is Scotland's largest city, with the commercial core between Central and Queen Street stations and the SEC/Hydro campus on the Clyde.",
    landmarks: [
      "Glasgow Central and Queen Street stations",
      "SEC, OVO Hydro and the Armadillo",
      "Merchant City hotels",
      "Hampden Park and Ibrox",
      "University of Glasgow, West End",
    ],
    airports: [
      { name: "Glasgow Airport", code: "GLA", miles: 9, mins: 25 },
      { name: "Glasgow Prestwick", code: "PIK", miles: 32, mins: 45 },
      { name: "Edinburgh Airport", code: "EDI", miles: 45, mins: 65 },
    ],
    journeys: [
      { to: "Glasgow Airport", note: "M8 westbound; we allow extra time between 07:00–09:00 for the Kingston Bridge." },
      { to: "Loch Lomond", note: "Around 45 minutes to Balloch, a common add-on after an airport arrival." },
      { to: "Edinburgh", note: "M8 eastbound, 65–85 minutes; popular as a same-day return for meetings." },
    ],
    logistics: [
      "Hydro and SEC event nights close Stobcross Road, so departures are staged from the Finnieston side.",
      "Central Station collections use Hope Street or Gordon Street depending on the platform.",
      "Low Emission Zone rules apply in the city centre — every vehicle we allocate is compliant.",
    ],
  },
  aberdeen: {
    slug: "aberdeen",
    name: "Aberdeen",
    region: "Aberdeen City",
    orientation:
      "Aberdeen combines a compact granite city centre with the Dyce energy corridor and the harbour, which drives most of its business travel.",
    landmarks: [
      "Aberdeen railway station and Union Square",
      "P&J Live arena",
      "Dyce and Bridge of Don business parks",
      "Aberdeen Harbour and South Harbour",
      "Royal Aberdeen and Trump International links",
    ],
    airports: [
      { name: "Aberdeen International", code: "ABZ", miles: 7, mins: 25 },
      { name: "Dundee Airport", code: "DND", miles: 66, mins: 90 },
    ],
    journeys: [
      { to: "Aberdeen Airport", note: "A96 via Dyce; heliport transfers are handled from the same terminal road." },
      { to: "Edinburgh", note: "Around 2h 40m via the A90 and the Queensferry Crossing." },
      { to: "Royal Deeside", note: "Ballater and Balmoral are roughly 70 minutes on the A93." },
    ],
    logistics: [
      "Offshore crew changes need early-hours pickups; we run 04:00 departures as standard.",
      "Union Street bus-gate restrictions mean hotel collections use Guild Street or Bon Accord Street.",
      "Harbour and heliport access requires driver ID, which we pre-register on request.",
    ],
  },
  dundee: {
    slug: "dundee",
    name: "Dundee",
    region: "Tayside",
    orientation:
      "Dundee's waterfront regeneration puts V&A Dundee, the station and the main hotels within a few hundred metres of each other.",
    landmarks: [
      "V&A Dundee and Discovery Point",
      "Dundee railway station",
      "University of Dundee and Abertay",
      "Ninewells Hospital",
      "Dundee Technology Park",
    ],
    airports: [
      { name: "Dundee Airport", code: "DND", miles: 2, mins: 10 },
      { name: "Edinburgh Airport", code: "EDI", miles: 58, mins: 75 },
      { name: "Aberdeen International", code: "ABZ", miles: 66, mins: 90 },
    ],
    journeys: [
      { to: "Edinburgh Airport", note: "M90 via the Queensferry Crossing; 75–95 minutes at commuter times." },
      { to: "St Andrews", note: "Tay Road Bridge then the A91, about 35 minutes." },
      { to: "Perth", note: "A90 westbound, roughly 25 minutes." },
    ],
    logistics: [
      "Ninewells Hospital pickups are arranged at a named entrance rather than the main concourse.",
      "Tay Road Bridge closures in high winds are monitored before southbound departures.",
      "Waterfront hotel ranks are short, so we confirm an arrival window with the driver.",
    ],
  },
  inverness: {
    slug: "inverness",
    name: "Inverness",
    region: "Highlands",
    orientation:
      "Inverness is the gateway to the Highlands, and most journeys start from the compact centre around the station and the River Ness.",
    landmarks: [
      "Inverness railway station and bus station",
      "Inverness Castle viewpoint",
      "Loch Ness and Urquhart Castle road",
      "Raigmore Hospital",
      "Inverness Campus and UHI",
    ],
    airports: [
      { name: "Inverness Airport", code: "INV", miles: 9, mins: 20 },
      { name: "Aberdeen International", code: "ABZ", miles: 105, mins: 150 },
    ],
    journeys: [
      { to: "Inverness Airport", note: "A96 east; 20 minutes outside the school run." },
      { to: "Fort William", note: "The A82 Loch Ness road, around 2 hours with photo stops available." },
      { to: "Skye Bridge", note: "Roughly 2h 20m via Invermoriston and Glen Shiel." },
    ],
    logistics: [
      "Single-track sections on Highland routes mean we quote realistic times, not map estimates.",
      "Winter journeys are planned around gritting routes and daylight hours.",
      "Cruise calls at Invergordon are 45 minutes north and need port-gate paperwork.",
    ],
  },
  stirling: {
    slug: "stirling",
    name: "Stirling",
    region: "Forth Valley",
    orientation:
      "Stirling sits at the centre of Scotland's motorway network, which makes it a practical base for travel in either direction.",
    landmarks: [
      "Stirling Castle and the Old Town",
      "Stirling railway station",
      "University of Stirling",
      "Wallace Monument",
      "Bannockburn visitor centre",
    ],
    airports: [
      { name: "Glasgow Airport", code: "GLA", miles: 30, mins: 40 },
      { name: "Edinburgh Airport", code: "EDI", miles: 36, mins: 45 },
    ],
    journeys: [
      { to: "Edinburgh Airport", note: "M9 south east, typically 45 minutes." },
      { to: "Glasgow Airport", note: "M80 then M8, around 40 minutes off-peak." },
      { to: "Loch Lomond", note: "Under an hour via the A811 for day trips." },
    ],
    logistics: [
      "Castle-area streets are narrow; larger vehicles collect from Corn Exchange Road.",
      "University term-start weekends need booked slots at the halls of residence.",
      "M9 roadworks are checked the night before early departures.",
    ],
  },
  perth: {
    slug: "perth",
    name: "Perth",
    region: "Tayside",
    orientation:
      "Perth is a compact city on the Tay with fast A9 and M90 links, used heavily for onward Highland travel.",
    landmarks: [
      "Perth railway station",
      "Perth Concert Hall",
      "Scone Palace",
      "Perth Royal Infirmary",
      "Gleneagles, 20 minutes south west",
    ],
    airports: [
      { name: "Edinburgh Airport", code: "EDI", miles: 42, mins: 55 },
      { name: "Dundee Airport", code: "DND", miles: 22, mins: 30 },
      { name: "Glasgow Airport", code: "GLA", miles: 60, mins: 75 },
    ],
    journeys: [
      { to: "Edinburgh Airport", note: "M90 south, 55–70 minutes with the Queensferry Crossing." },
      { to: "Gleneagles", note: "A9 then A823, about 20 minutes — a frequent golf and hospitality run." },
      { to: "Pitlochry", note: "35 minutes north on the A9." },
    ],
    logistics: [
      "A9 dual-carriageway sections north of Perth are single lane in places; timings reflect that.",
      "Gleneagles arrivals use the main gatehouse and are logged with the resort.",
      "City-centre one-way system means hotel pickups are set at a named door.",
    ],
  },
};

export type ServiceAngle = {
  serviceId: string;
  eyebrow: string;
  /** Built with the location name. */
  h1: (name: string) => string;
  subtitle: (name: string) => string;
  metaTitle: (name: string) => string;
  metaDescription: (name: string) => string;
  intro: (name: string) => string;
  included: string[];
  faqs: (name: string) => { q: string; a: string }[];
  related: string[];
};

const SERVICE_ANGLES: Record<string, ServiceAngle> = {
  "airport-transfers": {
    serviceId: "airport-transfers",
    eyebrow: "Airport transfers",
    h1: (n) => `Airport transfers in ${n}.`,
    subtitle: (n) =>
      `Pre-booked airport travel to and from ${n} with flight tracking, a fixed price and a driver who waits if you're delayed.`,
    metaTitle: (n) => `${n} Airport Transfers — Fixed Price Taxis | Cabslink`,
    metaDescription: (n) =>
      `Pre-booked airport transfers in ${n}. Fixed fares, flight tracking, meet and greet and 24/7 booking for every ${n} pickup or drop-off.`,
    intro: (n) =>
      `Every ${n} airport journey is arranged in advance: we take your flight number, watch the arrival time and set the pickup so the car is there when you clear the terminal — not before you land and not an hour later.`,
    included: [
      "Flight tracking with automatic pickup adjustment",
      "Fixed fare confirmed before you travel",
      "Free waiting time after landing",
      "Meet and greet in arrivals on request",
      "Luggage-appropriate vehicle class",
      "24/7 booking and driver contact",
    ],
    faqs: (n) => [
      { q: `How early should my ${n} pickup be for a flight?`, a: `We work back from your departure time using the live drive time, then add a check-in buffer — typically three hours for long haul and two for domestic, adjusted for the ${n} traffic pattern that morning.` },
      { q: "What happens if my flight is delayed?", a: "Your arrival is tracked, so the pickup slides with the flight. There is no charge for the delay itself." },
      { q: "Can the driver meet me inside the terminal?", a: "Yes — add meet and greet and your driver waits in arrivals with a name board and helps with luggage." },
    ],
    related: ["executive-transfers", "corporate-travel", "private-hire"],
  },
  "executive-transfers": {
    serviceId: "executive-transfers",
    eyebrow: "Executive travel",
    h1: (n) => `Executive transfers in ${n}.`,
    subtitle: (n) =>
      `Premium saloons and MPVs with a professional driver for meetings, client collections and airport runs across ${n}.`,
    metaTitle: (n) => `Executive Transfers ${n} — Premium Cars & Drivers | Cabslink`,
    metaDescription: (n) =>
      `Executive car transfers in ${n}. Mercedes-class vehicles, professional drivers, flight tracking and account billing for business travel.`,
    intro: (n) =>
      `Executive travel in ${n} is about arriving composed: a newer vehicle, a driver briefed on your schedule and a route planned around the day's congestion rather than a generic estimate.`,
    included: [
      "Mercedes-class saloon, estate or V-Class",
      "Suited, experienced driver",
      "Route planned around your meeting schedule",
      "Bottled water and phone charging",
      "Flight and train tracking",
      "Account billing with cost centres",
    ],
    faqs: (n) => [
      { q: `Can a driver stay with me across a day of ${n} meetings?`, a: `Yes. Day hire keeps the same vehicle and driver on hand between appointments, which works well when ${n} parking near your venues is limited.` },
      { q: "Which vehicles are used for executive bookings?", a: "Mercedes-Benz E-Class and S-Class saloons plus V-Class MPVs for groups of up to six with luggage." },
      { q: "Do you invoice businesses?", a: "Yes — corporate accounts are billed monthly with reference fields for each journey." },
    ],
    related: ["corporate-travel", "airport-transfers", "vip-transfers"],
  },
  "private-hire": {
    serviceId: "private-hire",
    eyebrow: "Private hire",
    h1: (n) => `Private hire cars in ${n}.`,
    subtitle: (n) =>
      `Licensed, pre-booked private hire in ${n} — fixed fares, no meters and the right vehicle class for your group and luggage.`,
    metaTitle: (n) => `Private Hire ${n} — Pre-Booked Licensed Cars | Cabslink`,
    metaDescription: (n) =>
      `Licensed private hire in ${n}. Pre-booked journeys with fixed fares, professional drivers and vehicles sized for your group and bags.`,
    intro: (n) =>
      `Private hire in ${n} is booked ahead rather than hailed, which is exactly why the price is fixed: we know the route, the vehicle and the time before your driver sets off.`,
    included: [
      "Fixed fare agreed at booking",
      "Licensed private hire driver and vehicle",
      "Door-to-door collection at a named entrance",
      "Child seats on request",
      "Card, cash-free or account payment",
      "Return legs held at the same class",
    ],
    faqs: (n) => [
      { q: `Can I book a ${n} private hire car for the same day?`, a: `Usually yes, subject to availability. For early-morning and larger vehicles in ${n} we recommend booking at least 24 hours ahead.` },
      { q: "Is the fare metered?", a: "No. Private hire journeys are quoted as a fixed fare before you confirm, based on distance, time of day and vehicle class." },
      { q: "Can you add stops along the way?", a: "Yes — extra stops are added at booking and priced transparently in the quote." },
    ],
    related: ["airport-transfers", "long-distance-transfers", "executive-transfers"],
  },
  "corporate-travel": {
    serviceId: "corporate-travel",
    eyebrow: "Corporate travel",
    h1: (n) => `Corporate travel accounts in ${n}.`,
    subtitle: (n) =>
      `Billed business travel for ${n} employers — one account, consistent standards and reporting your finance team can reconcile.`,
    metaTitle: (n) => `Corporate Travel ${n} — Business Accounts | Cabslink`,
    metaDescription: (n) =>
      `Corporate travel accounts for ${n} businesses. Monthly invoicing, cost-centre reporting, managed bookings and vetted drivers.`,
    intro: (n) =>
      `A corporate account replaces staff expense claims in ${n} with a single monthly invoice: bookings are placed by whoever needs them, coded to a cost centre and reported back in one statement.`,
    included: [
      "Monthly consolidated invoicing",
      "Cost centre and reference coding",
      "Named account manager",
      "Priority allocation at peak times",
      "Duty-of-care journey records",
      "Vetted drivers and compliant vehicles",
    ],
    faqs: (n) => [
      { q: `How do we open an account for our ${n} office?`, a: `Send us your billing details and expected monthly volume through the corporate booking form; most ${n} accounts are live within two working days.` },
      { q: "Can several people book on the same account?", a: "Yes — you nominate bookers and each booking carries their reference so the invoice reconciles cleanly." },
      { q: "Do you cover travel outside Scotland?", a: "Yes. Accounts cover UK-wide long-distance journeys as well as local and airport travel." },
    ],
    related: ["executive-transfers", "airport-transfers", "group-transfers"],
  },
};

/**
 * Bespoke, genuinely local paragraph per combination. A combination without an
 * entry here is NOT published — this is the facts gate.
 */
const COMBO_NOTES: Record<string, string> = {
  "airport-transfers:edinburgh":
    "Edinburgh Airport is only eight miles from the city centre, but the Gogar approach and tram-line junctions make the last mile unpredictable. We build that into the pickup time rather than the fare, and for festival-season departures we shift Old Town collections to Chambers Street or Johnston Terrace where the road closures allow.",
  "airport-transfers:glasgow":
    "Glasgow Airport sits nine miles west on the M8, and the Kingston Bridge decides whether that is twenty minutes or fifty. Weekday pickups before 09:00 leave earlier by default, and Prestwick departures are quoted separately because the 32-mile run down the A77 behaves nothing like the M8.",
  "airport-transfers:aberdeen":
    "Most Aberdeen airport work is energy-sector: 04:00 crew changes to Dyce, heliport transfers on the same terminal road, and returns that land late after a delay offshore. Union Street bus gates mean hotel collections are set at Guild Street or Bon Accord Street rather than the front door.",
  "airport-transfers:inverness":
    "Inverness Airport is a twenty-minute run east on the A96, but the journeys either side of it are the Highland part: Skye, Fort William and Loch Ness road times are set by single-track sections and daylight, not by map estimates, so we quote realistic durations for onward legs.",
  "executive-transfers:edinburgh":
    "Executive work in Edinburgh clusters around the Exchange district and the EICC, where kerbside space is tight and controlled-access streets are common. We confirm a named collection door for each address and plan client collections around Lothian Road congestion at the end of the working day.",
  "executive-transfers:glasgow":
    "Glasgow's Low Emission Zone covers the commercial core, so every executive vehicle we allocate is compliant as standard. Hydro and SEC event nights close Stobcross Road, and we stage departures from the Finnieston side so a 22:00 finish does not become an hour in gridlock.",
  "executive-transfers:aberdeen":
    "Aberdeen executive travel runs on the harbour and Dyce corridors, both of which need driver ID pre-registered for site access. We hold that paperwork on the account so a car can go straight to a gate rather than waiting at a barrier with your client inside.",
  "executive-transfers:dundee":
    "Dundee's waterfront puts V&A Dundee, the station and the main hotels within a few hundred metres, which makes short-notice client collections realistic. Southbound departures are checked against Tay Road Bridge wind restrictions before the driver is dispatched.",
  "private-hire:edinburgh":
    "Edinburgh private hire is dominated by short high-value hops: New Town hotels to Waverley, Haymarket to Murrayfield on match days, Leith to the airport. Waverley collections use the Market Street ramp rather than the taxi rank, which is faster with luggage.",
  "private-hire:glasgow":
    "Glasgow private hire covers everything the LEZ complicates: Merchant City hotels, West End university addresses and Hampden or Ibrox on fixture days. Central Station pickups are set at Hope Street or Gordon Street depending on which platform you arrive at.",
  "private-hire:stirling":
    "Stirling is within 45 minutes of both Glasgow and Edinburgh airports, so a lot of local private hire is really onward travel. Old Town streets around the castle are narrow, so anything larger than a saloon collects from Corn Exchange Road.",
  "private-hire:perth":
    "Perth's one-way system means we set a named door for every hotel pickup rather than a street. Gleneagles is twenty minutes away on the A9 and A823, and arrivals there are logged with the resort gatehouse before the car sets off.",
  "corporate-travel:edinburgh":
    "Edinburgh corporate accounts are typically finance, legal and public-sector offices in the Exchange district and around St Andrew Square, with recurring airport runs and cross-city meeting blocks. Journeys are coded per cost centre so a single invoice reconciles against departments.",
  "corporate-travel:glasgow":
    "Glasgow corporate accounts mix city-centre offices with the SEC conference calendar and Clyde-side campuses. Event weeks push demand hard, so accounts get priority allocation before general bookings when the Hydro has a full house.",
  "corporate-travel:aberdeen":
    "Aberdeen accounts are built for shift patterns: pre-dawn crew changes, heliport runs and late returns from offshore rotations. Duty-of-care records for each journey are available on request, which matters for energy-sector compliance reporting.",
  "corporate-travel:dundee":
    "Dundee accounts serve the universities, Ninewells and the Technology Park, where visiting staff and researchers need repeat journeys booked by an administrator rather than each traveller. Hospital collections are arranged at a named entrance to avoid the main concourse.",
};

export type ServiceLocationContent = {
  key: string;
  serviceId: string;
  serviceName: string;
  serviceUrl: string;
  eyebrow: string;
  h1: string;
  subtitle: string;
  metaTitle: string;
  metaDescription: string;
  canonicalPath: string;
  location: LocationFacts;
  intro: string;
  localNote: string;
  included: string[];
  faqs: { q: string; a: string }[];
  related: string[];
  /** Sibling combination pages for the same location. */
  siblings: { label: string; to: string }[];
};

export function serviceLocationKey(serviceId: string, locationSlug: string): string {
  return `${serviceId}:${locationSlug}`;
}

/** Every published combination, in a stable order. */
export function publishedCombinations(): { serviceId: string; locationSlug: string; path: string }[] {
  return Object.keys(COMBO_NOTES)
    .map((key) => {
      const [serviceId, locationSlug] = key.split(":") as [string, string];
      const path = serviceLocationPath(serviceId, locationSlug);
      return path ? { serviceId, locationSlug, path } : null;
    })
    .filter((v): v is { serviceId: string; locationSlug: string; path: string } => Boolean(v));
}

/** Published local child paths for one service (used for internal linking). */
export function localPagesForService(serviceId: string): { label: string; to: string }[] {
  return publishedCombinations()
    .filter((c) => c.serviceId === serviceId)
    .map((c) => ({ label: LOCATION_FACTS[c.locationSlug]!.name, to: c.path }));
}

/** Published combination pages for one location (used for internal linking). */
export function servicePagesForLocation(locationSlug: string): { label: string; to: string }[] {
  return publishedCombinations()
    .filter((c) => c.locationSlug === locationSlug)
    .map((c) => ({ label: getService(c.serviceId)?.name ?? c.serviceId, to: c.path }));
}

/**
 * Build the full content payload for a combination page, or null when the
 * combination is not published (no local facts / no service / no pattern).
 */
export function buildServiceLocation(
  serviceId: string,
  locationSlug: string,
): ServiceLocationContent | null {
  const key = serviceLocationKey(serviceId, locationSlug);
  const localNote = COMBO_NOTES[key];
  const angle = SERVICE_ANGLES[serviceId];
  const location = LOCATION_FACTS[locationSlug];
  const service = getService(serviceId);
  const canonicalPath = serviceLocationPath(serviceId, locationSlug);
  if (!localNote || !angle || !location || !service || !canonicalPath) return null;

  return {
    key,
    serviceId,
    serviceName: service.name,
    serviceUrl: service.url,
    eyebrow: angle.eyebrow,
    h1: angle.h1(location.name),
    subtitle: angle.subtitle(location.name),
    metaTitle: angle.metaTitle(location.name),
    metaDescription: angle.metaDescription(location.name),
    canonicalPath,
    location,
    intro: angle.intro(location.name),
    localNote,
    included: angle.included,
    faqs: angle.faqs(location.name),
    related: angle.related,
    siblings: servicePagesForLocation(locationSlug).filter((s) => s.to !== canonicalPath),
  };
}
