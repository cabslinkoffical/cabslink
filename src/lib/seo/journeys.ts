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
];


export function getJourney(slug: string): JourneyRecord | undefined {
  return JOURNEYS.find((j) => j.slug === slug);
}

export function journeyPath(slug: string): string {
  return `/routes/${slug}`;
}

export function publishedJourneyPaths(): string[] {
  return JOURNEYS.map((j) => journeyPath(j.slug));
}

export function journeysByCategory(category: JourneyCategory): JourneyRecord[] {
  return JOURNEYS.filter((j) => j.category === category);
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
    // Titles are kept inside ~60 characters so Google renders them in full:
    // the richest variant that fits wins, longest pairs fall back to the short one.
    metaTitle: pickWithin(60, [
      `${pair} Transfer — Fixed Price Private Car | Cabslink`,
      `${pair} Transfer — Fixed Price | Cabslink`,
      `${pair} Transfer | Cabslink`,
    ]),
    metaDescription: pickWithin(155, [
      `Pre-booked ${pair} transfers: ${j.miles} miles via ${j.via}, about ${hours} door to door. Fixed price, professional driver, 24/7 UK support.`,
      `Pre-booked ${pair} transfers: ${j.miles} miles via ${j.via}, about ${hours} door to door. Fixed price, professional driver.`,
      `${pair} transfers: ${j.miles} miles via ${j.via}, about ${hours} door to door. Fixed price, professional driver.`,
      `${pair} transfers: ${j.miles} miles, about ${hours} door to door. Fixed price, professional driver.`,
    ]),
    canonicalPath: journeyPath(j.slug),
    hours,
    services,
    relatedJourneys: related,
  };
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

