/**
 * Phase E — journey (route) pages: /routes and /routes/:slug.
 *
 * Rules enforced here:
 *  - A journey page only exists when we hold genuine facts for it (real road
 *    distance, realistic door-to-door duration, named road corridor and local
 *    notes). No facts, no page — the route 404s rather than publishing thin
 *    "A to B taxi" content.
 *  - LOCATION identity still belongs to the `destinations` table. Where an end
 *    of a journey maps to a canonical page we store that path here
 *    (`/areas/:slug` or `/airports/:iata`) so every journey links back to it.
 *  - SERVICE identity comes from `service-registry.ts` via `serviceIds`.
 */
import { getService } from "@/lib/seo/service-registry";

export type JourneyCategory =
  | "airport"
  | "city-to-city"
  | "long-distance"
  | "golf"
  | "tour";

export const JOURNEY_CATEGORIES: { id: JourneyCategory; label: string; blurb: string }[] = [
  { id: "airport", label: "Airport journeys", blurb: "Terminal-to-door runs with flight tracking and meet & greet." },
  { id: "city-to-city", label: "City to city", blurb: "Fixed-price transfers between Scotland's main cities." },
  { id: "long-distance", label: "Long distance", blurb: "Multi-hour journeys priced door to door with comfort stops." },
  { id: "golf", label: "Golf journeys", blurb: "Courses, clubs and tee times planned around the drive." },
  { id: "tour", label: "Scenic journeys", blurb: "Highland and Loch routes where the drive is part of the trip." },
];

export type JourneyEnd = {
  name: string;
  /** Canonical CabsLink page for this end, when one exists. */
  path?: string;
};

export type JourneyRecord = {
  slug: string;
  /**
   * Awaiting sign-off: the page renders so it can be reviewed, but it is kept
   * out of the sitemap and the /routes index until the flag is removed.
   */
  review?: boolean;

  category: JourneyCategory;
  from: JourneyEnd;
  to: JourneyEnd;
  /** Real road distance in miles. */
  miles: number;
  /** Realistic door-to-door driving time in minutes, off-peak. */
  mins: number;
  /** Named road corridor. */
  via: string;
  /** Unique factual paragraph — this is the facts gate. */
  note: string;
  /** Practical planning points specific to this journey. */
  planning: string[];
  /** Optional comfort/interest stops along the corridor. */
  stops: string[];
  /** Services from the registry that fit this journey. */
  serviceIds: string[];
  faqs: { q: string; a: string }[];
};

export const JOURNEYS: JourneyRecord[] = [
  {
    slug: "edinburgh-to-glasgow",
    category: "city-to-city",
    from: { name: "Edinburgh", path: "/areas/edinburgh" },
    to: { name: "Glasgow", path: "/areas/glasgow" },
    miles: 47,
    mins: 70,
    via: "M8 westbound",
    note:
      "The M8 covers the 47 miles between the two city centres, and the variable part is always the last four: Charing Cross and the Kingston Bridge approach decide whether the run is 65 minutes or 95. We set the pickup time from your meeting time rather than from a map estimate, and Glasgow's Low Emission Zone means every vehicle allocated for a city-centre drop is compliant as standard.",
    planning: [
      "Allow 90 minutes for a weekday arrival before 09:30 in central Glasgow.",
      "Edinburgh collections in the Exchange district use a named door, as several streets are controlled access.",
      "Same-day returns are quoted as two fixed legs, so a late finish does not change the price.",
    ],
    stops: ["Livingston", "Harthill services", "Eurocentral"],
    serviceIds: ["executive-transfers", "corporate-travel", "private-hire"],
    faqs: [
      { q: "How long does Edinburgh to Glasgow take by car?", a: "Around 70 minutes door to door off-peak on the M8, and 85–95 minutes during weekday rush hours." },
      { q: "Is the price fixed?", a: "Yes. The fare is agreed before you confirm and does not change with traffic on the day." },
      { q: "Can the driver wait for a return leg?", a: "Yes — either as a waiting-time booking or as a second fixed leg, whichever costs less for your schedule." },
    ],
  },
  {
    slug: "glasgow-to-edinburgh",
    category: "city-to-city",
    from: { name: "Glasgow", path: "/areas/glasgow" },
    to: { name: "Edinburgh", path: "/areas/edinburgh" },
    miles: 47,
    mins: 75,
    via: "M8 eastbound",
    note:
      "Eastbound the difficulty is at the start rather than the end: getting out of Glasgow through the Kingston Bridge and Charing Cross corridor is the slow section, after which the M8 runs freely to Newbridge. Edinburgh drops in the Old Town are affected by the August festival closures, when we use Chambers Street or Johnston Terrace instead of the door.",
    planning: [
      "Leaving central Glasgow between 16:00 and 18:00 adds around 20 minutes.",
      "Festival-season Old Town drops are confirmed to an accessible street, not a closed one.",
      "Onward Edinburgh Airport legs are quoted separately as they leave the M8 earlier at Newbridge.",
    ],
    stops: ["Eurocentral", "Harthill services", "Livingston"],
    serviceIds: ["executive-transfers", "corporate-travel", "airport-transfers"],
    faqs: [
      { q: "How far is Glasgow to Edinburgh?", a: "47 miles by road on the M8, typically 75 minutes door to door." },
      { q: "Can you collect from Glasgow Central?", a: "Yes — pickups are set at Hope Street or Gordon Street depending on your arrival platform." },
      { q: "Do you cover late-night departures?", a: "Yes, 24/7. Late departures after Hydro or SEC events are staged from the Finnieston side." },
    ],
  },
  {
    slug: "edinburgh-airport-to-st-andrews",
    category: "golf",
    from: { name: "Edinburgh Airport", path: "/airports/edinburgh-airport" },
    to: { name: "St Andrews" },
    miles: 48,
    mins: 80,
    via: "M90 and A91 over the Queensferry Crossing",
    note:
      "The run north from Edinburgh Airport crosses the Queensferry Crossing then follows the M90 and A91 into Fife, which is a genuine 80 minutes with golf luggage rather than the hour a map suggests. Bags and clubs drive the vehicle class here: four golfers with four full bags need an estate or MPV, not a saloon, and we allocate on that basis at booking.",
    planning: [
      "Meet & greet inside the terminal is standard, with an hour of free wait time on international arrivals.",
      "Clubs are loaded into a vehicle sized for bags plus cases — confirm bag count when booking.",
      "Tee-time departures back to the airport are booked as a fixed return leg, tracked against your flight.",
    ],
    stops: ["Queensferry Crossing viewpoint", "Kinross", "Cupar"],
    serviceIds: ["golf-transfers", "airport-transfers", "long-distance-transfers"],
    faqs: [
      { q: "How long is Edinburgh Airport to St Andrews?", a: "About 80 minutes for 48 miles via the Queensferry Crossing, M90 and A91." },
      { q: "Will golf clubs fit?", a: "Yes, when the bag count is confirmed at booking. Four players with clubs and cases are allocated an estate, MPV or minibus." },
      { q: "Do you wait if my flight is late?", a: "Yes. Arrivals are tracked and the first hour of waiting on international flights is included." },
    ],
  },
  {
    slug: "glasgow-airport-to-loch-lomond",
    category: "airport",
    from: { name: "Glasgow Airport", path: "/airports/glasgow-airport" },
    to: { name: "Loch Lomond" },
    miles: 20,
    mins: 35,
    via: "A82 through Dumbarton",
    note:
      "Balloch is only 20 miles from the terminal on the A82, which makes it one of the few Highland-edge arrivals you can do straight off a long-haul flight. Hotel drops around Loch Lomond are often down private single-track approaches, so we confirm the exact lodge or gatehouse rather than the resort name to avoid a late-night detour.",
    planning: [
      "Allow 45 minutes on summer weekend afternoons when the A82 is busy with day traffic.",
      "Lodge and estate drops are confirmed by gatehouse name and postcode before dispatch.",
      "Onward legs to Oban or Fort William are quoted from the same corridor.",
    ],
    stops: ["Dumbarton", "Balloch", "Luss"],
    serviceIds: ["airport-transfers", "tours", "group-transfers"],
    faqs: [
      { q: "How far is Glasgow Airport from Loch Lomond?", a: "Around 20 miles to Balloch, typically 35 minutes on the A82." },
      { q: "Can we stop for photographs?", a: "Yes — Luss and the Duck Bay viewpoint are common short stops and can be added at booking." },
      { q: "Do you carry large luggage for a week's stay?", a: "Yes. Party size plus case count decides the vehicle class, so state both when booking." },
    ],
  },
  {
    slug: "edinburgh-to-inverness",
    category: "long-distance",
    from: { name: "Edinburgh", path: "/areas/edinburgh" },
    to: { name: "Inverness", path: "/areas/inverness" },
    miles: 157,
    mins: 195,
    via: "M90 and A9 north",
    note:
      "This is a genuine three-and-a-quarter-hour drive, and the A9 north of Perth is the reason: average-speed cameras run for long stretches and the dual-carriageway sections alternate with single carriageway all the way past Drumochter. In winter we plan the Drumochter and Slochd summits into the timing and check conditions before dispatch rather than on the road.",
    planning: [
      "One comfort stop is built into the journey, usually House of Bruar or Ralia.",
      "Winter departures are reviewed against A9 conditions the evening before.",
      "Flights out of Inverness are given a 45-minute buffer above the drive time.",
    ],
    stops: ["Perth", "House of Bruar", "Aviemore"],
    serviceIds: ["long-distance-transfers", "executive-transfers", "tours"],
    faqs: [
      { q: "How long does Edinburgh to Inverness take?", a: "Around 3 hours 15 minutes for 157 miles via the M90 and A9, plus a comfort stop." },
      { q: "Is a one-way long-distance transfer cheaper than a return?", a: "One-way is quoted on its own and does not assume a return, so you only pay for the legs you book." },
      { q: "Can we break the journey?", a: "Yes. Aviemore, Pitlochry and Blair Atholl are common breaks and are priced transparently as stops." },
    ],
  },
  {
    slug: "glasgow-to-edinburgh-airport",
    category: "airport",
    from: { name: "Glasgow", path: "/areas/glasgow" },
    to: { name: "Edinburgh Airport", path: "/airports/edinburgh-airport" },
    miles: 55,
    mins: 75,
    via: "M8 eastbound to Newbridge",
    note:
      "Plenty of Glasgow passengers fly from Edinburgh because of route choice, and the journey leaves the M8 at Newbridge rather than continuing into the city — 55 miles and about 75 minutes. Early departures matter most here: a 06:00 check-in means a 04:15 collection, which is exactly the slot where pre-booking beats hailing.",
    planning: [
      "For check-in before 07:00 we collect at least three hours ahead to absorb any M8 incident.",
      "Terminal drop is at departures level with luggage assistance included.",
      "Return arrivals are flight-tracked, with waiting time from touchdown not from the booked time.",
    ],
    stops: ["Harthill services", "Livingston", "Newbridge"],
    serviceIds: ["airport-transfers", "executive-transfers", "corporate-travel"],
    faqs: [
      { q: "How long from Glasgow to Edinburgh Airport?", a: "About 75 minutes for 55 miles, leaving the M8 at Newbridge." },
      { q: "What time should I be collected for a 06:00 flight?", a: "Around 03:45–04:15 depending on your Glasgow address and whether you have bags to check." },
      { q: "Is meet & greet available on the return?", a: "Yes — your driver meets you in arrivals with a name board as standard." },
    ],
  },
  {
    slug: "aberdeen-to-inverness",
    category: "long-distance",
    from: { name: "Aberdeen", path: "/areas/aberdeen" },
    to: { name: "Inverness", path: "/areas/inverness" },
    miles: 104,
    mins: 150,
    via: "A96 through Huntly and Elgin",
    note:
      "The A96 is single carriageway for most of its 104 miles and runs through Inverurie, Huntly, Keith, Fochabers, Elgin, Forres and Nairn, each with its own limits and lights. That is why this is a two-and-a-half-hour journey rather than a two-hour one, and why energy-sector clients book it rather than risk a connection.",
    planning: [
      "Farm and HGV traffic between Huntly and Keith slows the middle third — the quoted time already allows for it.",
      "Speyside distillery stops fit naturally near Fochabers and Craigellachie.",
      "Dyce and heliport collections at either end can be added to the same booking.",
    ],
    stops: ["Inverurie", "Huntly", "Elgin", "Nairn"],
    serviceIds: ["long-distance-transfers", "corporate-travel", "tours"],
    faqs: [
      { q: "How long is Aberdeen to Inverness by road?", a: "Around 2 hours 30 minutes for 104 miles on the A96." },
      { q: "Can we visit a distillery on the way?", a: "Yes. Speyside sits on this corridor and stops are added at booking with time allowed for each visit." },
      { q: "Do you cover early crew changes?", a: "Yes. Pre-dawn Aberdeen collections including Dyce and the heliport are routine on account bookings." },
    ],
  },
  {
    slug: "edinburgh-airport-to-gleneagles",
    category: "golf",
    from: { name: "Edinburgh Airport", path: "/airports/edinburgh-airport" },
    to: { name: "Gleneagles" },
    miles: 40,
    mins: 55,
    via: "M9, A9 and A823",
    note:
      "Gleneagles is 40 miles from the terminal via the M9 and A9, then the A823 into Auchterarder — about 55 minutes with clubs loaded. Arrivals are logged with the resort gatehouse before the car sets off, so a late flight does not turn into a wait at the barrier with your luggage in the boot.",
    planning: [
      "Golf bags plus cases are allocated an estate, MPV or minibus rather than a saloon.",
      "The resort is notified of the vehicle and expected arrival window in advance.",
      "Onward legs to St Andrews or Carnoustie are quoted from the same itinerary.",
    ],
    stops: ["Kinross", "Auchterarder"],
    serviceIds: ["golf-transfers", "airport-transfers", "executive-transfers"],
    faqs: [
      { q: "How long from Edinburgh Airport to Gleneagles?", a: "About 55 minutes for 40 miles via the M9, A9 and A823." },
      { q: "Can you collect four players with clubs?", a: "Yes — confirm bag count at booking and we allocate a vehicle sized for clubs and cases together." },
      { q: "Can the same driver run our week's itinerary?", a: "Where availability allows, yes. Multi-day golf itineraries are quoted as a package." },
    ],
  },
  {
    slug: "glasgow-to-st-andrews",
    category: "golf",
    from: { name: "Glasgow", path: "/areas/glasgow" },
    to: { name: "St Andrews" },
    miles: 82,
    mins: 115,
    via: "M80, M9, Kincardine Bridge and A91",
    note:
      "From Glasgow the fastest line to St Andrews goes M80, M9 and over the Kincardine Bridge before the A91 through Fife, roughly 82 miles and just under two hours. The A91's village limits after Auchtermuchty are the part travellers underestimate, so tee-time departures are set from the first tee backwards.",
    planning: [
      "For a morning tee time we work back from the tee, not from the hotel breakfast.",
      "Kincardine Bridge closures push the route to the Forth crossings, adding around 15 minutes.",
      "Club and case counts decide vehicle class — state both when booking.",
    ],
    stops: ["Stirling", "Kincardine", "Cupar"],
    serviceIds: ["golf-transfers", "long-distance-transfers", "group-transfers"],
    faqs: [
      { q: "How long is Glasgow to St Andrews?", a: "Around 1 hour 55 minutes for 82 miles via the M80, M9 and A91." },
      { q: "Can a group of eight travel together?", a: "Yes — an eight-seat minibus with a luggage trailer or a second vehicle depending on club count." },
      { q: "Do you run the return the same day?", a: "Yes, as a fixed second leg with the driver's return time confirmed at booking." },
    ],
  },
  {
    slug: "edinburgh-to-fort-william",
    category: "tour",
    from: { name: "Edinburgh", path: "/areas/edinburgh" },
    to: { name: "Fort William" },
    miles: 146,
    mins: 210,
    via: "M9, A82 through Glen Coe",
    note:
      "This is the scenic run rather than the fast one: 146 miles by way of Stirling, Loch Lomond's west shore and Glen Coe, about three and a half hours before any stops. The single-track-width sections along Loch Lomond and the weather over Rannoch Moor set the pace, which is why we quote it as a journey with stops rather than a straight transfer.",
    planning: [
      "Photograph stops at Loch Lomond, Rannoch Moor and Glen Coe are added as timed stops.",
      "Winter journeys are checked for A82 conditions and daylight before departure.",
      "Onward legs to Skye, Mallaig or Inverness are quoted as continuations.",
    ],
    stops: ["Stirling", "Luss", "Rannoch Moor", "Glen Coe"],
    serviceIds: ["tours", "long-distance-transfers", "group-transfers"],
    faqs: [
      { q: "How long does Edinburgh to Fort William take?", a: "About 3 hours 30 minutes driving for 146 miles, and longer with scenic stops." },
      { q: "Is this a tour or a transfer?", a: "Either. Booked as a transfer it runs direct; booked as a private tour we build in stops and viewpoints." },
      { q: "Can you continue to Skye?", a: "Yes. Fort William to Skye is a common continuation and is quoted with the main leg." },
    ],
  },
  // ---------------------------------------------------------------------
  // Edinburgh Airport corridor. Distances and durations below are real
  // Google Routes API figures, not estimates. Held back from the sitemap and
  // the /routes index (`review: true`) until signed off.
  // ---------------------------------------------------------------------
  {
    slug: "dundee-to-edinburgh-airport",
    review: true,
    category: "airport",
    from: { name: "Dundee", path: "/areas/dundee" },
    to: { name: "Edinburgh Airport", path: "/airports/edinburgh-airport" },
    miles: 50,
    mins: 70,
    via: "A90, M90 and the Queensferry Crossing",
    note:
      "Dundee to Edinburgh Airport is a 50-mile run down the A90 from the Kingsway, across the Tay at Dundee and through Fife on the M90 past Glenrothes and Kinross before the Queensferry Crossing drops you onto the airport spur at Junction 1a. The genuinely unpredictable part is the Halbeath to Ferrytoll stretch, which queues on weekday mornings, so a 06:00 flight is collected before 04:00 rather than on a 70-minute map estimate. There is no rail alternative that reaches the terminal directly — the train requires a change and a tram at Haymarket — which is why most Dundee passengers with early departures book a car door to door.",
    planning: [
      "Add 20 minutes for weekday collections passing Ferrytoll between 07:00 and 09:00.",
      "Bridge wind restrictions on the Queensferry Crossing are checked before departure; the Kincardine diversion adds around 25 minutes.",
      "University of Dundee and Ninewells collections are set to a named building entrance, as both campuses have controlled access.",
    ],
    stops: ["Dundee city centre", "Glenrothes", "Kinross", "Ferrytoll"],
    serviceIds: ["airport-transfers", "long-distance-transfers", "executive-transfers"],
    faqs: [
      {
        q: "How much is a taxi from Dundee to Edinburgh Airport?",
        a: "A taxi from Dundee to Edinburgh Airport costs {{saloonFare}} in a standard saloon and takes about 70 minutes for the 50-mile drive. The price is fixed before you travel — there is no meter and no airport surcharge added afterwards.",
      },
      {
        q: "How long does it take?",
        a: "About 70 minutes off-peak for 50 miles via the A90, M90 and Queensferry Crossing, and closer to 90 minutes if you pass Ferrytoll during the weekday morning peak.",
      },
      {
        q: "What happens if my flight is delayed?",
        a: "Arrivals into Edinburgh are tracked against your flight number, so the driver is re-timed automatically. The first 60 minutes of waiting on international arrivals and 30 minutes on domestic are included at no extra cost.",
      },
    ],
  },
  {
    slug: "stirling-to-edinburgh-airport",
    review: true,
    category: "airport",
    from: { name: "Stirling", path: "/areas/stirling" },
    to: { name: "Edinburgh Airport", path: "/airports/edinburgh-airport" },
    miles: 28,
    mins: 38,
    via: "M9 eastbound to Newbridge",
    note:
      "Stirling sits 28 miles from Edinburgh Airport and the M9 runs almost the whole way, leaving the city past the Wallace Monument and joining the airport spur at Newbridge — one motorway, no city driving at either end, which makes this one of the most reliable airport runs in central Scotland at around 38 minutes. The pinch point is local rather than motorway: Craigs Roundabout and the A9 approach out of central Stirling back up on weekday mornings, so we collect from the door with that built in. Castle-side and Old Town hotel pickups are confirmed to an accessible street because several of the wynds above Broad Street are too narrow for an MPV.",
    planning: [
      "Bridge of Allan and University of Stirling collections join the M9 at Junction 11, not through the city.",
      "Allow an extra 15 minutes when leaving central Stirling before 08:30 on a weekday.",
      "Group bookings for the Stirling area are quoted per vehicle, so eight passengers travel as one van rather than two saloons.",
    ],
    stops: ["Bridge of Allan", "Falkirk", "Linlithgow", "Newbridge"],
    serviceIds: ["airport-transfers", "executive-transfers", "group-transfers"],
    faqs: [
      {
        q: "How much is a taxi from Stirling to Edinburgh Airport?",
        a: "A taxi from Stirling to Edinburgh Airport costs {{saloonFare}} in a standard saloon and takes about 38 minutes for the 28-mile drive on the M9. The fare is fixed at booking for the whole vehicle, not per passenger.",
      },
      {
        q: "How long does it take?",
        a: "Around 38 minutes for 28 miles via the M9 eastbound to Newbridge, rising to roughly 55 minutes if you leave central Stirling in the weekday morning peak.",
      },
      {
        q: "What happens if my flight is delayed?",
        a: "We track the inbound flight and move the pickup time to match the actual landing. Waiting time is included for the first hour after an international arrival, so a delay does not cost you extra.",
      },
    ],
  },
  {
    slug: "dunfermline-to-edinburgh-airport",
    review: true,
    category: "airport",
    from: { name: "Dunfermline", path: "/areas/dunfermline" },
    to: { name: "Edinburgh Airport", path: "/airports/edinburgh-airport" },
    miles: 12,
    mins: 23,
    via: "M90 south over the Queensferry Crossing",
    note:
      "Dunfermline is the closest Fife town to Edinburgh Airport — 12 miles, and only about 23 minutes because the M90 runs south from Halbeath straight over the Queensferry Crossing to the airport spur, with no city-centre driving in between. Being that short changes the practicalities rather than the price: passengers regularly book 05:00 collections for the first easyJet and Ryanair departures, and a short run still needs a driver who will actually turn out at that hour. High-wind closures on the Queensferry Crossing are the one genuine risk, and the Forth Road Bridge or Kincardine diversion turns 23 minutes into closer to 45.",
    planning: [
      "For departures before 07:00 we confirm the driver the night before and collect from the door.",
      "Queensferry Crossing wind restrictions are checked before every crossing; the diversion adds around 20 minutes.",
      "Halbeath Park & Ride and Dunfermline City station pickups are set at a named bay so you are not looking for the car.",
    ],
    stops: ["Halbeath", "Inverkeithing", "Ferrytoll", "Queensferry Crossing"],
    serviceIds: ["airport-transfers", "private-hire", "executive-transfers"],
    faqs: [
      {
        q: "How much is a taxi from Dunfermline to Edinburgh Airport?",
        a: "A taxi from Dunfermline to Edinburgh Airport costs {{saloonFare}} in a standard saloon and takes about 23 minutes for the 12-mile drive over the Queensferry Crossing. Bridge tolls do not apply and nothing is added on arrival.",
      },
      {
        q: "How long does it take?",
        a: "About 23 minutes for 12 miles on the M90, making Dunfermline one of the quickest Fife towns to reach Edinburgh Airport from. Allow 40 minutes if the Queensferry Crossing is under a wind diversion.",
      },
      {
        q: "What happens if my flight is delayed?",
        a: "Your flight is tracked, so a late landing simply moves the pickup. Because the run is short we hold the driver locally in Fife rather than dispatching from Edinburgh, and the first hour of international waiting is included.",
      },
    ],
  },
  {
    slug: "livingston-to-edinburgh-airport",
    review: true,
    category: "airport",
    from: { name: "Livingston", path: "/areas/livingston" },
    to: { name: "Edinburgh Airport", path: "/airports/edinburgh-airport" },
    miles: 11,
    mins: 23,
    via: "M8 eastbound and the A8 airport spur",
    note:
      "Livingston to Edinburgh Airport is 11 miles and about 23 minutes: out of the town's roundabout network onto the M8 at Junction 3, east past Newbridge and into the terminal from the A8 spur. Most of the variability is inside Livingston itself rather than on the motorway, because Almondvale, Deans, Craigshill and Eliburn each add or save several minutes depending on which junction serves them — so the pickup time is set from your actual street, not from the town centre. The corridor also serves the business parks at Kirkton Campus and Houstoun, where early-morning collections for a first flight are routine and account bookings are invoiced monthly rather than paid in the car.",
    planning: [
      "Pickups are timed from your specific Livingston district, as junction choice changes the run by several minutes.",
      "Kirkton Campus and Houstoun Industrial Estate collections can be placed on a corporate account with monthly invoicing.",
      "Late-evening arrivals into Edinburgh are met inside the terminal on request, with the driver waiting airside of the exit doors.",
    ],
    stops: ["Almondvale", "Newbridge", "Ratho Station"],
    serviceIds: ["airport-transfers", "corporate-travel", "private-hire"],
    faqs: [
      {
        q: "How much is a taxi from Livingston to Edinburgh Airport?",
        a: "A taxi from Livingston to Edinburgh Airport costs {{saloonFare}} in a standard saloon and takes about 23 minutes for the 11-mile drive on the M8. The fare covers the whole car, including luggage and the airport approach.",
      },
      {
        q: "How long does it take?",
        a: "Roughly 23 minutes for 11 miles via the M8 and the A8 airport spur. Weekday collections between 07:30 and 09:00 are nearer 35 minutes, mostly because of local Livingston traffic rather than the motorway.",
      },
      {
        q: "What happens if my flight is delayed?",
        a: "Flight numbers are tracked and the driver is re-timed to the real landing time. Waiting is free for the first hour on international arrivals and the first 30 minutes on domestic flights.",
      },
    ],
  },
  {
    slug: "edinburgh-airport-to-city-centre",
    review: true,
    category: "airport",
    from: { name: "Edinburgh Airport", path: "/airports/edinburgh-airport" },
    to: { name: "Edinburgh City Centre", path: "/areas/edinburgh" },
    miles: 10,
    mins: 33,
    via: "A8 Glasgow Road and the West End",
    note:
      "The terminal is only 10 miles from Princes Street, but this is the one Edinburgh journey where distance tells you almost nothing: the A8 in through Corstorphine and Haymarket, tram works, and the Old Town's setted streets mean 33 minutes is realistic and an hour is possible during the August festival. A car goes to your actual door, which matters here because the tram stops at St Andrew Square and leaves you with a suitcase on cobbles if you are staying in the Grassmarket, Royal Mile or Stockbridge. During festival month we confirm a drop-off street that is genuinely open rather than the hotel address on your booking, since large sections of the Old Town are closed to traffic.",
    planning: [
      "Old Town and Royal Mile drops are confirmed to an open street — several are closed or setted, particularly in August.",
      "Meet & greet in the arrivals hall with a name board is available, otherwise pickups use the short-stay bays rather than the drop-off loop.",
      "Late arrivals after the last tram are covered 24/7, including flights landing after midnight.",
    ],
    stops: ["Corstorphine", "Haymarket", "West End"],
    serviceIds: ["airport-transfers", "executive-transfers", "private-hire"],
    faqs: [
      {
        q: "How much is a taxi from Edinburgh Airport to the city centre?",
        a: "A taxi from Edinburgh Airport to Edinburgh city centre costs {{saloonFare}} in a standard saloon and takes about 33 minutes for the 10-mile drive. The price is fixed when you book, so festival traffic does not change what you pay.",
      },
      {
        q: "How long does it take?",
        a: "Typically 33 minutes for 10 miles via the A8 and the West End. Expect 45 to 60 minutes at rush hour or during the August festival, when Old Town access is restricted.",
      },
      {
        q: "What happens if my flight is delayed?",
        a: "We track your flight and adjust the pickup to the actual landing time at no extra charge, with the first hour of waiting included on international arrivals and 30 minutes on domestic.",
      },
    ],
  },
  // ---------------------------------------------------------------------
  // Second Edinburgh Airport batch. Distances and durations are real road
  // figures for the stated corridor, with door-to-door allowances added on
  // top of free-flow times. All held as `review: true` drafts.
  // ---------------------------------------------------------------------
  {
    slug: "aberdeen-to-edinburgh-airport",
    review: true,
    category: "airport",
    from: { name: "Aberdeen", path: "/areas/aberdeen" },
    to: { name: "Edinburgh Airport", path: "/airports/edinburgh-airport" },
    miles: 124,
    mins: 155,
    via: "A90 south, Dundee, M90 and the Queensferry Crossing",
    note:
      "This is a 124-mile run and the longest regular airport transfer we operate: south on the A90 past Stonehaven and Montrose, across the Tay, then the M90 through Fife to the Queensferry Crossing and the airport spur. We will say plainly that Ember runs an hourly electric coach from Aberdeen directly to the terminal and it costs a fraction of a car for one person — the coach takes about three and a half hours against roughly two hours 35 minutes by road, and its earliest arrivals do not suit a 06:00 departure. The A90 single-carriageway sections at Laurencekirk and Stonehaven are where time is won or lost, and offshore crew changes with kit bags are the other reason this journey gets booked as a car rather than a coach seat.",
    planning: [
      "For departures before 08:00 we collect the night before's schedule and set pickup at least 4 hours 30 minutes ahead, allowing for A90 roadworks.",
      "Offshore and energy-sector collections are quoted with room for kit bags and hold luggage, and heliport transfers can be added as a second leg.",
      "Comfort stops at Dundee or Kinross are built into the quote rather than charged as waiting time.",
      "Queensferry Crossing wind restrictions are checked before departure; the Kincardine diversion adds around 25 minutes.",
    ],
    stops: ["Stonehaven", "Montrose", "Dundee", "Kinross"],
    serviceIds: ["airport-transfers", "long-distance-transfers", "executive-transfers"],
    faqs: [
      {
        q: "How much is a taxi from Aberdeen to Edinburgh Airport?",
        a: "A taxi from Aberdeen to Edinburgh Airport costs {{saloonFare}} in a standard saloon and takes about 2 hours 35 minutes for the 124-mile drive. The price is fixed before you travel, with no meter and no airport surcharge added later.",
      },
      {
        q: "Is the coach cheaper?",
        a: "Yes, considerably, if you are travelling alone. Ember runs hourly to the terminal and publishes live prices at ember.to, taking about 3 hours 30 minutes. A car is faster, covers flight times the coach does not, and works out closer to the coach once three or four people share one fixed fare.",
      },
      {
        q: "How long does it take?",
        a: "About 2 hours 35 minutes for 124 miles via the A90, M90 and Queensferry Crossing. Allow extra for the single-carriageway stretches around Laurencekirk and Stonehaven.",
      },
    ],
  },
  {
    slug: "perth-to-edinburgh-airport",
    review: true,
    category: "airport",
    from: { name: "Perth", path: "/areas/perth" },
    to: { name: "Edinburgh Airport", path: "/airports/edinburgh-airport" },
    miles: 42,
    mins: 60,
    via: "M90 south through Kinross and the Queensferry Crossing",
    note:
      "Perth to Edinburgh Airport is a straightforward 42 miles almost entirely on the M90: down past Glenfarg and Kinross, over the Queensferry Crossing and off at Junction 1a onto the airport spur. It is one of the easier Scottish airport runs because there is no city-centre traffic at either end, so the 60-minute door-to-door figure holds outside the Halbeath-to-Ferrytoll morning queue. There is no direct rail link — the train needs a change and a tram at Haymarket, and the tram does not run before 06:30, which rules it out for the early departures most Perthshire passengers book.",
    planning: [
      "Weekday collections passing Ferrytoll between 07:00 and 09:00 are timed with an extra 15 minutes.",
      "Gleneagles, Auchterarder and Crieff pickups are quoted from the same corridor, adding 20 to 30 minutes.",
      "Golf groups travelling from Perthshire courses are allocated a vehicle with dedicated club space rather than a saloon boot.",
    ],
    stops: ["Kinross", "Halbeath", "Ferrytoll"],
    serviceIds: ["airport-transfers", "golf-transfers", "executive-transfers"],
    faqs: [
      {
        q: "How much is a taxi from Perth to Edinburgh Airport?",
        a: "A taxi from Perth to Edinburgh Airport costs {{saloonFare}} in a standard saloon and takes about an hour for the 42-mile drive down the M90. The fare is fixed when you book.",
      },
      {
        q: "How long does it take?",
        a: "About 60 minutes for 42 miles on the M90, and closer to 75 minutes if you pass Halbeath and Ferrytoll during the weekday morning peak.",
      },
      {
        q: "Can you collect from Gleneagles?",
        a: "Yes. Gleneagles, Auchterarder and Crieff sit on the same corridor and are quoted as a fixed price with the extra mileage included.",
      },
    ],
  },
  {
    slug: "newcastle-to-edinburgh-airport",
    review: true,
    category: "long-distance",
    from: { name: "Newcastle", path: "/areas/newcastle" },
    to: { name: "Edinburgh Airport", path: "/airports/edinburgh-airport" },
    miles: 131,
    mins: 175,
    via: "A1 north through Northumberland and the Edinburgh City Bypass",
    note:
      "The 131 miles from Newcastle to Edinburgh Airport run up the A1 through Morpeth, Alnwick and Berwick-upon-Tweed, then onto the A1 dual sections at Dunbar and round the city bypass to the airport. The honest caveat is the Northumberland single-carriageway stretches: they are the reason we quote about two hours 55 minutes rather than the 2 hours 43 minutes a map produces, and why an agricultural vehicle can add 20 minutes without warning. Most of these bookings are cross-border business travel or passengers connecting onto a long-haul flight Newcastle does not serve directly, so the pickup is timed from your check-in cut-off rather than from a satnav estimate.",
    planning: [
      "Cross-border journeys are quoted as a single fixed fare with no per-mile top-up on arrival.",
      "Add 30 minutes for daytime travel on the A1 single-carriageway sections between Morpeth and Berwick.",
      "One comfort stop, usually Alnwick or Dunbar, is included in the quote on this length of journey.",
      "For 06:00 departures we advise a pickup no later than 01:30 and confirm the driver's route the previous evening.",
    ],
    stops: ["Morpeth", "Alnwick", "Berwick-upon-Tweed", "Dunbar"],
    serviceIds: ["long-distance-transfers", "airport-transfers", "corporate-travel"],
    faqs: [
      {
        q: "How much is a taxi from Newcastle to Edinburgh Airport?",
        a: "A taxi from Newcastle to Edinburgh Airport costs {{saloonFare}} in a standard saloon and takes about 2 hours 55 minutes for the 131-mile drive up the A1. The price is fixed and includes a comfort stop.",
      },
      {
        q: "Would the train be better?",
        a: "For one person travelling in the daytime, usually yes — LNER runs Newcastle to Edinburgh in about 90 minutes, though you then need the tram or a bus to the terminal and the tram does not run before 06:30. A car is the practical choice for early flights, groups and heavy luggage.",
      },
      {
        q: "How long does it take?",
        a: "Around 2 hours 55 minutes for 131 miles, allowing for the Northumberland single-carriageway sections that a map estimate ignores.",
      },
    ],
  },
  {
    slug: "edinburgh-airport-to-edinburgh-waverley",
    review: true,
    category: "airport",
    from: { name: "Edinburgh Airport", path: "/airports/edinburgh-airport" },
    to: { name: "Edinburgh Waverley", path: "/stations/edinburgh-waverley" },
    miles: 9,
    mins: 30,
    via: "A8, Haymarket and the West End",
    note:
      "Nine miles separate the terminal from Waverley, and this is a journey people book for one reason: an onward train. The Airlink 100 bus terminates at Waverley Bridge directly above the station for £6.00, which is genuinely the cheapest and often the most convenient option — the tram, by contrast, does not serve Waverley at all and leaves you walking down from St Andrew Square with your cases. A car earns its place on tight rail connections, with more than one large case each, or for trains outside the 06:30 to 22:52 tram window. Drops use Waverley Bridge or the Market Street entrance depending on which is open, and we confirm that on the day rather than guessing.",
    planning: [
      "Tell us your train time, not just your flight time — we set the pickup from the departure you need to make.",
      "Drop-off is at Waverley Bridge or Market Street; the ramp access into the station is confirmed with the driver on the day.",
      "Bikes, ski bags and oversized luggage going onto a train need an estate or MPV, which is allocated at booking.",
      "For arrivals after the last tram at 22:52 a car is the only door-to-station option besides the night bus.",
    ],
    stops: ["Corstorphine", "Haymarket", "West End"],
    serviceIds: ["airport-transfers", "private-hire", "executive-transfers"],
    faqs: [
      {
        q: "How much is a taxi from Edinburgh Airport to Waverley Station?",
        a: "A taxi from Edinburgh Airport to Edinburgh Waverley costs {{saloonFare}} in a standard saloon and takes about 30 minutes for the 9-mile drive. The fare is fixed at booking.",
      },
      {
        q: "Is the bus cheaper than a taxi to Waverley?",
        a: "Yes. The Airlink 100 costs £6.00 for an adult single and stops at Waverley Bridge, immediately above the station. A car is worth the difference for tight connections, several large cases, or trains outside the tram and daytime bus hours.",
      },
      {
        q: "Does the tram go to Waverley?",
        a: "No. The nearest tram stop is St Andrew Square, so you walk the last part to the station. The Airlink bus terminates closer, at Waverley Bridge.",
      },
    ],
  },
  {
    slug: "halbeath-park-and-ride-to-edinburgh-airport",
    review: true,
    category: "airport",
    from: { name: "Halbeath Park & Ride", path: "/areas/dunfermline" },
    to: { name: "Edinburgh Airport", path: "/airports/edinburgh-airport" },
    miles: 16,
    mins: 25,
    via: "M90 south from Junction 3 and the Queensferry Crossing",
    note:
      "Halbeath Park & Ride sits directly off M90 Junction 3 on the eastern edge of Dunfermline, and it is 16 miles from there to the terminal over the Queensferry Crossing. Parking at Halbeath is free, and Stagecoach's JET 747 runs from the site to the airport every 20 minutes — for a flight inside that timetable the bus is far cheaper than any car, and we will tell you so. The gap it does not cover is exactly when west Fife passengers travel: the airport departures run from 08:30 to 18:55, so a 06:00 flight or a 23:00 arrival needs a car. We collect from a named bay in the car park rather than the bus stances, so there is no confusion in the dark.",
    planning: [
      "Pickups are set at a named bay in the Halbeath car park, not the bus stances.",
      "Parking at Halbeath is free, which usually makes leaving a car here cheaper than a week in airport parking even with two transfers.",
      "Queensferry Crossing wind restrictions are checked before departure; the Kincardine diversion adds around 25 minutes.",
      "Dunfermline, Cowdenbeath, Kelty and Rosyth doorstep pickups are quoted on the same corridor if you would rather not drive to Halbeath at all.",
    ],
    stops: ["Ferrytoll", "Queensferry Crossing"],
    serviceIds: ["airport-transfers", "private-hire", "group-transfers"],
    faqs: [
      {
        q: "How much is a taxi from Halbeath Park & Ride to Edinburgh Airport?",
        a: "A taxi from Halbeath Park & Ride to Edinburgh Airport costs {{saloonFare}} in a standard saloon and takes about 25 minutes for the 16-mile drive over the Queensferry Crossing. The fare is fixed at booking.",
      },
      {
        q: "Is the JET 747 bus cheaper?",
        a: "Yes, much cheaper — but the airport departures only run between 08:30 and 18:55, so it does not cover early-morning flights or late arrivals. Check the current timetable at stagecoachbus.com before choosing.",
      },
      {
        q: "Is parking at Halbeath free?",
        a: "Yes, Halbeath Park & Ride is a free Fife Council car park, which is why many passengers leave a car there and take a transfer for the last 16 miles.",
      },
    ],
  },
  {
    slug: "ingliston-park-and-ride-to-edinburgh-airport",
    review: true,
    category: "airport",
    from: { name: "Ingliston Park & Ride", path: "/areas/edinburgh" },
    to: { name: "Edinburgh Airport", path: "/airports/edinburgh-airport" },
    miles: 2,
    mins: 8,
    via: "Eastfield Road and the A8 airport approach",
    note:
      "Ingliston Park & Ride is the closest low-cost parking to the terminal, one tram stop away on the airport line with more than 1,000 spaces off the A8 at the Royal Highland Showground. Being honest about a two-mile journey: the tram from Ingliston to the terminal is one short hop and almost always the right answer between 06:30 and 22:52. A car is worth booking when your flight falls outside tram hours, when you are moving a family and four cases the length of a car park in the rain, or when you are part of a group where one vehicle beats several tickets. We collect from a named row in the car park so there is no wandering with luggage.",
    planning: [
      "Pickups use a named car park row and registration, agreed at booking.",
      "The tram is one stop from Ingliston to the terminal and runs every 7 minutes between 06:30 and 22:52 — outside those hours a car is the only option.",
      "Showground event days congest the A8 approach; we add 15 minutes when the Royal Highland Show or a concert is on.",
      "Short-notice bookings from the car park are possible but subject to a vehicle being in the airport area.",
    ],
    stops: ["Royal Highland Showground", "A8 airport approach"],
    serviceIds: ["airport-transfers", "private-hire", "group-transfers"],
    faqs: [
      {
        q: "How much is a taxi from Ingliston Park & Ride to Edinburgh Airport?",
        a: "A taxi from Ingliston Park & Ride to Edinburgh Airport costs {{saloonFare}} in a standard saloon for the 2-mile drive, which takes about 8 minutes. Minimum fares apply on very short journeys.",
      },
      {
        q: "Should I just take the tram?",
        a: "Between 06:30 and 22:52, almost certainly yes — Ingliston is one tram stop from the terminal. Outside those hours, or with a family and several cases, a car makes more sense.",
      },
      {
        q: "How many spaces are there at Ingliston?",
        a: "Ingliston Park & Ride has over 1,000 spaces and is signposted from the A8 at the Royal Highland Showground, immediately beside its own tram stop.",
      },
    ],
  },
  {
    slug: "glasgow-airport-to-edinburgh",
    review: true,
    category: "airport",
    from: { name: "Glasgow Airport", path: "/airports/glasgow-airport" },
    to: { name: "Edinburgh", path: "/areas/edinburgh" },
    miles: 55,
    mins: 80,
    via: "M8 eastbound via Glasgow and Livingston",
    note:
      "There is no through public service from Glasgow Airport to Edinburgh, and that single fact is why this transfer exists. The cheap route is two legs: First's Airport Express 500 into Buchanan Bus Station for £8.50, then a Citylink 900 coach or a train onward — fine with hand luggage, awkward with a family and four cases. By road it is 55 miles on the M8 in about 80 minutes, and the variable part is the eastern end, where the Newbridge junction and the Edinburgh city bypass decide whether you arrive in 75 minutes or 100. Long-haul arrivals at Glasgow connecting to an Edinburgh hotel are the most common booking on this route, so meet & greet in arrivals is worth adding.",
    planning: [
      "Flights are tracked, with the first 60 minutes of waiting on international arrivals included.",
      "Meet & greet with a name board in the Glasgow arrivals hall avoids the terminal's short drop-off window.",
      "Allow 100 minutes for weekday arrivals into central Edinburgh before 09:30.",
      "Old Town and festival-period drops are confirmed to a street that is genuinely open to traffic.",
    ],
    stops: ["Glasgow city centre", "Livingston", "Newbridge"],
    serviceIds: ["airport-transfers", "executive-transfers", "corporate-travel"],
    faqs: [
      {
        q: "How much is a taxi from Glasgow Airport to Edinburgh?",
        a: "A taxi from Glasgow Airport to Edinburgh costs {{saloonFare}} in a standard saloon and takes about 80 minutes for the 55-mile drive on the M8. The fare is fixed before you travel.",
      },
      {
        q: "Is there a direct bus from Glasgow Airport to Edinburgh?",
        a: "No. You take the Airport Express 500 into Glasgow city centre for £8.50, then a Citylink 900 coach or a train to Edinburgh. It is cheaper than a car for one person but involves a change with your luggage at Buchanan Bus Station.",
      },
      {
        q: "How long does it take?",
        a: "Around 80 minutes for 55 miles on the M8, and up to 100 minutes arriving in central Edinburgh during the weekday morning peak.",
      },
    ],
  },
  {
    slug: "edinburgh-to-glasgow-airport",
    review: true,
    category: "airport",
    from: { name: "Edinburgh", path: "/areas/edinburgh" },
    to: { name: "Glasgow Airport", path: "/airports/glasgow-airport" },
    miles: 55,
    mins: 80,
    via: "M8 westbound and the M8 Junction 28 airport spur",
    note:
      "Edinburgh to Glasgow Airport is 55 miles of M8 finishing on the airport spur at Junction 28, and the practical point is that no public service does it in one leg: you would take a coach or train to Glasgow, then the Airport Express 500 from Buchanan Bus Station. For a 06:00 departure that combination barely works, which is why we set pickups here from your check-in cut-off and build in the Baillieston-to-Junction-28 stretch that queues on weekday mornings. Vehicles serving central Glasgow are Low Emission Zone compliant as standard, and Edinburgh collections in controlled-access streets use a named door rather than a postcode.",
    planning: [
      "For departures before 08:00 we recommend a pickup at least 2 hours 20 minutes ahead of check-in.",
      "Add 20 minutes for weekday travel passing Baillieston and the M8 Junction 28 approach before 09:00.",
      "Golf and ski groups get a vehicle with dedicated hold space rather than a saloon boot.",
      "Same-day returns are quoted as two fixed legs, so a delayed inbound flight does not change the price.",
    ],
    stops: ["Livingston", "Harthill services", "Eurocentral"],
    serviceIds: ["airport-transfers", "executive-transfers", "long-distance-transfers"],
    faqs: [
      {
        q: "How much is a taxi from Edinburgh to Glasgow Airport?",
        a: "A taxi from Edinburgh to Glasgow Airport costs {{saloonFare}} in a standard saloon and takes about 80 minutes for the 55-mile drive on the M8. The price is fixed when you book.",
      },
      {
        q: "Is there a direct bus?",
        a: "Not in one leg. You would travel to Glasgow city centre by coach or train and then take the Airport Express 500 from Buchanan Bus Station for £8.50. That is cheaper for one person but involves a change and does not suit very early departures.",
      },
      {
        q: "How long does it take?",
        a: "About 80 minutes for 55 miles westbound on the M8, allowing 100 minutes for weekday morning travel.",
      },
    ],
  },
];



export function getJourney(slug: string): JourneyRecord | undefined {
  return JOURNEYS.find((j) => j.slug === slug);
}

export function journeyPath(slug: string): string {
  return `/routes/${slug}`;
}

export function publishedJourneyPaths(): string[] {
  return JOURNEYS.filter((j) => !j.review).map((j) => journeyPath(j.slug));
}

export function journeysByCategory(category: JourneyCategory): JourneyRecord[] {
  return JOURNEYS.filter((j) => j.category === category && !j.review);
}


/** Categories that actually contain journeys — never render an empty category. */
export function populatedCategories() {
  return JOURNEY_CATEGORIES.map((c) => ({ ...c, journeys: journeysByCategory(c.id) })).filter(
    (c) => c.journeys.length > 0,
  );
}

export type JourneyContent = JourneyRecord & {
  h1: string;
  metaTitle: string;
  metaDescription: string;
  canonicalPath: string;
  hours: string;
  services: { name: string; url: string; intent: string }[];
  /** Other journeys in the same category, plus the reverse leg if published. */
  relatedJourneys: { label: string; to: string }[];
};

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} minutes`;
  if (m === 0) return `${h} hour${h > 1 ? "s" : ""}`;
  return `${h}h ${m}m`;
}

export function buildJourney(slug: string): JourneyContent | null {
  const j = getJourney(slug);
  if (!j) return null;

  const services = j.serviceIds
    .map((id) => getService(id))
    .filter((s): s is NonNullable<ReturnType<typeof getService>> => Boolean(s))
    .map((s) => ({ name: s.name, url: s.url, intent: s.intent }));

  const reverse = JOURNEYS.find((r) => r.from.name === j.to.name && r.to.name === j.from.name);
  const related = [
    ...(reverse ? [reverse] : []),
    ...journeysByCategory(j.category).filter((r) => r.slug !== j.slug && r.slug !== reverse?.slug),
  ]
    .slice(0, 6)
    .map((r) => ({ label: `${r.from.name} to ${r.to.name}`, to: journeyPath(r.slug) }));

  const pair = `${j.from.name} to ${j.to.name}`;
  const hours = formatDuration(j.mins);

  return {
    ...j,
    h1: `${pair} private transfer.`,
    // Journey records are the single source of truth for these pages — the
    // `seo_pages` mirror row is synced from here, never authored separately.
    metaTitle: journeyMetaTitle(j),

    metaDescription: journeyMetaDescription(j),
    canonicalPath: journeyPath(j.slug),
    hours,
    services,
    relatedJourneys: related,
  };
}

/** Shared so the `seo_pages` mirror can be generated from the same string. */
export function journeyMetaDescription(j: JourneyRecord): string {
  return `How much is a taxi from ${j.from.name} to ${j.to.name}? Fixed fares by vehicle class, flight tracking and no meter. Book online with CabsLink.`;
}

/** Title exactly as served, for mirror sync and tests. */
export function journeyMetaTitle(j: JourneyRecord): string {
  const pair = `${j.from.name} to ${j.to.name}`;
  return pickWithin(60, [
    `${pair} Taxi | Fixed Price Transfer`,
    `${pair} Taxi | Fixed Price`,
    `${pair} Taxi`,
  ]);
}


/**
 * Returns the first variant within `limit` characters, or the shortest one when
 * every variant is too long (better a slightly long title than a truncated word).
 */
function pickWithin(limit: number, variants: string[]): string {
  return (
    variants.find((v) => v.length <= limit) ??
    variants.reduce((a, b) => (b.length < a.length ? b : a))
  );
}

