/**
 * "How to get there" comparison data for journey (`/routes/*`) pages and for
 * the code-defined guides.
 *
 * HARD RULES for this file — read before editing:
 *  1. Every fare, journey time and frequency here must come from the
 *     operator's own published information (or, where noted, Edinburgh
 *     Airport's own transport pages, which publish the operators' figures).
 *     Nothing is estimated, averaged or inferred. If a figure cannot be
 *     verified, it is not stated — the mode is either omitted or its fare is
 *     described honestly as not published.
 *  2. Each mode carries a `source` URL so any claim can be re-checked.
 *  3. `lastChecked` is the date the block was verified. Operator fares change;
 *     the page says so in plain language.
 *  4. Where a public option is cheaper or faster than a private car, the copy
 *     says so. This file is not marketing.
 *
 * Verified 1 September 2026 against:
 *  - airlink100.co.uk (Airlink 100 return £8.50 / child single £3.00 / child return £4.25 / family return £22.00)
 *  - lothianbuses.com/news/2026/01/fares-revision (Airlink single and return
 *    unchanged at the 22 February 2026 fares revision; single £6.00)
 *  - edinburghtrams.com/tickets/ticket-options (Airport Single £7.90, Airport
 *    Open Return £9.50, city single £2.40 — live prices after 22 Feb 2026)
 *  - edinburghairport.com/transport-links/trams (30 minutes airport to city
 *    centre; first tram 06:30, last 22:52 from the airport)
 *  - citylink.co.uk, edinburghairport.com bus-and-coach pages (frequencies)
 *  - firstbus.co.uk Glasgow Airport Express timetable (£8.50 single)
 */

export type TransportModeKind = "bus" | "coach" | "train" | "tram" | "park-and-ride" | "car";

export type TransportOption = {
  kind: TransportModeKind;
  /** Operator's own name, e.g. "Lothian Buses". */
  operator: string;
  /** Service as the operator brands it, e.g. "Airlink 100". */
  service: string;
  /** Published single fare, exactly as advertised — or an honest statement
   *  that the operator does not publish a fixed fare. */
  fare: string;
  /** Published or operator-stated journey time. */
  duration: string;
  /** How often it runs, in the operator's own terms. */
  frequency: string;
  /** First and last departures, where published. */
  firstLast?: string;
  /** Where it actually picks up and drops off. */
  stops: string;
  /** Honest trade-off. Say the awkward part. */
  tradeOff: string;
  /** URL the figures above were read from. */
  source: string;
};

export type JourneyTransportComparison = {
  /** ISO date the figures were last verified against operator sources. */
  lastChecked: string;
  /** One honest sentence framing the choice for this specific journey. */
  verdict: string;
  options: TransportOption[];
  /** Who a private car is genuinely the right answer for on this journey. */
  carSuitsWhen: string[];
};

const LAST_CHECKED = "2026-09-01";

const AIRLINK: TransportOption = {
  kind: "bus",
  operator: "Lothian Buses",
  service: "Airlink 100",
  fare: "£6.00 adult single, £8.50 adult return (child £3.00 single, £4.25 return; family return £22.00)",
  duration: "About 30 minutes to Waverley Bridge",
  frequency: "Up to every 10 minutes (04:12–01:00), up to every 20 minutes overnight",
  firstLast: "Runs 24 hours a day, every day",
  stops:
    "Departs the airport terminal forecourt and runs via Haymarket to Waverley Bridge, beside Waverley station.",
  tradeOff:
    "The cheapest way into town by a wide margin, and it runs all night — but it is a bus with a luggage rack, it only serves its fixed stops, and you finish your journey on foot.",
  source: "https://airlink100.co.uk/",
};

const TRAM: TransportOption = {
  kind: "tram",
  operator: "Edinburgh Trams",
  service: "Airport – York Place / Newhaven line",
  fare: "£7.90 adult Airport Single, £9.50 Airport Open Return",
  duration: "30 minutes airport to city centre (54 minutes end to end to Newhaven)",
  frequency: "Every 7 minutes for most of the day",
  firstLast: "First tram from the airport 06:30, last 22:52 — nothing before or after that",
  stops:
    "Own stop outside the terminal, then Ingliston, Gyle, Murrayfield, Haymarket, Princes Street, St Andrew Square and York Place.",
  tradeOff:
    "Level boarding makes it the easiest option with a case, and it is immune to road traffic — but it stops running before 06:30 and after 22:52, and it leaves you at a tram stop rather than your door. Old Town, Grassmarket and Stockbridge addresses mean a walk over setts at the end.",
  source: "https://edinburghtrams.com/tickets/ticket-options",
};

const CITYLINK_GLA_EDA: TransportOption = {
  kind: "coach",
  operator: "Scottish Citylink",
  service: "Glasgow – Edinburgh Airport (AIR / 900)",
  fare: "Citylink does not publish a fixed single fare for this route — book on citylink.co.uk",
  duration: "About 1 hour Buchanan Bus Station to the terminal",
  frequency: "Up to every 20 minutes during the day, hourly overnight",
  firstLast: "24-hour service",
  stops: "Glasgow Buchanan Bus Station to the airport terminal, non-stop.",
  tradeOff:
    "Direct, frequent and almost certainly the cheapest option for one person — but you have to get to Buchanan Bus Station first, and coach seats and luggage holds are not ideal with young children or golf clubs.",
  source: "https://www.citylink.co.uk/our-routes-and-timetables/glasgow-edinburgh-airport/",
};

const EMBER_E1: TransportOption = {
  kind: "coach",
  operator: "Ember",
  service: "E1 electric coach",
  fare: "Ember uses dynamic pricing and publishes no fixed single fare — check ember.to",
  duration: "Operator-stated: about 3 hours 30 minutes Aberdeen city centre to the terminal",
  frequency: "Hourly, seven days a week, direct to the terminal with no change",
  firstLast: "Departures from the airport hourly 07:12–01:25, plus 00:40, 02:40 and 04:40",
  stops: "Serves the airport terminal directly, so there is no interchange at Halbeath or Haymarket.",
  tradeOff:
    "Far cheaper than a car for one or two people, with USB power and Wi-Fi — but it is a long fixed-schedule journey, and a missed connection at the far end means waiting an hour.",
  source:
    "https://www.edinburghairport.com/transport-links/buses-and-coaches/aberdeen-bus-links",
};

const JET_747: TransportOption = {
  kind: "bus",
  operator: "Stagecoach East Scotland",
  service: "JET 747",
  fare: "Stagecoach does not publish a fixed single on its route page — check stagecoachbus.com",
  duration: "Operator-stated direct link between Halbeath Park & Ride and the terminal",
  frequency: "Every 20 minutes from the airport, 08:30–17:10 and 17:35–18:55",
  firstLast: "Daytime and early-evening service only — nothing for a 05:00 check-in",
  stops: "Halbeath Park & Ride (free parking) to the airport terminal, via Ferrytoll.",
  tradeOff:
    "Park free at Halbeath and the bus is the cheapest way to the terminal by a long way — but the timetable does not cover early-morning or late-night flights, which is exactly when most Fife passengers travel.",
  source: "https://www.edinburghairport.com/transport-links/buses-and-coaches/fife-bus-links",
};

const FIRST_500: TransportOption = {
  kind: "bus",
  operator: "First Bus",
  service: "Glasgow Airport Express 500",
  fare: "£8.50 adult single",
  duration: "From 15 minutes, airport to Buchanan Bus Station",
  frequency: "Up to every 10 minutes",
  firstLast: "24-hour service",
  stops: "Stance 1 outside Glasgow Airport to Glasgow city centre and Buchanan Bus Station.",
  tradeOff:
    "Quick and cheap into Glasgow — but it only gets you to Glasgow. For Edinburgh you then change onto a Citylink 900 coach or a train, which is where the time goes.",
  source:
    "https://www.firstbus.co.uk/uploads/node_images/greater-glasgow/Glasgow%20Airport%20Express%20timetable.pdf",
};

/**
 * Keyed by journey slug in `src/lib/seo/journeys.ts`. A journey with no entry
 * renders no comparison section at all.
 */
export const JOURNEY_TRANSPORT: Record<string, JourneyTransportComparison> = {
  "edinburgh-airport-to-city-centre": {
    lastChecked: LAST_CHECKED,
    verdict:
      "Be straight about this one: if you are travelling light, between 06:30 and 22:52, and staying near Princes Street, the tram or the Airlink bus will cost you a fraction of a car and get you there in a similar time. The bus is the cheapest option at £6.00 and it runs all night. A private car earns its price when the tram is not running, when there is luggage or a child seat involved, or when your address is up a set of Old Town steps.",
    options: [
      TRAM,
      AIRLINK,
      {
        kind: "car",
        operator: "CabsLink",
        service: "Private car, door to door",
        fare: "Fixed price per car, quoted before you book — see the fare table above",
        duration: "About 33 minutes for the 10 miles via the A8, longer in festival traffic",
        frequency: "Booked for your flight, 24 hours a day",
        firstLast: "Any time, including flights landing after midnight",
        stops: "Terminal to your actual address, with the bags in the boot.",
        tradeOff:
          "The most expensive option per person if you are travelling alone — the honest case for it is a group, an early or late flight, or an address the tram and bus do not reach.",
        source: "https://cabslink.com/airports/edinburgh-airport",
      },
    ],
    carSuitsWhen: [
      "Flights landing after 22:52 or departing before the first 06:30 tram",
      "Three or four people, where the per-person cost lands close to four tram tickets",
      "Families needing a fitted child seat rather than a lap on a bus",
      "Old Town, Grassmarket, Stockbridge or Dean Village addresses, where the walk from the nearest stop is over setts and up steps",
      "Anyone with more than one large case per person",
    ],
  },

  "edinburgh-airport-to-edinburgh-waverley": {
    lastChecked: LAST_CHECKED,
    verdict:
      "For Waverley specifically the bus wins on geography: the Airlink 100 terminates at Waverley Bridge, directly above the station, for £6.00. The tram does not serve Waverley — the nearest stop is St Andrew Square, and you finish on foot. If you have a train to catch with a tight connection and luggage, that walk is the reason people book a car.",
    options: [
      { ...AIRLINK, tradeOff: "Terminates at Waverley Bridge, immediately above the station entrance — the shortest walk to a platform of any public option. It is still a bus: fixed stops, shared luggage rack, and standing room at peak times." },
      { ...TRAM, stops: "No Waverley stop. The nearest is St Andrew Square, from which you walk down to the station.", tradeOff: "Level boarding and traffic-proof, but it does not reach Waverley — plan for a walk with your cases at the end, and remember the last tram from the airport is 22:52." },
      {
        kind: "car",
        operator: "CabsLink",
        service: "Private car, terminal to station entrance",
        fare: "Fixed price per car, quoted before you book — see the fare table above",
        duration: "About 30 minutes for 9 miles",
        frequency: "Booked to your flight or train time, 24 hours",
        stops: "Drops at Waverley Bridge or the Market Street entrance, whichever is open.",
        tradeOff:
          "Costs more than £6.00. What it buys is a boot for the bags and a drop at the station entrance rather than a walk from St Andrew Square.",
        source: "https://cabslink.com/stations/edinburgh-waverley",
      },
    ],
    carSuitsWhen: [
      "Tight rail connections where a 10-minute walk is the difference between trains",
      "Two or more large cases, or a bike box, going onto a train",
      "Trains before the 06:30 first tram or after the 22:52 last one",
      "Onward travel with children and pushchairs through a busy concourse",
    ],
  },

  "glasgow-to-edinburgh-airport": {
    lastChecked: LAST_CHECKED,
    verdict:
      "If you are one or two people starting near Buchanan Bus Station, take the Citylink coach: it is direct, up to every 20 minutes, runs 24 hours and costs far less than a car. A private car makes sense from a Glasgow suburb, with a group, or for a flight that needs you at the terminal before the coach network suits you.",
    options: [
      CITYLINK_GLA_EDA,
      {
        kind: "train",
        operator: "ScotRail + Edinburgh Trams",
        service: "Glasgow Queen Street to Haymarket, then the tram",
        fare:
          "ScotRail does not publish a fixed single for this route (Off-Peak tickets were withdrawn in September 2025); the tram leg is £7.90",
        duration: "Rail to Haymarket plus a tram leg to the terminal",
        frequency: "Frequent trains all day; trams every 7 minutes",
        firstLast: "Constrained by the tram: nothing before 06:30 or after 22:52 from the airport",
        stops: "Queen Street to Haymarket, then the tram from Haymarket to the terminal.",
        tradeOff:
          "Usually the fastest public option city centre to city centre, but it is two legs with a change and a platform-to-tram walk at Haymarket. Not the one to pick with three suitcases.",
        source: "https://www.scotrail.co.uk/tickets/off-peak-tickets",
      },
      {
        kind: "car",
        operator: "CabsLink",
        service: "Private car, door to terminal",
        fare: "Fixed price per car — see the fare table above",
        duration: "About 1 hour 15 minutes for 50 miles on the M8",
        frequency: "Booked to your flight, 24 hours",
        stops: "Any Glasgow address to the terminal, no interchange.",
        tradeOff:
          "The expensive option for a solo traveller. It is the sensible one when you are not starting at Buchanan Street, when the coach's luggage hold will not take what you are carrying, or when the flight is at 06:00.",
        source: "https://cabslink.com/areas/glasgow",
      },
    ],
    carSuitsWhen: [
      "Pickups outside central Glasgow, where getting to Buchanan Bus Station is its own journey",
      "Groups of three or more, where the per-head cost approaches coach tickets",
      "Very early flights, or arrivals into Edinburgh late at night with an onward Glasgow leg",
      "Golf clubs, ski bags or more luggage than a coach hold allows",
      "Business travellers who need a receipt, a named driver and a fixed arrival time",
    ],
  },

  "dundee-to-edinburgh-airport": {
    lastChecked: LAST_CHECKED,
    verdict:
      "Dundee is unusually well served: two operators run direct to the terminal, and for one person either will be cheaper than a car. Xplore Dundee's Fly service is non-stop and runs around the clock, which covers the early flights the Fife buses do not.",
    options: [
      {
        kind: "coach",
        operator: "Xplore Dundee",
        service: "Fly",
        fare: "Xplore Dundee does not publish a fixed single on its service page — check xploredundee.com",
        duration: "Average journey time 80 minutes, non-stop",
        frequency: "Hourly from the airport",
        firstLast: "24 hours a day",
        stops: "Departs Stop E at the airport, direct to Dundee with no intermediate stops.",
        tradeOff:
          "Non-stop, round the clock and much cheaper than a car for one — but hourly, so a delayed flight can mean a long wait in the terminal.",
        source:
          "https://www.edinburghairport.com/transport-links/buses-and-coaches/dundee-bus-links",
      },
      { ...EMBER_E1, duration: "Direct to the terminal; Ember publishes live times on ember.to", firstLast: "Hourly through the day, with overnight departures" },
      {
        kind: "car",
        operator: "CabsLink",
        service: "Private car, door to terminal",
        fare: "Fixed price per car — see the fare table above",
        duration: "About 1 hour 20 minutes for 60 miles via the M90",
        frequency: "Booked to your flight, 24 hours",
        stops: "Any Dundee or Angus address to the terminal.",
        tradeOff:
          "Only worth the difference with a group, an awkward pickup point, or a flight time that turns an hourly coach into a two-hour wait.",
        source: "https://cabslink.com/areas/dundee",
      },
    ],
    carSuitsWhen: [
      "Groups and families, where two or three coach fares each add up",
      "Pickups outside central Dundee, in Angus or north-east Fife",
      "Flight times that fall awkwardly between hourly coach departures",
      "Golf trips to Carnoustie or St Andrews with clubs as well as cases",
    ],
  },

  "aberdeen-to-edinburgh-airport": {
    lastChecked: LAST_CHECKED,
    verdict:
      "Be honest about the maths on a 124-mile journey: Ember's hourly electric coach goes to the terminal door and will cost one person far less than a private car. The car wins on time (about 2 hours 35 minutes against roughly 3 hours 30 minutes), on early departures, and as soon as there are three or four of you sharing.",
    options: [
      EMBER_E1,
      {
        kind: "train",
        operator: "ScotRail / LNER + Edinburgh Trams",
        service: "Aberdeen to Haymarket, then the tram",
        fare:
          "Neither operator publishes a fixed single for this route; the tram leg is £7.90",
        duration: "Rail to Haymarket plus a tram leg to the terminal",
        frequency: "Regular trains through the day",
        firstLast: "The tram limits it: nothing before 06:30 or after 22:52 from the airport",
        stops: "Aberdeen to Haymarket, then the tram from Haymarket to the terminal.",
        tradeOff:
          "Comfortable and often the quickest public option, but it is a change plus a tram, and the tram's operating hours rule it out for the early-morning flights most Aberdeen passengers take.",
        source: "https://www.scotrail.co.uk/tickets/off-peak-tickets",
      },
      {
        kind: "car",
        operator: "CabsLink",
        service: "Private car, door to terminal",
        fare: "Fixed price per car — see the fare table above",
        duration: "About 2 hours 35 minutes for 124 miles via the A90 and M90",
        frequency: "Booked to your flight, 24 hours",
        stops: "Any Aberdeen or Aberdeenshire address to the terminal, one vehicle throughout.",
        tradeOff:
          "Clearly the most expensive choice for a lone traveller. It is the practical one for a 06:00 flight, a group sharing, or an offshore crew change with kit bags.",
        source: "https://cabslink.com/areas/aberdeen",
      },
    ],
    carSuitsWhen: [
      "Flights departing before the coach or train network can get you there",
      "Three or four travellers sharing one fixed price",
      "Energy-sector and offshore travel with heavy kit and fixed crew-change times",
      "Pickups in Aberdeenshire rather than the city centre",
      "Anyone who does not want a 3.5-hour coach after a long-haul arrival",
    ],
  },

  "halbeath-park-and-ride-to-edinburgh-airport": {
    lastChecked: LAST_CHECKED,
    verdict:
      "If your flight sits inside the JET 747's operating window, park free at Halbeath and take the bus — nothing else comes close on cost. The reason this journey gets booked as a car is that the bus finishes in the early evening and does not start early enough for a first departure, and airport parking for a week costs more than the transfer.",
    options: [
      JET_747,
      {
        kind: "park-and-ride",
        operator: "Fife Council",
        service: "Halbeath Park & Ride car park",
        fare: "Free parking at Halbeath; you then pay only the onward bus fare",
        duration: "Immediately off the M90 at Junction 3",
        frequency: "Open access, then bus or coach connections to the terminal",
        stops: "Free car park with direct bus and coach links towards Edinburgh and the airport.",
        tradeOff:
          "Free parking is genuinely the cheapest way to leave a car for a trip — but you are still tied to the connecting timetable, and it does not help at 04:30.",
        source: "https://www.edinburghairport.com/transport-links/buses-and-coaches/fife-bus-links",
      },
      {
        kind: "car",
        operator: "CabsLink",
        service: "Private car, Halbeath or your door to the terminal",
        fare: "Fixed price per car — see the fare table above",
        duration: "About 25 minutes for 16 miles via the M90 and the Queensferry Crossing",
        frequency: "Booked to your flight, 24 hours",
        stops: "Named bay at Halbeath, or your Dunfermline or west Fife address.",
        tradeOff:
          "More than a bus fare. It covers the hours the 747 does not, and for a family it usually beats a week of airport parking.",
        source: "https://cabslink.com/routes/dunfermline-to-edinburgh-airport",
      },
    ],
    carSuitsWhen: [
      "Departures before 08:30 or arrivals after the last evening 747",
      "Families where four bus fares each way exceed one fixed car price",
      "Trips long enough that airport parking costs more than two transfers",
      "Queensferry Crossing wind-diversion days, when a driver reroutes and a bus timetable does not",
    ],
  },

  "glasgow-airport-to-edinburgh": {
    lastChecked: LAST_CHECKED,
    verdict:
      "There is no through public service from Glasgow Airport to Edinburgh. The cheap way is two legs: the £8.50 Airport Express 500 into Buchanan Bus Station, then a Citylink 900 coach or a train onwards. That works well with hand luggage and badly with a family and four cases, which is the honest case for a direct car.",
    options: [
      FIRST_500,
      {
        kind: "coach",
        operator: "Scottish Citylink",
        service: "900 Glasgow – Edinburgh",
        fare: "Citylink does not publish a fixed single fare — book on citylink.co.uk",
        duration: "Glasgow city centre to Edinburgh city centre",
        frequency: "Up to every 12 minutes at peak times",
        firstLast: "24-hour service",
        stops: "Buchanan Bus Station to Edinburgh Bus Station on St Andrew Square.",
        tradeOff:
          "Very frequent and inexpensive — but it is your second leg, after the 500, and you change with your luggage at Buchanan Street.",
        source: "https://www.citylink.co.uk/our-routes-and-timetables/glasgow-edinburgh/",
      },
      {
        kind: "car",
        operator: "CabsLink",
        service: "Private car, terminal to Edinburgh door",
        fare: "Fixed price per car — see the fare table above",
        duration: "About 1 hour 20 minutes for 55 miles via the M8",
        frequency: "Booked to your flight, 24 hours",
        stops: "Glasgow Airport arrivals to any Edinburgh address, no change.",
        tradeOff:
          "Two coach tickets are cheaper. One vehicle with no interchange is what you are paying for — and with three or four people the gap narrows sharply.",
        source: "https://cabslink.com/airports/glasgow-airport",
      },
    ],
    carSuitsWhen: [
      "Arrivals with luggage that would mean changing at Buchanan Bus Station",
      "Groups of three or more sharing one fixed fare",
      "Late arrivals and long-haul landings where a two-leg coach trip is unappealing",
      "Golf and ski groups, and anyone with oversized bags",
      "Corporate travel that needs a fixed arrival time and a receipt",
    ],
  },
};

export function getJourneyTransport(slug: string): JourneyTransportComparison | null {
  return JOURNEY_TRANSPORT[slug] ?? null;
}
