/**
 * Code-defined editorial guides served at `/guides/:slug`.
 *
 * These take precedence over any `destinations` row of type `guide` with the
 * same slug. They exist in code because they are long-form, hand-verified
 * reference pages rather than templated location content.
 *
 * RULES:
 *  - Nothing here is generated from a template. If a guide would only restate
 *    another with a place name swapped, it does not get written.
 *  - Fares, admission prices, journey times and timetables are the operator's
 *    or attraction's own published figures, each with a source URL. Anything
 *    unverifiable is left out, not estimated.
 *  - `lastChecked` is surfaced on the page, with a note that prices change.
 */
import { JOURNEY_TRANSPORT, type JourneyTransportComparison } from "@/lib/seo/transport-modes";

export type GuideSection = {
  heading: string;
  /** Paragraphs of body copy. */
  body: string[];
  /** Optional bullet list rendered after the paragraphs. */
  bullets?: string[];
};

export type DayTripEntry = {
  name: string;
  /** Road distance from Edinburgh in miles. */
  miles: number;
  /** Typical driving time, e.g. "1h 10m". */
  driveTime: string;
  /** How long the trip realistically needs, e.g. "Half day". */
  timeNeeded: string;
  /** Two or three concrete facts. No adjectives-only copy. */
  whatsThere: string;
  /** Honest public transport answer, including when there isn't a good one. */
  publicTransport: string;
  /** Admission or price detail, only when published. */
  admission?: string;
  /** Our matching tour page, when one genuinely exists. */
  tourSlug?: string;
  /** Journey page for the same corridor, when one exists. */
  routeSlug?: string;
  /** Source for the facts above. */
  source?: string;
};

export type GuideRecord = {
  slug: string;
  /** Kept out of the sitemap and served noindex while awaiting sign-off. */
  review?: boolean;
  /** On-page H1. */
  h1: string;
  metaTitle: string;
  metaDescription: string;
  /** Short label used in listings. */
  cardTitle: string;
  cardBlurb: string;
  /** ISO date the figures in this guide were verified. */
  lastChecked: string;
  /** Lead paragraphs. */
  intro: string[];
  /** Optional mode-by-mode comparison table (same component as route pages). */
  comparison?: JourneyTransportComparison;
  /** Optional day-trip listing. */
  dayTrips?: DayTripEntry[];
  /** Prose sections rendered after the comparison / listing. */
  sections?: GuideSection[];
  faqs: { q: string; a: string }[];
  /** Internal links out of the guide. */
  related?: { label: string; to: string }[];
};

const LAST_CHECKED = "2026-09-01";

export const GUIDES: GuideRecord[] = [
  {
    slug: "edinburgh-airport-to-city-centre",
    h1: "Edinburgh Airport to the city centre: every option, honestly compared.",
    metaTitle: "Edinburgh Airport to City Centre: Tram, Bus or Taxi",
    metaDescription:
      "Tram £7.90, Airlink bus £6.00 or a fixed-price taxi — real fares, times and first/last departures for getting from Edinburgh Airport into the city centre.",
    cardTitle: "Edinburgh Airport to the city centre",
    cardBlurb:
      "Tram, bus and taxi compared with the operators' own published fares, journey times and first and last departures.",
    lastChecked: LAST_CHECKED,
    intro: [
      "Ten miles separate Edinburgh Airport from Princes Street, and there are three sensible ways to cover them: the tram, the Airlink 100 bus, or a car. This guide gives the real fares and times so you can pick on facts rather than on whoever shouts loudest in the arrivals hall.",
      "The short version: if you are travelling light between 06:30 and 22:52 and staying near the tram line, public transport is much cheaper and about as fast. The Airlink bus is the cheapest option at £6.00 and runs 24 hours. A car is worth its price when your flight is outside tram hours, when there are three or four of you, when you have a child who needs a proper seat, or when your address is up a set of Old Town steps.",
      "We run airport transfers for a living, so treat the section on when a car makes sense as what it is — our own case, stated plainly, next to the cheaper alternatives.",
    ],
    comparison: JOURNEY_TRANSPORT["edinburgh-airport-to-city-centre"],
    sections: [
      {
        heading: "Where each option actually leaves you",
        body: [
          "Fares get quoted endlessly online; end points rarely do, and the end point is what decides whether the journey feels easy. The tram has its own stop at the terminal and runs to Princes Street, St Andrew Square and York Place, continuing to Newhaven. That is excellent for a New Town hotel and poor for the Grassmarket, where you finish with a case over setted streets.",
          "The Airlink 100 leaves the terminal forecourt and terminates at Waverley Bridge, directly above Waverley station — the shortest walk to a train platform of any option. It also runs all night, which the tram does not.",
          "A car goes to the door you booked. In August that is not always the door you expected: large parts of the Old Town are closed to traffic during the festival, so we confirm an open street with you rather than driving into a barrier.",
        ],
        bullets: [
          "New Town, Haymarket, Murrayfield or Leith Walk: the tram is hard to beat.",
          "Onward train from Waverley: the Airlink bus stops closest.",
          "Old Town, Grassmarket, Stockbridge, Dean Village: expect a walk over setts from any public stop.",
          "Flights landing after 22:52 or leaving before 06:30: the tram is not running.",
        ],
      },
      {
        heading: "The awkward hours",
        body: [
          "Edinburgh's tram service is not a 24-hour operation. The first tram from the airport is 06:30 and the last is 22:52. A lot of budget-airline schedules sit outside that window, which is where the Airlink bus and a pre-booked car divide the traffic: the bus runs 24 hours a day at up to every 20 minutes overnight, and a car runs whenever your flight lands.",
          "If you are on a 06:00 departure you need to be at the terminal around 04:30, and no tram will do that. The Airlink will, for £6.00, if you can get to Waverley Bridge or one of its stops with your luggage at that hour.",
        ],
      },
      {
        heading: "When the maths flips in favour of a car",
        body: [
          "For one person the tram or bus wins on price every time and we will not pretend otherwise. The comparison changes with headcount: four adults on Airlink returns is £34.00, and four Airport Open Returns on the tram is £38.00. At that point a single fixed car fare for the group is competitive, and it is door to door with the bags in the boot.",
          "It also changes with what you are carrying. Two large cases per person, a set of golf clubs or a bike box are not a bus problem you want at 06:00.",
        ],
      },
    ],
    faqs: [
      {
        q: "How much is the tram from Edinburgh Airport to the city centre?",
        a: "An Airport Single is £7.90 and an Airport Open Return is £9.50. The journey takes about 30 minutes to the city centre, with trams every 7 minutes. The first tram from the airport is 06:30 and the last is 22:52.",
      },
      {
        q: "How much is the Airlink bus?",
        a: "The Airlink 100 is £6.00 for an adult single and £8.50 return, with child fares of £3.00 single and £4.25 return, and a family return at £22.00. It takes about 30 minutes to Waverley Bridge and runs 24 hours a day.",
      },
      {
        q: "Is the tram or the bus better?",
        a: "The bus is cheaper and runs all night, and it stops closer to Waverley station. The tram has level boarding, is unaffected by road traffic and serves the New Town and Leith directly. For a Waverley train, take the bus; for a New Town hotel in daylight hours, take the tram.",
      },
      {
        q: "How much is a taxi from Edinburgh Airport to the city centre?",
        a: "CabsLink quotes a fixed price per vehicle before you book, shown on our Edinburgh Airport route page. It is more than a £6.00 bus fare for a solo traveller — the case for it is groups, early or late flights, child seats and addresses the tram and bus do not reach.",
      },
      {
        q: "How long does it take to get from Edinburgh Airport to the city centre?",
        a: "About 30 minutes by tram, about 30 minutes by Airlink bus, and around 33 minutes by car off-peak for the 10-mile drive. Expect 45 to 60 minutes by road at rush hour or during the August festival.",
      },
    ],
    related: [
      { label: "Edinburgh Airport transfers", to: "/airports/edinburgh-airport" },
      { label: "Airport to city centre fares", to: "/routes/edinburgh-airport-to-city-centre" },
      { label: "Day trips from Edinburgh", to: "/guides/day-trips-from-edinburgh" },
      { label: "Private tours from Edinburgh", to: "/tours" },
    ],
  },

  {
    slug: "day-trips-from-edinburgh",
    h1: "15 day trips from Edinburgh, with real distances and honest transport advice.",
    metaTitle: "15 Best Day Trips From Edinburgh (2026 Guide)",
    metaDescription:
      "Fifteen day trips from Edinburgh with real road distances, driving times, what is actually there and whether the train or bus is the better option.",
    cardTitle: "Day trips from Edinburgh",
    cardBlurb:
      "Fifteen destinations within day-trip range, with real road distances, honest public transport notes and which need a car.",
    lastChecked: LAST_CHECKED,
    intro: [
      "Edinburgh is an unusually good base: castles, coastline, distilleries and genuine Highland scenery all sit inside a day's return. But some of the trips sold as day trips are not sensible ones, and some are easier by train than by any car.",
      "Every distance below is a real road distance from the city centre and every driving time is a realistic off-peak figure, not a best case. Where the train or bus is the better answer, it says so — Stirling, North Berwick, Linlithgow and Glasgow are all straightforward on public transport, and paying for a car to reach them is usually unnecessary.",
      "The trips worth a private car are the ones public transport handles badly: multi-stop days, west Highland scenery, distilleries where somebody has to drive, and anything with young children or a group. Two places often marketed as day trips — Skye and Glenfinnan — are left out deliberately, and the last section explains why.",
    ],
    dayTrips: [
      {
        name: "Stirling",
        miles: 36,
        driveTime: "1h",
        timeNeeded: "Full day",
        whatsThere:
          "Stirling Castle on its volcanic crag, the Wallace Monument across the valley, and the Bannockburn battlefield site south of town. The castle and monument together fill a day without rushing.",
        publicTransport:
          "Excellent. Direct ScotRail trains from Waverley take under an hour and drop you a 15-minute walk below the castle. You do not need a car for Stirling alone.",
        admission:
          "Stirling Castle is a Historic Environment Scotland site with a standard admission charge — check the current price at historicenvironment.scot",
        tourSlug: "stirling-and-doune-castles-day",
        source: "https://www.historicenvironment.scot/visit-a-place/places/stirling-castle/",
      },
      {
        name: "The Kelpies and the Falkirk Wheel",
        miles: 24,
        driveTime: "40m",
        timeNeeded: "Half day",
        whatsThere:
          "Andy Scott's 30-metre horse-head sculptures at Helix Park, and the world's only rotating boat lift four miles away. Seeing both in one afternoon is comfortable by car and fiddly without one.",
        publicTransport:
          "Trains run to Falkirk Grahamston, but the Kelpies and the Wheel are on opposite sides of town, so you will need a local bus or taxi between them. This is the trip where a car saves the most faff.",
        admission:
          "Walking up to the Kelpies and viewing the Falkirk Wheel are free; boat trips on the Wheel are ticketed via scottishcanals.co.uk",
        tourSlug: "falkirk-icons-half-day",
        source: "https://www.scottishcanals.co.uk/falkirk-wheel/",
      },
      {
        name: "St Andrews",
        miles: 53,
        driveTime: "1h 20m",
        timeNeeded: "Full day",
        whatsThere:
          "The Old Course and its clubhouse, a ruined cathedral and castle on the cliff, Scotland's oldest university and the West Sands beach from Chariots of Fire.",
        publicTransport:
          "Awkward. There is no station in St Andrews — trains go to Leuchars and you take a bus for the last five miles. Fine if you are unhurried, less so with golf clubs.",
        tourSlug: "fife-coastal-heritage",
        routeSlug: "edinburgh-airport-to-st-andrews",
        source: "https://www.standrews.com/",
      },
      {
        name: "Glasgow",
        miles: 46,
        driveTime: "1h 10m",
        timeNeeded: "Full day",
        whatsThere:
          "Kelvingrove Art Gallery, the Riverside Museum, the Mackintosh buildings and the best shopping in Scotland. A different city entirely, not a smaller Edinburgh.",
        publicTransport:
          "Take the train. Queen Street services run every 15 minutes and beat driving on time and cost, and Glasgow's Low Emission Zone makes city-centre parking a needless problem.",
        routeSlug: "edinburgh-to-glasgow",
        source: "https://peoplemakeglasgow.com/",
      },
      {
        name: "Loch Lomond and the Trossachs",
        miles: 71,
        driveTime: "1h 40m",
        timeNeeded: "Full day",
        whatsThere:
          "Britain's largest freshwater loch by surface area, with Balloch and Luss on the west shore, the quieter east side at Balmaha, and Aberfoyle and the Duke's Pass in the Trossachs behind it.",
        publicTransport:
          "You can reach Balloch by train via Glasgow, but the loch's best parts — Luss, Balmaha, the Duke's Pass — are not walkable from a station. A car or a tour is the realistic way to see more than one point on it.",
        tourSlug: "highlands-escape-loch-lomond-trossachs",
        source: "https://www.lochlomond-trossachs.org/",
      },
      {
        name: "North Berwick and the Bass Rock",
        miles: 28,
        driveTime: "45m",
        timeNeeded: "Half day",
        whatsThere:
          "A working harbour town with two sandy beaches, the Scottish Seabird Centre and live camera views of the world's largest northern gannet colony on the Bass Rock offshore.",
        publicTransport:
          "Very good. Direct trains from Waverley take about 35 minutes and the station is a 10-minute walk from the harbour. No car needed.",
        admission:
          "The Scottish Seabird Centre charges admission and runs separate boat trips — prices at seabird.org",
        source: "https://www.seabird.org/",
      },
      {
        name: "Rosslyn Chapel",
        miles: 8,
        driveTime: "25m",
        timeNeeded: "Half day",
        whatsThere:
          "A 15th-century collegiate chapel at Roslin, carved to an obsessive degree inside, and known well beyond Scotland since The Da Vinci Code. Roslin Glen and Hawthornden woods are next door.",
        publicTransport:
          "Straightforward: Lothian bus 37 from the city centre runs to Roslin and takes about 45 minutes.",
        admission: "Rosslyn Chapel charges admission; current prices at rosslynchapel.com",
        tourSlug: "edinburgh-castles-heritage-trail",
        source: "https://www.rosslynchapel.com/",
      },
      {
        name: "Linlithgow Palace",
        miles: 18,
        driveTime: "35m",
        timeNeeded: "Half day",
        whatsThere:
          "The roofless birthplace of Mary, Queen of Scots, on a loch in the middle of a small town, with the Union Canal and the House of the Binns nearby.",
        publicTransport:
          "Easy. Trains from Waverley take about 20 minutes and the palace is a short walk uphill from the station.",
        admission:
          "Historic Environment Scotland site with a standard admission charge — access can be restricted for masonry works, so check before travelling",
        tourSlug: "royal-palaces-of-scotland",
        source: "https://www.historicenvironment.scot/visit-a-place/places/linlithgow-palace/",
      },
      {
        name: "Culross and the Fife coast villages",
        miles: 23,
        driveTime: "45m",
        timeNeeded: "Half day",
        whatsThere:
          "A preserved 17th-century burgh of ochre-walled houses and cobbled wynds, used as Cranesmuir in Outlander, with Culross Palace and the abbey above the village.",
        publicTransport:
          "Poor. There is no station and bus links are infrequent, which is precisely why Culross still looks like this. A car or a tour is the practical option.",
        admission: "Culross Palace is a National Trust for Scotland property — prices at nts.org.uk",
        tourSlug: "lallybroch-outlander-half-day",
        source: "https://www.nts.org.uk/visit/places/culross",
      },
      {
        name: "Anstruther and the East Neuk",
        miles: 49,
        driveTime: "1h 20m",
        timeNeeded: "Full day",
        whatsThere:
          "A string of fishing villages — Anstruther, Crail, Pittenweem, St Monans — with the Scottish Fisheries Museum, boat trips to the Isle of May seabird reserve in season, and a much-argued-over fish and chip shop on the harbour.",
        publicTransport:
          "Limited. Trains reach Leuchars or Kirkcaldy and buses cover the rest slowly. The East Neuk rewards driving between villages.",
        tourSlug: "fife-coastal-heritage",
        source: "https://www.scotfishmuseum.org/",
      },
      {
        name: "Dundee and the V&A",
        miles: 56,
        driveTime: "1h 20m",
        timeNeeded: "Full day",
        whatsThere:
          "Kengo Kuma's V&A Dundee on the waterfront, Captain Scott's RRS Discovery moored beside it, and the Verdant Works jute museum in the city.",
        publicTransport:
          "Good. Trains from Waverley take about 75 minutes and the V&A is a five-minute walk from the station. General admission to the V&A is free.",
        admission: "V&A Dundee general admission is free; some exhibitions are ticketed",
        routeSlug: "dundee-to-edinburgh-airport",
        source: "https://www.vam.ac.uk/dundee",
      },
      {
        name: "Pitlochry and Blair Athol Distillery",
        miles: 70,
        driveTime: "1h 40m",
        timeNeeded: "Full day",
        whatsThere:
          "A Victorian Highland town with a working distillery in walking distance of the station, the salmon ladder at the dam, and the Pass of Killiecrankie and Blair Castle a short drive north.",
        publicTransport:
          "Better than you would expect: direct trains from Waverley take about 1 hour 50 minutes and Blair Athol Distillery is a 10-minute walk from Pitlochry station. If a whisky tour is the point, this is the one to do by train.",
        admission: "Distillery tours are ticketed and should be booked ahead at malts.com",
        source: "https://www.malts.com/en-gb/distilleries/blair-athol",
      },
      {
        name: "Melrose Abbey and the Borders",
        miles: 40,
        driveTime: "1h 5m",
        timeNeeded: "Full day",
        whatsThere:
          "A red sandstone abbey said to hold Robert the Bruce's heart, Scott's View over the Eildon Hills, and Abbotsford, Walter Scott's own house, four miles west.",
        publicTransport:
          "The Borders Railway runs to Tweedbank, about a mile and a half from Melrose, with a bus link. Doable by train; the surrounding sights are not.",
        admission:
          "Melrose Abbey is a Historic Environment Scotland site with a standard admission charge; parts have had access restrictions for high-level masonry inspections",
        source: "https://www.historicenvironment.scot/visit-a-place/places/melrose-abbey/",
      },
      {
        name: "Glencoe",
        miles: 116,
        driveTime: "2h 45m",
        timeNeeded: "Long full day",
        whatsThere:
          "The Three Sisters ridge, the Pass of Glencoe and Rannoch Moor before it — the most dramatic scenery reachable from Edinburgh in a day, and the point at which a day trip becomes a genuinely long day.",
        publicTransport:
          "Not realistic as a day trip. Citylink coaches serve Glencoe but the timings leave almost no daylight on the ground. This is a car or small-group tour trip, and you should expect 11 hours door to door.",
        tourSlug: "glencoe-highlands-private-day",
        routeSlug: "edinburgh-to-fort-william",
        source: "https://www.glencoescotland.com/",
      },
      {
        name: "Loch Ness and Inverness",
        miles: 156,
        driveTime: "3h 25m",
        timeNeeded: "Very long full day",
        whatsThere:
          "Urquhart Castle above the loch, boat trips from Drumnadrochit, and the A9 route north through the Cairngorms to get there.",
        publicTransport:
          "Trains reach Inverness in about 3.5 hours, but you then need onward transport to the loch itself. Feasible as a day return only if you start very early — an overnight stay is the honest recommendation.",
        admission:
          "Urquhart Castle is a Historic Environment Scotland site with timed tickets in summer — book ahead",
        routeSlug: "edinburgh-to-inverness",
        source: "https://www.historicenvironment.scot/visit-a-place/places/urquhart-castle/",
      },
    ],
    sections: [
      {
        heading: "What we left out, and why",
        body: [
          "The Isle of Skye is 230 miles from Edinburgh. Operators sell it as a day trip; it involves roughly 11 hours in a vehicle for perhaps two hours of stopping, and we do not recommend it as one. Glenfinnan is the same problem in a slightly shorter form — the viaduct is spectacular, but timing a day around one steam train crossing while covering 250 miles of driving is not a good day out.",
          "We have also left out places within Edinburgh's own boundary. Cramond, Portobello, Arthur's Seat and the Royal Botanic Garden are all excellent, but they are afternoons out rather than day trips, and no transfer is needed for any of them.",
        ],
        bullets: [
          "Skye: 230 miles each way — better as two or three days.",
          "Glenfinnan: possible but built around a single train time.",
          "Applecross and Torridon: too far for a day return in any season.",
          "Anywhere in Edinburgh itself: walk, or take a Lothian bus.",
        ],
      },
      {
        heading: "Which trips genuinely need a car",
        body: [
          "Four of the fifteen have public transport so good that hiring anything is a waste of money: Glasgow, Stirling, North Berwick and Linlithgow. Dundee and Pitlochry are close behind, both with the main attraction a short walk from the station.",
          "The trips that repay a private driver are the multi-stop ones and the remote ones. Falkirk needs two stops on opposite sides of town. The East Neuk is a chain of villages. Culross has next to no bus service. Loch Lomond's best viewpoints are not at its railway station. Glencoe is 116 miles each way with nothing useful at either end of a coach timetable. And a distillery day is the clearest case of all, because somebody has to drive.",
        ],
        bullets: [
          "Take the train: Glasgow, Stirling, North Berwick, Linlithgow, Dundee, Pitlochry.",
          "Car or tour strongly preferred: Falkirk, Culross, the East Neuk, Loch Lomond, Glencoe.",
          "Overnight rather than a day trip: Loch Ness, and anywhere on Skye.",
        ],
      },
      {
        heading: "How a private day out is priced",
        body: [
          "Our tours are priced per vehicle for the day, not per person, so a family of four pays the same as a couple. You keep the same driver and vehicle throughout and stops are yours to change on the day within the hours booked.",
          "If a fixed one-way transfer is all you need — a drop at St Andrews, say, or a pickup from Stirling — that is quoted as a journey instead, which is cheaper than a day hire. Ask for whichever fits, and we will tell you if the train would be better.",
        ],
      },
    ],
    faqs: [
      {
        q: "What is the best day trip from Edinburgh?",
        a: "For scenery, Loch Lomond and the Trossachs at 71 miles, or Glencoe at 116 miles if you accept a long day. For history with minimal effort, Stirling — under an hour by direct train. For a half day, the Kelpies and the Falkirk Wheel, 24 miles away.",
      },
      {
        q: "Can you do Loch Ness as a day trip from Edinburgh?",
        a: "It is possible but demanding: 156 miles each way, about 3 hours 25 minutes of driving in each direction. You will spend roughly seven hours travelling. Most people are happier making it an overnight trip, or choosing Loch Lomond instead.",
      },
      {
        q: "Is the Isle of Skye a realistic day trip from Edinburgh?",
        a: "No. Skye is around 230 miles from Edinburgh, roughly 11 hours of driving for a return trip. We do not sell it as a day tour. Two or three days does it justice.",
      },
      {
        q: "Which day trips can I do by train from Edinburgh?",
        a: "Glasgow, Stirling, North Berwick, Linlithgow, Dundee, Perth, Pitlochry and Falkirk Grahamston all have direct services from Waverley, and in most cases the main attraction is a short walk from the station.",
      },
      {
        q: "How much does a private day tour from Edinburgh cost?",
        a: "Day tours are priced per vehicle rather than per person, and the price depends on the vehicle class and the hours booked. Our tours pages show a starting price for each itinerary, and a fixed quote is confirmed before you pay anything.",
      },
      {
        q: "Do I need to book attraction tickets separately?",
        a: "Yes. Admission to castles, distilleries and museums is paid to the attraction, and popular sites such as Urquhart Castle and distillery tours use timed tickets that sell out in summer. Book those before your travel date.",
      },
    ],
    related: [
      { label: "Private tours from Edinburgh", to: "/tours" },
      { label: "Whisky distillery tours", to: "/distilleries" },
      { label: "Scottish attractions", to: "/attractions" },
      { label: "Airport to city centre guide", to: "/guides/edinburgh-airport-to-city-centre" },
    ],
  },
];


export function getGuide(slug: string): GuideRecord | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function guidePath(slug: string): string {
  return `/guides/${slug}`;
}

/** Guides advertised in the sitemap — review drafts are excluded. */
export function publishedGuidePaths(): string[] {
  return GUIDES.filter((g) => !g.review).map((g) => guidePath(g.slug));
}

export function publishedGuides(): GuideRecord[] {
  return GUIDES.filter((g) => !g.review);
}
