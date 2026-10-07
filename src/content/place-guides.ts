/**
 * Phase 7 — hand-written, page-specific guide text appended BELOW the
 * existing content of destination pages. Nothing here replaces a title,
 * H1, canonical or existing copy.
 *
 * Fact sources only: the page's own destination row (town, region, IATA,
 * nearby places), published `seo_popular_routes` rows (distance, drive time,
 * route notes), live vehicle_classes capacities, and site-wide facts in
 * src/lib/site-facts.ts. Fares are never typed here — they are computed
 * live from the pricing engine for the linked routes.
 *
 * `needsOwnerFact` lists facts the page should carry but which are not
 * stored anywhere yet; they are reported to the owner, never guessed.
 */
export type PlaceGuideSection = { heading: string; paragraphs: string[] };
export type PlaceGuide = {
  path: string;
  sections: PlaceGuideSection[];
  /** Published seo_popular_routes slugs whose live fares are shown. */
  routeSlugs?: string[];
  needsOwnerFact?: string[];
};

const FLEET_LINE =
  "Our saloons carry up to four passengers with two large cases, the Estate Car takes four passengers with three cases, the Standard MPV four passengers with four cases, the Seven-Seater MPV six passengers with three cases, the Premium MPV seven passengers with seven cases and the Eight-Seater Van eight passengers with eight cases.";

export const PLACE_GUIDES: PlaceGuide[] = [
  {
    path: "/airports/edinburgh-airport",
    routeSlugs: ["edinburgh-airport-to-city-centre", "edinburgh-airport-to-st-andrews", "edinburgh-airport-to-gleneagles"],
    sections: [
      {
        heading: "Getting from Edinburgh Airport into the city",
        paragraphs: [
          "Edinburgh Airport (EDI) is our home airport and the start of more Cabslink journeys than anywhere else. The run into the city centre is about 10 miles and usually takes around 33 minutes, following the A8 Glasgow Road through Corstorphine and Haymarket. In August, when the festival fills the streets, that same drive takes longer, so we suggest allowing extra time if you are heading to a hotel near the Royal Mile or Princes Street.",
          "Because the fare is fixed when you book, a slow crawl along the A8 does not change what you pay. The live fares shown below come from the same pricing engine that quotes your booking.",
        ],
      },
      {
        heading: "Longer journeys that start at the terminal",
        paragraphs: [
          "Many guests land at EDI and drive straight on. St Andrews is about 48 miles away over the Queensferry Crossing and the A91, roughly 80 minutes once golf bags are loaded. Gleneagles is about 40 miles via the M9, A9 and A823 into Auchterarder, normally around 55 minutes. Coming the other way, Dunfermline is about 12 miles and 23 minutes from the terminal, Livingston about 11 miles, Stirling about 28 miles and Dundee about 50 miles.",
          "Close to the runway sit RBS Gogarburn and Edinburgh Park, two business locations we serve on short hops, and South Queensferry, where cruise passengers transfer between ship and plane.",
        ],
      },
      {
        heading: "Choosing the right car for your party",
        paragraphs: [
          `Golf trips and family holidays often need more boot space than people expect. ${FLEET_LINE} Child seats can be added during booking.`,
          "Meet and greet is included on airport pickups: your driver waits in arrivals with a name board, and we track your flight so the pickup time follows your actual landing.",
        ],
      },
    ],
  },
  {
    path: "/airports/glasgow-airport",
    routeSlugs: ["glasgow-airport-to-loch-lomond"],
    sections: [
      {
        heading: "Glasgow Airport and the road to Loch Lomond",
        paragraphs: [
          "Glasgow Airport (GLA) sits in Paisley, west of the city, which makes it the natural gateway for travellers heading to the west of Scotland. Our most-booked journey from here is the run to Loch Lomond: about 20 miles from the terminal to Balloch along the A82 through Dumbarton, usually about 35 minutes. It is a short enough drive to reach the loch shore within an hour of collecting your bags.",
          "That route has a live fixed fare for every vehicle class, shown below and calculated by the same engine used at checkout.",
        ],
      },
      {
        heading: "Places nearby that we drive to often",
        paragraphs: [
          "Students and visiting families arrive at GLA for the University of Glasgow, and patients and relatives use our cars for the Queen Elizabeth University Hospital. Whisky visitors often add Auchentoshan Distillery, one of the closest distilleries to the airport, to the first afternoon of a trip.",
          "If your plans take you east instead, we also run journeys between Glasgow and Edinburgh Airport: about 55 miles along the M8, leaving at Newbridge for the terminal, typically around 75 minutes.",
        ],
      },
      {
        heading: "Who books Glasgow Airport transfers",
        paragraphs: [
          "Hikers with rucksacks bound for the West Highland Way, couples starting a Loch Lomond break and business travellers with meetings in the city all use this airport. For larger parties the Seven-Seater MPV takes six passengers and three large cases, while the Eight-Seater Van takes eight passengers and eight cases.",
          "Your driver meets you in arrivals with a name board, and the price you see when you book is the price you pay.",
        ],
      },
    ],
    needsOwnerFact: ["Distance and drive time from central Edinburgh (no published Edinburgh city centre ↔ Glasgow Airport route)"],
  },
  {
    path: "/airports/aberdeen-airport",
    sections: [
      {
        heading: "Arriving at Aberdeen Airport",
        paragraphs: [
          "Aberdeen Airport (ABZ) serves the city of Aberdeen and the north-east of Scotland. Plenty of our passengers here are travelling for work, so the pickup is built around a predictable routine: we follow the flight, the driver waits in arrivals with your name, and you know the fare before you land.",
          "From the terminal, Aberdeen city itself is the most common drop-off, whether that is a hotel, an office or a family home.",
        ],
      },
      {
        heading: "Whisky country within reach",
        paragraphs: [
          "Aberdeen is also a practical starting point for Speyside. Two of the distilleries most often paired with this airport on our site are Glenfiddich and The Macallan, and a private car lets a group visit both without anyone needing to drive after a tasting. We price these as fixed journeys, so ask for a quote with each stop added.",
          "Visitors flying in for a whisky trip usually travel light on the way out and heavy on the way back, so it is worth picking a car with spare boot space.",
        ],
      },
      {
        heading: "Picking a vehicle",
        paragraphs: [
          `${FLEET_LINE} For a work trip one person rarely needs more than a saloon; for a group of colleagues the Seven-Seater MPV keeps everyone in one car.`,
          "Child seats, extra stops and return journeys can all be added while you book.",
        ],
      },
    ],
    needsOwnerFact: ["Distance and drive time from central Edinburgh", "Fixed fares to/from Aberdeen Airport (no published route)", "Pickup point at the terminal"],
  },
  {
    path: "/airports/inverness-airport",
    sections: [
      {
        heading: "Inverness Airport, gateway to the Highlands",
        paragraphs: [
          "Inverness Airport (INV) is the Highlands airport, and for many of our passengers it is the start of a holiday rather than a business trip. The first drive is usually into Inverness itself, where people pick up a hire car, check into a hotel or meet friends before heading further north and west.",
          "Booking a car ahead means you are not relying on a taxi rank after a late flight, and the price is agreed before you set off.",
        ],
      },
      {
        heading: "Distilleries north of the airport",
        paragraphs: [
          "Two distilleries linked to this page are Glenmorangie and Dalmore, both popular with visitors who want to see whisky made in the Highlands. A private driver means everyone in the group can enjoy the tasting. Ask us for a fixed quote with both stops on the same day.",
          "Highland roads can be slow, so plan visits with plenty of time between them.",
        ],
      },
      {
        heading: "Travelling with outdoor kit",
        paragraphs: [
          "Walkers, cyclists and anglers often arrive here with bulky bags. The Standard MPV carries four passengers with four large cases, the Premium MPV seven passengers with seven cases, and the Eight-Seater Van eight passengers with eight cases — useful when a group shares one car.",
          "Your driver waits in arrivals with a name board, and we follow your flight in case it is early or late.",
        ],
      },
    ],
    needsOwnerFact: ["Distance and drive time from central Edinburgh", "Fixed fares to/from Inverness Airport (no published route)", "Pickup point at the terminal"],
  },
  {
    path: "/airports/dundee-airport",
    routeSlugs: ["dundee-to-edinburgh-airport"],
    sections: [
      {
        heading: "Dundee Airport and the Tay",
        paragraphs: [
          "Dundee Airport (DND) is a small airport on the edge of Dundee. Because it is close to the city, most pickups here are short drops into Dundee, but we also connect it with the wider east coast of Scotland.",
          "St Andrews and the University of St Andrews are both linked to this page, and students arriving at the start of term often book a car for themselves and their luggage rather than juggling buses with heavy cases.",
        ],
      },
      {
        heading: "Connecting Dundee with Edinburgh Airport",
        paragraphs: [
          "When a flight is not available from Dundee, many people fly from Edinburgh instead. Our Dundee to Edinburgh Airport route is about 50 miles via the A90, M90 and the Queensferry Crossing, usually around 70 minutes. Queues at Ferrytoll in the weekday morning peak are the main thing that slows it down, so early departures need a little extra time.",
          "The fixed fares for that journey are listed below, worked out live for each vehicle class.",
        ],
      },
      {
        heading: "Who this suits",
        paragraphs: [
          "Students moving into halls, golfers heading for St Andrews and families visiting relatives in Dundee make up most of our bookings here. For a student with a full term's belongings, the Estate Car takes four passengers with three large cases and the Standard MPV four passengers with four cases.",
          "You can add child seats and extra stops while booking, and the price stays fixed.",
        ],
      },
    ],
    needsOwnerFact: ["Distance and drive time from central Edinburgh", "Pickup point at the terminal"],
  },
  {
    path: "/airports/prestwick-airport",
    sections: [
      {
        heading: "Glasgow Prestwick on the Ayrshire coast",
        paragraphs: [
          "Glasgow Prestwick Airport (PIK) is in Prestwick, on the Ayrshire coast, rather than in Glasgow itself. That surprises some first-time visitors, which is one reason people pre-book a car: you know exactly how you are getting from the terminal to where you are staying.",
          "Ayr, the nearest large town, is linked to this page and is a common first stop for golfers and holidaymakers.",
        ],
      },
      {
        heading: "Moving between Prestwick and Glasgow",
        paragraphs: [
          "Some trips start at Prestwick and finish in Glasgow, or the other way round. Glasgow Airport is linked to this page as a nearby airport, and we also drive families visiting the Queen Elizabeth University Hospital. A fixed fare is useful here because the journey crosses several council areas.",
          "Ask for a quote with the exact address and you will see the price for every vehicle class before you pay.",
        ],
      },
      {
        heading: "Golf bags and holiday luggage",
        paragraphs: [
          "Ayrshire attracts golfers, and golf bags take up more room than a suitcase. The Standard MPV carries four people with four large cases, and the Premium MPV seven people with seven cases. For a single traveller, a saloon is enough.",
          "Your driver meets you in arrivals with a name board, and we follow the flight so an early landing is not a problem.",
        ],
      },
    ],
    needsOwnerFact: ["Distance and drive time from central Edinburgh", "Fixed fares to/from Prestwick Airport (no published route)", "Pickup point at the terminal"],
  },
  {
    path: "/airports/newcastle-airport",
    sections: [
      {
        heading: "Newcastle Airport for travellers heading north",
        paragraphs: [
          "Newcastle Airport (NCL) serves Newcastle upon Tyne and the north-east of England. For Cabslink it is a cross-border airport: some passengers land here and travel north into Scotland, while others live in the Borders or the Lothians and find a Newcastle flight suits their plans better than one from Edinburgh.",
          "A long drive like this is exactly where a fixed fare helps, because you know the full cost before setting off.",
        ],
      },
      {
        heading: "Edinburgh links on this page",
        paragraphs: [
          "This page links to the Edinburgh BioQuarter, where researchers and hospital visitors travel, and Glenkinchie Distillery in East Lothian, a popular stop for whisky visitors. Leeds Bradford Airport is also linked for people comparing flight options in the north of England.",
          "Tell us both addresses when you book and we will quote the journey as one fixed price.",
        ],
      },
      {
        heading: "Comfort over a longer distance",
        paragraphs: [
          "On a long trip, space matters more than on a short city hop. The Executive Saloon and Luxury Saloon suit business travellers who want a quieter ride, while the Premium MPV takes seven passengers and seven large cases for a family heading home together.",
          "Your driver waits in arrivals with a name board, and we follow your flight in case it lands early or late.",
        ],
      },
    ],
    needsOwnerFact: ["Distance and drive time from central Edinburgh", "Fixed fares to/from Newcastle Airport (no published route)", "Pickup point at the terminal"],
  },
  {
    path: "/airports/manchester-airport",
    sections: [
      {
        heading: "Manchester Airport, a long-haul alternative",
        paragraphs: [
          "Manchester Airport (MAN) is one of the busiest airports in the north of England, and some Scottish travellers choose it for long-haul routes. Cabslink handles this as a pre-booked, long-distance private transfer: one car, one driver and one fixed price from your door to the terminal.",
          "Long-distance bookings are planned in advance, so please book early so we can arrange the driver and vehicle.",
        ],
      },
      {
        heading: "Other airports in the area",
        paragraphs: [
          "This page links to Birmingham, Liverpool and Leeds Bradford airports, which travellers often compare with Manchester when choosing flights. If your flight changes from one to another, change your booking address and the fare is recalculated before you confirm.",
          "We are a private-hire company, not a shuttle, so the car is only for you and your group.",
        ],
      },
      {
        heading: "Families and groups on long journeys",
        paragraphs: [
          `${FLEET_LINE} On a trip this long, a car with spare room is usually more comfortable than a full one.`,
          "Child seats can be added during booking, and meet and greet is included when we collect you from arrivals.",
        ],
      },
    ],
    needsOwnerFact: ["Distance and drive time from central Edinburgh", "Fixed fares to/from Manchester Airport (no published route)", "Pickup point at the terminal"],
  },
  {
    path: "/airports/heathrow-airport",
    sections: [
      {
        heading: "Heathrow Airport transfers",
        paragraphs: [
          "Heathrow Airport (LHR) is the UK's main international hub, and we book it as a long-distance private transfer. It suits travellers who would rather sit in one car than change trains with heavy luggage, and companies moving staff to a long-haul flight on a set schedule.",
          "Because the distance is long, the fixed fare is especially useful: it is confirmed before you pay, with no meter running in traffic.",
        ],
      },
      {
        heading: "London's other airports",
        paragraphs: [
          "Gatwick, Luton and London City airports are linked from this page. Travellers often have a choice of airports in the London area, and we can quote each one so you can compare the cost of reaching them before you book a flight.",
          "If you need a car at both ends of a trip, book the outward and return journeys separately so each has its own driver and fixed price.",
        ],
      },
      {
        heading: "Vehicles for business and long-haul travel",
        paragraphs: [
          "Business travellers usually pick the Executive Saloon or Luxury Saloon. The Luxury Saloon carries three passengers with two large cases. Families with luggage for a long holiday often choose the Premium MPV, which takes seven passengers and seven large cases.",
          "Meet and greet is included on airport pickups, and we follow your flight to time the pickup.",
        ],
      },
    ],
    needsOwnerFact: ["Distance and drive time from central Edinburgh", "Fixed fares to/from Heathrow (no published route)", "Terminal pickup points"],
  },
  {
    path: "/airports/gatwick-airport",
    sections: [
      {
        heading: "Gatwick, south of London",
        paragraphs: [
          "Gatwick Airport (LGW) is near Crawley, south of London, and it is a common choice for holiday flights. For Cabslink it is a long-distance booking, arranged in advance with a fixed price and a single driver for the whole journey.",
          "Most people who book us to Gatwick are carrying holiday luggage, so the choice of car matters more than the speed of booking.",
        ],
      },
      {
        heading: "Comparing London airports",
        paragraphs: [
          "Heathrow, Luton and London City airports are linked from this page. If you are still choosing a flight, get a quote for each and compare the total cost of getting there, not just the ticket price.",
          "When your plans change, update the address before you confirm and the price is recalculated straight away.",
        ],
      },
      {
        heading: "Holiday luggage and child seats",
        paragraphs: [
          "Families heading for a beach holiday often travel with several large cases. The Standard MPV takes four passengers with four large cases and the Seven-Seater MPV six passengers with three. For a big group, the Eight-Seater Van takes eight passengers and eight cases.",
          "Child seats can be added during booking. On the way home, your driver will meet you in arrivals with a name board.",
        ],
      },
    ],
    needsOwnerFact: ["Distance and drive time from central Edinburgh", "Fixed fares to/from Gatwick (no published route)", "Terminal pickup points"],
  },
  {
    path: "/airports/birmingham-airport",
    sections: [
      {
        heading: "Birmingham Airport in the Midlands",
        paragraphs: [
          "Birmingham Airport (BHX) serves Birmingham and the wider Midlands. Our bookings here are usually one of two kinds: people from Scotland catching a flight that is only offered from Birmingham, and visitors landing here who need to travel north for a wedding, a funeral or a business meeting.",
          "Either way, it is a long-distance private transfer with one driver and one price confirmed at booking.",
        ],
      },
      {
        heading: "Nearby airports we also serve",
        paragraphs: [
          "Liverpool, Manchester and East Midlands airports are linked from this page. If one of them has a better flight time, you can compare our quotes for each before deciding.",
          "Corporate clients often book these journeys for teams travelling together, which is cheaper and simpler than several separate train tickets with luggage.",
        ],
      },
      {
        heading: "Which car to choose",
        paragraphs: [
          "For one or two business travellers, the Executive Saloon carries four passengers with two large cases. For a team, the Seven-Seater MPV carries six passengers, and the Eight-Seater Van eight passengers with eight cases.",
          "Child seats and extra stops can be added while booking, and meet and greet is included on airport pickups.",
        ],
      },
    ],
    needsOwnerFact: ["Distance and drive time from central Edinburgh", "Fixed fares to/from Birmingham Airport (no published route)", "Pickup point at the terminal"],
  },
  {
    path: "/airports/belfast-international-airport",
    sections: [
      {
        heading: "Belfast International Airport",
        paragraphs: [
          "Belfast International Airport (BFS) is the larger of Belfast's two airports and is listed under Northern Ireland on our site. Bookings here are local private transfers to and from your address, arranged in advance with the fare agreed before you travel.",
          "If you are not sure which Belfast airport your flight uses, check your ticket: Belfast City Airport is a separate airport with its own page.",
        ],
      },
      {
        heading: "Islay whisky and onward travel",
        paragraphs: [
          "Laphroaig and Ardbeg distilleries, on the Scottish island of Islay, are linked from this page for whisky visitors planning a wider trip. Please contact us before booking any journey that involves a ferry, so we can confirm what is possible.",
          "For a journey that starts or ends in Belfast, we will need both addresses to give a fixed price.",
        ],
      },
      {
        heading: "Who books this airport",
        paragraphs: [
          "Visitors arriving for family events, business travellers and holidaymakers returning home use our service here. A single traveller is fine in a saloon, which carries four passengers with two large cases; a family with several cases is better in the Standard MPV, with room for four passengers and four cases.",
          "Your driver waits in arrivals with a name board.",
        ],
      },
    ],
    needsOwnerFact: ["Whether Cabslink operates in Northern Ireland directly or via a partner", "Fixed fares to/from Belfast International (no published route)", "Pickup point at the terminal"],
  },
  {
    path: "/airports/belfast-city-airport",
    sections: [
      {
        heading: "Belfast City Airport",
        paragraphs: [
          "Belfast City Airport (BHD) is the smaller Belfast airport and is closer to the city. Many of its passengers are on short business trips, so a pre-booked car with a fixed price saves waiting at a taxi rank when you have a meeting to reach.",
          "This page is separate from Belfast International Airport, which is also linked here — make sure you choose the right one before booking.",
        ],
      },
      {
        heading: "Planning a Scottish whisky trip from Belfast",
        paragraphs: [
          "Laphroaig and Ardbeg distilleries on Islay are linked from this page. Travel between Belfast and Islay involves a sea crossing, so contact us before you book and we will tell you what we can arrange.",
          "We do not publish a fixed fare for that kind of trip yet, because it depends on the crossing you choose.",
        ],
      },
      {
        heading: "Business travel made simple",
        paragraphs: [
          "Day-trip business travellers usually choose the Executive Saloon, which takes four passengers with two large cases. For a client visit, the Luxury Saloon carries three passengers.",
          "Bookings can include a return journey, and the fare for both legs is shown before you pay.",
        ],
      },
    ],
    needsOwnerFact: ["Whether Cabslink operates in Northern Ireland directly or via a partner", "Fixed fares to/from Belfast City Airport (no published route)", "Pickup point at the terminal"],
  },
  {
    path: "/airports/leeds-bradford-airport",
    sections: [
      {
        heading: "Leeds Bradford Airport in Yorkshire",
        paragraphs: [
          "Leeds Bradford Airport (LBA) serves Leeds, Bradford and the rest of West Yorkshire. We arrange journeys here as pre-booked, long-distance private transfers, quoted as one price for the whole trip.",
          "Travellers usually come to us for this airport because a direct, door-to-door car is simpler than several trains with luggage.",
        ],
      },
      {
        heading: "Other northern airports",
        paragraphs: [
          "Newcastle, Manchester and East Midlands airports are linked from this page. If you can fly from more than one, compare the quotes: the closest airport is not always the most convenient once flight times are taken into account.",
          "Changing the airport on your booking recalculates the price before you confirm.",
        ],
      },
      {
        heading: "Matching the car to the trip",
        paragraphs: [
          "Couples travelling light are comfortable in a saloon. Families who need more room often choose the Estate Car, which takes four passengers with three large cases, or the Premium MPV, which carries seven passengers and seven cases.",
          "Child seats are available as extras, and meet and greet is included when we collect you from arrivals.",
        ],
      },
    ],
    needsOwnerFact: ["Distance and drive time from central Edinburgh", "Fixed fares to/from Leeds Bradford (no published route)", "Pickup point at the terminal"],
  },
  {
    path: "/airports/liverpool-airport",
    sections: [
      {
        heading: "Liverpool John Lennon Airport",
        paragraphs: [
          "Liverpool Airport (LPL) serves Liverpool and the north-west of England. Cabslink books it as a long-distance private transfer, with a single driver and a fare fixed at the time of booking.",
          "It is a good fit for groups travelling to a football match, a concert or a family celebration who want to arrive together rather than separately.",
        ],
      },
      {
        heading: "Nearby airports",
        paragraphs: [
          "Birmingham, Manchester and Leeds Bradford airports are linked from this page. If your flight could leave from any of them, we can quote each so you can choose the easiest option for your group.",
          "Group trips are easier to manage with one booking reference and one driver who knows the whole plan.",
        ],
      },
      {
        heading: "Room for a group",
        paragraphs: [
          "Groups of friends travelling for an event usually choose the Seven-Seater MPV, which carries six passengers and three large cases, or the Eight-Seater Van, which carries eight passengers and eight cases. Smaller parties fit in a saloon or an Estate Car.",
          "You can add extra pickup stops during booking, and the fare is shown before you pay.",
        ],
      },
    ],
    needsOwnerFact: ["Distance and drive time from central Edinburgh", "Fixed fares to/from Liverpool Airport (no published route)", "Pickup point at the terminal"],
  },
];

export function guideFor(path: string): PlaceGuide | null {
  return PLACE_GUIDES.find((g) => g.path === path) ?? null;
}

/** Visible words in a guide (headings + paragraphs; no links). */
export function guideWordCount(g: PlaceGuide): number {
  return countVisibleWords(g.sections.flatMap((s) => [s.heading, ...s.paragraphs]).join(" "));
}

export function countVisibleWords(text: string): number {
  return text
    .replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9£]/.test(w)).length;
}
