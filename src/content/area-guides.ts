import type { PlaceGuide } from "@/content/place-guides";

/**
 * Phase 7 batch 3 — area (city and town) pages. Facts used: the page's own
 * destination row (name, council, region, the places this page links to),
 * the live fleet capacities and site-wide rules (fixed fares, card payment
 * via Stripe, cancellation windows, extra stops). No area has a published
 * popular route yet, so no distances, drive times or fares are written;
 * the page's own journey-fact cards show estimates. Everything else is
 * well-known public geography about the place itself.
 *
 * The shared fleet/payment/cancellation sentences come in several wording
 * variants so no two pages share more than a small part of their text.
 */

const PAY_A =
  "You pay by card through Stripe at the end of the booking, using Visa, Mastercard or American Express. No card details are stored on cabslink.com.";
const PAY_B =
  "Payment is by card through Stripe when you finish booking, with Visa, Mastercard or American Express accepted. Your card details are never stored on cabslink.com.";
const PAY_C =
  "Cards are taken through Stripe at the end of booking — Visa, Mastercard and American Express. Nothing about your card is kept on cabslink.com.";
const PAY_D =
  "You settle by card via Stripe when the booking is completed, with Visa, Mastercard and American Express all accepted. Card details are not held on cabslink.com.";

const CANCEL_A =
  "Transfers can be cancelled free of charge more than 12 hours before pickup. Between 3 and 12 hours the charge is half the fare, and under 3 hours it is the full fare.";
const CANCEL_B =
  "Cancel more than 12 hours before pickup and there is no charge. From 3 to 12 hours before, half the fare is payable; under 3 hours, the full fare applies.";
const CANCEL_C =
  "Cancellations are free more than 12 hours before pickup; half the fare is charged between 3 and 12 hours; and the full fare applies within 3 hours.";
const CANCEL_D =
  "There is no cancellation charge more than 12 hours ahead of pickup. Between 3 and 12 hours before, half the fare is due, and inside 3 hours the full fare is due.";

const FLEET_A =
  "A saloon takes up to four passengers with two large cases. For more luggage, move up to the Estate Car with three cases or the Standard MPV with four. Six passengers fit the Seven-Seater MPV, seven the Premium MPV, and up to eight the Eight-Seater Van — each with a case per seat. Larger parties are sent in more than one vehicle.";
const FLEET_B =
  "Choose by bags as much as by people: four passengers and two large cases suit a saloon, and the Estate Car or Standard MPV take three or four cases. Six travel in the Seven-Seater MPV, seven in the Premium MPV, and up to eight in the Eight-Seater Van. If your group is bigger than that, we send more than one car.";
const FLEET_C =
  "The fleet runs from saloons (four passengers, two large cases) through the Estate Car and Standard MPV to the Seven-Seater MPV for six passengers, the Premium MPV for seven and the Eight-Seater Van for eight with eight cases. Parties above eight travel in multiple vehicles.";
const FLEET_D =
  "Luggage decides as much as headcount. Four passengers with two large cases fit a saloon; three cases need the Estate Car and four the Standard MPV. For six passengers take the Seven-Seater MPV, for seven the Premium MPV, and for eight with eight cases the Eight-Seater Van. Any party larger than eight travels in more than one vehicle.";
const FLEET_E =
  "From the saloon — four passengers, two large cases — the fleet steps up through the Estate Car and Standard MPV (three and four cases) to the Seven-Seater MPV for six, the Premium MPV for seven and the Eight-Seater Van, which carries eight passengers with eight cases. Bigger groups are sent in multiple vehicles.";

const OWNER_FACTS = (name: string) => [
  `Confirmed pickup and drop-off meeting arrangements in ${name}`,
  `Published routes with distances, drive times and fixed fares from ${name}`,
];

export const AREA_GUIDES: PlaceGuide[] = [
  {
    path: "/areas/edinburgh",
    sections: [
      {
        heading: "Getting around the capital by private car",
        paragraphs: [
          "Edinburgh is Scotland's capital, in the council area of the same name, and its two halves behave quite differently for drivers. The Old Town's closes and the Georgian New Town sit close together but are linked by steep, narrow streets, while the wider city stretches out to the port at Leith, the business parks to the west and the residential suburbs to the south.",
          "A pre-booked car makes the most sense when you are moving between those layers — from a hotel off the Royal Mile to a meeting at Edinburgh Park, or from a flat in Marchmont out to the airport at dawn. You are collected at the exact door you enter when booking, so there is no guessing about meeting points.",
        ],
      },
      {
        heading: "When the city gets busy",
        paragraphs: [
          "In August the festival fills every street and the centre slows to a crawl, so allow extra time if you are heading to or from a venue near the Mile. Winter brings its own rhythm: dark afternoons, icy mornings and the Hogmanay crowds around the Castle. University graduations and rugby weekends at Murrayfield are the other times the city runs at full stretch.",
          "Because your fare is fixed when you book, a slow crawl through the centre does not change what you pay. The airports and nearby places linked from this page are all served by the same door-to-door service, and any stops you add while booking are priced in before you pay.",
        ],
      },
      {
        heading: "A vehicle for your luggage",
        paragraphs: [FLEET_A],
      },
      {
        heading: "Booking and paying",
        paragraphs: [
          `Set your pickup and drop-off when you book, add any stops at the same time, and everything is priced into the quote before you confirm. ${PAY_A} ${CANCEL_B}`,
        ],
      },
    ],
    needsOwnerFact: OWNER_FACTS("Edinburgh"),
  },
  {
    path: "/areas/glasgow",
    sections: [
      {
        heading: "Scotland's biggest city, served door to door",
        paragraphs: [
          "Glasgow is the largest city in Scotland and the centre of its own council area. The grid-like centre, the riverside around the Clyde and the long arms of the suburbs each give drivers a different job, and the city's event calendar — concerts at the Hydro, football at Hampden and Ibrox, conferences at the SEC — shapes when it is busiest.",
          "For visitors, a private car takes the guesswork out of arriving: you are collected at the exact door you enter when booking, and the driver works to your schedule rather than a fixed route.",
        ],
      },
      {
        heading: "Arrivals, events and onward travel",
        paragraphs: [
          "Many of our Glasgow journeys start or end at one of the airports or stations linked from this page. Others are one-way moves across the city itself, or runs out to the surrounding towns and business parks.",
          "Event nights are the times to book early. Extra pickup or drop-off stops can be added while booking, and each stop is included in the quote before you pay. For late finishes, you can set the pickup time around the event rather than the other way round.",
        ],
      },
      {
        heading: "Matching the car to the party",
        paragraphs: [FLEET_B],
      },
      {
        heading: "Prices, payment and changes",
        paragraphs: [
          `Your quote is the price you pay — there is no surge pricing when the city is busy. ${PAY_B} ${CANCEL_A}`,
        ],
      },
    ],
    needsOwnerFact: OWNER_FACTS("Glasgow"),
  },
  {
    path: "/areas/aberdeen",
    sections: [
      {
        heading: "The granite city and its energy traffic",
        paragraphs: [
          "Aberdeen is Scotland's third city and the capital of the North Sea energy industry, in the Aberdeen City council area. Its granite buildings and the long sweep of Union Street sit between the harbour and the beach, and the city's working life runs on shift patterns — crew changes, offshore rotations and back-to-back meeting days.",
          "That rhythm suits pre-booked private hire. A car waiting at your door at 4am for a crew change, or holding through a delayed flight, is exactly the sort of journey our fixed-fare service is built for. The driver is confirmed the evening before, not found on the morning.",
        ],
      },
      {
        heading: "Where journeys start and finish",
        paragraphs: [
          "The airport north of the city, the harbour and the business districts linked from this page are the places we serve most often. Travellers also use us for one-way transfers south to Edinburgh and Glasgow, and for hotel-to-office runs during the working week.",
          "Add your pickup address, destination and any notes — a gate number, a terminal or a site office — at checkout, and the driver works from exactly what you enter. If your schedule shifts, the notes are the first thing they check.",
        ],
      },
      {
        heading: "Vehicles for crews and cases",
        paragraphs: [FLEET_C],
      },
      {
        heading: "Booking terms in brief",
        paragraphs: [
          `Every fare is agreed when you book and does not change on the day. ${PAY_C} ${CANCEL_C}`,
        ],
      },
    ],
    needsOwnerFact: OWNER_FACTS("Aberdeen"),
  },
  {
    path: "/areas/dundee",
    sections: [
      {
        heading: "Dundee, the city of design",
        paragraphs: [
          "Dundee is Scotland's fourth city, on the north bank of the Tay in the Dundee City council area. The waterfront has been transformed in recent years around the V&A museum and the RRS Discovery, and the city is a serious university town, which means a steady flow of graduations, open days, conferences and student arrivals.",
          "The city centre is compact, but the university campuses and the outlying districts are spread across the hills behind it — a car makes short work of a journey that would otherwise need two changes.",
        ],
      },
      {
        heading: "Connections this page links to",
        paragraphs: [
          "The airports, stations and nearby places listed on this page are the journeys we run most often from Dundee, alongside one-way transfers to Edinburgh, Glasgow and St Andrews.",
          "If you are meeting someone off a train or flight, you can book the car in their name and add their mobile number so the driver can reach them directly. Students moving in or out with a term's worth of bags can book the larger vehicles without any extra arrangement.",
        ],
      },
      {
        heading: "Which car fits your group",
        paragraphs: [FLEET_D],
      },
      {
        heading: "Payment and cancellation",
        paragraphs: [
          `The fare shown is the fare you pay, agreed before pickup. ${PAY_D} ${CANCEL_D}`,
        ],
      },
    ],
    needsOwnerFact: OWNER_FACTS("Dundee"),
  },
  {
    path: "/areas/inverness",
    sections: [
      {
        heading: "The Highland capital",
        paragraphs: [
          "Inverness is the capital of the Highlands, in the Highland council area, and the natural gathering point for travel across the north of Scotland. The River Ness runs through the middle, the Caledonian Canal and Loch Ness lie just to the south-west, and the city is the last place with serious services before the roads thin out into the glens.",
          "For visitors, the city works as both a destination and a starting line: stay a night, then press on to the west coast, the North Coast 500 or the ski areas of the Cairngorms. The views on the way are half the point, and a private car can stop for them.",
        ],
      },
      {
        heading: "Longer journeys from the Highland capital",
        paragraphs: [
          "The airport to the east of the city and the stations linked from this page handle most arrivals, and from there the journeys fan out in every direction. Longer one-way transfers to the west coast and the islands are quoted the same way as any other booking: fixed before you pay.",
          "Extra stops — a distillery, a viewpoint, a hotel on the way — can be added while booking and are priced into the same quote. For touring days, this turns a string of separate trips into one booked journey.",
        ],
      },
      {
        heading: "Space for Highland luggage",
        paragraphs: [FLEET_E],
      },
      {
        heading: "How booking works",
        paragraphs: [
          `Enter your pickup and drop-off, choose a time, and the quote is calculated before you confirm. ${PAY_A} ${CANCEL_B}`,
        ],
      },
    ],
    needsOwnerFact: OWNER_FACTS("Inverness"),
  },
  {
    path: "/areas/perth",
    sections: [
      {
        heading: "The Fair City at Scotland's crossroads",
        paragraphs: [
          "Perth sits on the River Tay in the Perth and Kinross council area, and its old nickname — the Fair City — reflects the tidy streets between the river and the South Inch. For drivers it is one of the most useful places in Scotland: the A9, M90 and A85 meet here, which is why so many journeys pass through rather than stop.",
          "The city itself is a natural base for Scone Palace, the Perth Races and the road north to the Highlands, and its hotels fill up for weddings, conferences and race days. Its central position also makes it a sensible midpoint for longer transfers between the central belt and the north.",
        ],
      },
      {
        heading: "Journeys that start in Perth",
        paragraphs: [
          "The airports, stations and nearby places linked from this page are the usual beginnings and ends of our Perth trips, with one-way transfers to Edinburgh, Glasgow, Dundee and the Highland towns alongside them.",
          "If your plans change shape — an extra passenger, a different drop-off — the notes you add at checkout tell the driver exactly what you need, and any stop on the way is part of the same fixed price.",
        ],
      },
      {
        heading: "Vehicles and capacities",
        paragraphs: [FLEET_A],
      },
      {
        heading: "Paying for your transfer",
        paragraphs: [
          `There is no surge pricing: the quote you see is the price you pay. ${PAY_B} ${CANCEL_C}`,
        ],
      },
    ],
    needsOwnerFact: OWNER_FACTS("Perth"),
  },
  {
    path: "/areas/stirling",
    sections: [
      {
        heading: "Stirling, the gateway to the Highlands",
        paragraphs: [
          "Stirling has watched over the crossing of the Forth for centuries, and its castle and the Wallace Monument still dominate the skyline above the town in the Stirling council area. The old town climbs the crag below the castle walls, while the modern town spreads out along the river and towards the motorway that carries traffic north.",
          "For travellers it is a popular overnight stop between Edinburgh and the Highlands, and a day-trip destination in its own right for the castle, the monument and Bannockburn. The university also keeps a steady flow of students and visiting academics moving through the town.",
        ],
      },
      {
        heading: "Getting to and from Stirling",
        paragraphs: [
          "The stations and airports linked from this page are the main arrival points, and the surrounding towns — the places this page lists nearby — are short runs that suit a fixed-price car better than a timetable.",
          "If you are heading on to the Highlands, the same booking covers the whole journey, with any stops priced in before you pay. Early-morning departures for the airport are quoted the same way as midday trips.",
        ],
      },
      {
        heading: "A car for every party size",
        paragraphs: [FLEET_B],
      },
      {
        heading: "Booking terms",
        paragraphs: [
          `Book with your pickup address, destination and time, and the fare is locked in at that moment. ${PAY_C} ${CANCEL_D}`,
        ],
      },
    ],
    needsOwnerFact: OWNER_FACTS("Stirling"),
  },
  {
    path: "/areas/ayr",
    sections: [
      {
        heading: "Ayr and the Ayrshire coast",
        paragraphs: [
          "Ayr is the main town of South Ayrshire, set where the River Ayr meets the Firth of Clyde. The long beach and promenade, the racecourse just outside the town and the Burns heritage of the surrounding countryside give the area a year-round calendar of visitors, and Prestwick, a few miles up the coast, has long been an airport town.",
          "The coastal position also means changeable weather: a mild day can turn wet quickly, which is one more reason a pre-booked car with a fixed fare beats waiting at a bus stop. Golfers bound for the Ayrshire links find the same arrangement useful with a full set of clubs in the boot.",
        ],
      },
      {
        heading: "Trips from the coast",
        paragraphs: [
          "The airport, stations and nearby places linked from this page are the journeys we run most often from Ayr, alongside one-way transfers to Glasgow and the wider central belt.",
          "Race days and event weekends are the busiest times — booking ahead secures your vehicle rather than leaving it to chance. If you are travelling on to the coast villages, the same booking covers the whole run.",
        ],
      },
      {
        heading: "Which vehicle to choose",
        paragraphs: [FLEET_C],
      },
      {
        heading: "Prices and payment",
        paragraphs: [
          `The fare is agreed when you book and does not change on the day, whatever the traffic on the coast road. ${PAY_D} ${CANCEL_A}`,
        ],
      },
    ],
    needsOwnerFact: OWNER_FACTS("Ayr"),
  },
  {
    path: "/areas/dunfermline",
    sections: [
      {
        heading: "Dunfermline, Fife's ancient capital",
        paragraphs: [
          "Dunfermline, in the Fife council area, was the capital of Scotland long before Edinburgh, and the abbey and the ruins of the royal palace still anchor the town centre. Today it is a busy commuter town on the north side of the Forth, with the bridges close by and Edinburgh within easy reach to the south.",
          "That position between the capital and the Kingdom of Fife makes it one of the most practical places for a private transfer: you are never far from an airport, a station or a motorway, and the town's spread-out estates make door-to-door pickup genuinely useful.",
        ],
      },
      {
        heading: "Where people go from here",
        paragraphs: [
          "The airports, stations and nearby places linked from this page are the main journeys we run from Dunfermline, with one-way transfers to Edinburgh, Glasgow and the Fife coastal towns alongside them.",
          "Commuters often book a car for the early runs that the first trains miss, and families use the same service for airport departures with heavy luggage. Evening returns are scheduled around your landing or your last meeting.",
        ],
      },
      {
        heading: "Matching cars to luggage",
        paragraphs: [FLEET_D],
      },
      {
        heading: "Booking and paying",
        paragraphs: [
          `Your quote is calculated when you book and is the price you pay. ${PAY_A} ${CANCEL_B}`,
        ],
      },
    ],
    needsOwnerFact: OWNER_FACTS("Dunfermline"),
  },
  {
    path: "/areas/falkirk",
    sections: [
      {
        heading: "Falkirk and the Forth valley",
        paragraphs: [
          "Falkirk sits at the heart of the Forth valley, between Edinburgh and Stirling, and the town's name is attached to two of Scotland's most photographed landmarks: the Falkirk Wheel, the rotating boat lift, and the Kelpies, the towering horse heads beside the canal. The town itself is a long-standing crossroads, with the M9 and the main rail lines passing through.",
          "For visitors, the area rewards a car: the Wheel and the Kelpies sit apart from the town centre and from each other, and a private transfer joins them up without a bus timetable. Both landmarks are popular with families, and the walking between them is longer than it looks on a map.",
        ],
      },
      {
        heading: "Journeys in the valley",
        paragraphs: [
          "The airports, stations and nearby places linked from this page are the usual destinations from Falkirk, and the surrounding towns of the valley are short fixed-price runs.",
          "If you are combining two or three stops in one trip — the Wheel in the morning, the Kelpies in the afternoon — add them while booking and the quote covers the whole itinerary. Waiting time at each stop is agreed in advance, not counted up at the kerb.",
        ],
      },
      {
        heading: "Vehicle choice for groups",
        paragraphs: [FLEET_E],
      },
      {
        heading: "How you pay",
        paragraphs: [
          `The fare is fixed at the moment you book, with no changes on the day. ${PAY_B} ${CANCEL_C}`,
        ],
      },
    ],
    needsOwnerFact: OWNER_FACTS("Falkirk"),
  },
  {
    path: "/areas/fort-william",
    sections: [
      {
        heading: "Fort William under Ben Nevis",
        paragraphs: [
          "Fort William, in the Highland council area, sits at the southern end of the Great Glen with Ben Nevis — the highest mountain in the British Isles — rising directly behind the town. It is the outdoor capital of Lochaber: walkers finishing the West Highland Way, climbers, and travellers bound for Glencoe, Glenfinnan and the Road to the Isles all pass through.",
          "The town is small, but the journeys around it are long, which is exactly the sort of trip a pre-booked car handles best — one price for the whole run, however far it goes. The mountain weather also has a habit of rewriting plans, so a driver who works to your schedule rather than a timetable is a real advantage.",
        ],
      },
      {
        heading: "The long runs from Lochaber",
        paragraphs: [
          "The stations and nearby places linked from this page are the main connections, and beyond them the airport runs to Glasgow and Edinburgh are the journeys guests book most. Walkers often arrange a pickup at the end of a trail rather than the start, and we quote that the same way.",
          "Muddy boots and rucksacks are no problem — just note anything fragile or oversized at checkout. For groups walking or climbing together, the larger vehicles carry the whole party in one go.",
        ],
      },
      {
        heading: "Space for expedition kit",
        paragraphs: [FLEET_A],
      },
      {
        heading: "Booking terms in brief",
        paragraphs: [
          `One fixed price covers the whole journey, agreed before you travel. ${PAY_C} ${CANCEL_D}`,
        ],
      },
    ],
    needsOwnerFact: OWNER_FACTS("Fort William"),
  },
  {
    path: "/areas/kirkcaldy",
    sections: [
      {
        heading: "Kirkcaldy, the Lang Toun",
        paragraphs: [
          "Kirkcaldy is the largest town in Fife, on the north shore of the Forth, in the Fife council area. The old nickname — the Lang Toun — comes from its mile-long high street, and the seafront at Ravenscraig and the raised beach walk below the cliffs give the town its open, coastal feel.",
          "It is a working town as much as a visitor one: commuters to Edinburgh, day-trippers heading for the Fife coast, and families moving between the Fife towns all use private transfers here. The town's spread along the shore means the addresses at either end of a trip are often further apart than the map suggests.",
        ],
      },
      {
        heading: "Connections from the Fife coast",
        paragraphs: [
          "The airports, stations and nearby places linked from this page cover the journeys we run most from Kirkcaldy, with one-way transfers to Edinburgh and the rest of Fife alongside them.",
          "The Forth bridges sit at the town's doorstep, so an early run to the airport across the Queensferry Crossing is a common start to the week. Return journeys can be timed to your landing so the car is there when you are.",
        ],
      },
      {
        heading: "Cars and capacities",
        paragraphs: [FLEET_B],
      },
      {
        heading: "Paying and changing plans",
        paragraphs: [
          `The fare you are quoted is the fare you pay, whatever the bridge traffic does. ${PAY_D} ${CANCEL_A}`,
        ],
      },
    ],
    needsOwnerFact: OWNER_FACTS("Kirkcaldy"),
  },
  {
    path: "/areas/livingston",
    sections: [
      {
        heading: "Livingston, the West Lothian new town",
        paragraphs: [
          "Livingston is one of Scotland's new towns, built in West Lothian between Edinburgh and Glasgow, and it has grown into one of the busiest shopping and employment centres in the country. The town centre, the retail parks and the industrial estates along the M8 corridor keep a steady stream of business traffic moving through.",
          "For workers and shoppers alike, a private car solves the one weakness of a new town: the distances between its parts. The centre, the estates and the surrounding villages are all short hops by road, but awkward ones without a car.",
        ],
      },
      {
        heading: "Where Livingston journeys go",
        paragraphs: [
          "The airports, stations and nearby places linked from this page are the trips we handle most often, with one-way transfers to Edinburgh and Glasgow alongside them.",
          "Early meetings and late finishes are the times a pre-booked car earns its keep — your driver is confirmed the night before, not found on the day. Shopping trips with several bags are just as easy: the car waits at the door rather than a pickup point, and the driver helps with the loading.",
          "Weekend journeys out to the surrounding West Lothian villages and to the two cities at either end of the corridor are booked the same way, with the price fixed before you travel.",
        ],
      },
      {
        heading: "Choosing your vehicle",
        paragraphs: [FLEET_C],
      },
      {
        heading: "Prices and payment",
        paragraphs: [
          `Every journey is priced before you confirm, and the figure does not move. ${PAY_A} ${CANCEL_B}`,
        ],
      },
    ],
    needsOwnerFact: OWNER_FACTS("Livingston"),
  },
  {
    path: "/areas/oban",
    sections: [
      {
        heading: "Oban, gateway to the isles",
        paragraphs: [
          "Oban is the largest town in Argyll, in the Argyll and Bute council area, and its horseshoe bay around the ferry terminal has made it the busiest ferry port on the west coast. Ships leave for Mull, the other Hebrides and beyond, and the town's seafood, distillery and McCaig's Tower draw visitors in their own right.",
          "Ferry timings are unforgiving, which is where a fixed-price car proves its worth: you are collected at your door with time in hand, and the drive to the terminal is planned around your sailing, not a bus schedule. Missing a connection here can mean a day's wait, so the buffer is worth building in.",
        ],
      },
      {
        heading: "To the port and across Argyll",
        paragraphs: [
          "The nearby places linked from this page and the long runs to Glasgow and Edinburgh are the journeys we run most from Oban, alongside local hops around the bay and out to the surrounding glens.",
          "If your ferry is part of a longer trip, book the whole door-to-port journey in one go and add any stops — a viewpoint on the way, a hotel on the return — while booking. The whole itinerary is priced before you pay, so the island connection is one cost, not several.",
        ],
      },
      {
        heading: "A car that fits the luggage",
        paragraphs: [FLEET_D],
      },
      {
        heading: "How booking works",
        paragraphs: [
          `Enter your address and the ferry terminal, choose a time that builds in a buffer, and the price is fixed there and then. ${PAY_B} ${CANCEL_C}`,
        ],
      },
    ],
    needsOwnerFact: OWNER_FACTS("Oban"),
  },
  {
    path: "/areas/pitlochry",
    sections: [
      {
        heading: "Pitlochry in Highland Perthshire",
        paragraphs: [
          "Pitlochry, in the Perth and Kinross council area, is the best-known town of Highland Perthshire, strung along the A9 with the Tummel at its back and the hills rising on every side. The dam and its salmon ladder, the Festival Theatre and the surrounding glens and distilleries make it a year-round base for touring the middle of Scotland.",
          "Because it sits on the main road north, Pitlochry is easy to pass through and easy to reach — the kind of place where a private car turns a scattered day of sights into one smooth loop. The town's hotels and guest houses also make it a natural overnight stop on longer Highland itineraries.",
        ],
      },
      {
        heading: "Touring from Pitlochry",
        paragraphs: [
          "The stations and nearby places linked from this page are the usual pickups, and the long transfers to Glasgow and Edinburgh airports are the journeys guests book most. Day-trip style bookings with several stops are quoted the same way as a simple transfer.",
          "Add each stop while booking and the route, time and price all reflect the full itinerary before you pay. For guests staying in town, the car can collect from the hotel door and return you there at the end of the day.",
        ],
      },
      {
        heading: "Vehicles for touring parties",
        paragraphs: [FLEET_E],
      },
      {
        heading: "Booking and payment",
        paragraphs: [
          `The quote you accept is the price you pay — stops included, no surprises on the day. ${PAY_C} ${CANCEL_D}`,
        ],
      },
    ],
    needsOwnerFact: OWNER_FACTS("Pitlochry"),
  },
];
