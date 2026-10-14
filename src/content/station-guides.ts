import type { PlaceGuide } from "@/content/place-guides";

/**
 * Phase 7 batch 2 — station pages. Facts used: the station's own destination
 * row (town, nearby places), the live fleet capacities and site-wide rules
 * (fixed fares, card payment via Stripe, cancellation windows, extra stops).
 * No station has a published popular route yet, so no distances, drive times
 * or fares are written; the page's own journey-fact cards show estimates.
 */
const CANCEL =
  "Transfers can be cancelled free of charge more than 12 hours before pickup. Between 3 and 12 hours the charge is half the fare, and under 3 hours it is the full fare.";
const PAY =
  "You pay by card through Stripe at the end of the booking, using Visa, Mastercard or American Express. No card details are stored on cabslink.com.";

const COMMON_OWNER_FACTS = [
  "Exact driver waiting point at the station",
  "Published routes with distances, drive times and fixed fares from this station",
];

export const STATION_GUIDES: PlaceGuide[] = [
  {
    path: "/stations/edinburgh-waverley",
    sections: [
      {
        heading: "Leaving Edinburgh Waverley by car",
        paragraphs: [
          "Edinburgh Waverley is the busiest arrival point for rail travellers coming into the capital, and many of our passengers step off a long train with heavy cases and a tight onward connection. A pre-booked car takes away the queue and the guesswork: you know who is collecting you, what the trip costs and which vehicle is coming before you even board.",
          "When you book, enter the station as your pickup and add your train time and any meeting notes at checkout. Your driver works from the address and notes you give, so the more detail you add, the smoother the handover.",
        ],
      },
      {
        heading: "Where people go from Waverley",
        paragraphs: [
          "Journeys from Waverley often stay close by. Quartermile, the University of Edinburgh and wider Edinburgh are the nearby places this page links to, and they are common drop-offs for students, visiting staff and families arriving for graduation. Others use the station as the first leg of a longer trip, heading on to the airport or out across Scotland.",
          "If you are meeting someone off a train, you can book the car in their name and add their mobile number so the driver can reach them directly.",
        ],
      },
      {
        heading: "Choosing a vehicle for rail luggage",
        paragraphs: [
          "Rail travellers tend to carry more than they expect. A saloon suits up to four passengers with two large cases. If you have three cases, choose the Estate Car; with four, the Standard MPV. Six passengers fit the Seven-Seater MPV with three cases, seven travel in the Premium MPV with seven cases, and the Eight-Seater Van takes eight people with eight cases. Larger parties can book more than one vehicle.",
        ],
      },
      {
        heading: "Price, payment and changes",
        paragraphs: [
          `Your fare is fixed when you book, so a slow exit from the city centre does not change what you pay. ${PAY} ${CANCEL}`,
        ],
      },
    ],
    needsOwnerFact: COMMON_OWNER_FACTS,
  },
  {
    path: "/stations/haymarket",
    sections: [
      {
        heading: "Why travellers choose Haymarket",
        paragraphs: [
          "Haymarket is Edinburgh's second mainline station and, for many passengers, the more practical one. It sits in the west of the city, so it is a natural pickup for anyone staying in that part of Edinburgh or heading out of town without wanting to cross the centre first.",
          "Booking a car to meet you here works the same way as any Cabslink transfer. Set Haymarket as the pickup, choose a time that matches your train, and use the notes box at checkout to tell your driver how to find you.",
        ],
      },
      {
        heading: "Nearby places this page connects to",
        paragraphs: [
          "Quartermile, the University of Edinburgh and Edinburgh Castle are the nearby places linked from this page. Visitors with a hotel near the Old Town, academics arriving for a conference and families travelling for a university event all use Haymarket as their arrival point, and a short private transfer saves dragging cases over cobbles.",
          "For longer onward journeys you can add extra pickup or drop-off stops while booking. Each stop is priced into the quote before you pay.",
        ],
      },
      {
        heading: "Which car fits your group",
        paragraphs: [
          "Pick the vehicle by bags as well as people. Saloons carry up to four passengers with two large cases; the Estate Car takes three cases and the Standard MPV four. The Seven-Seater MPV seats six with three cases, the Premium MPV seven with seven cases, and the Eight-Seater Van eight with eight cases. If your group is bigger than that, we can send more than one vehicle.",
        ],
      },
      {
        heading: "Booking terms in brief",
        paragraphs: [
          `The fare shown is the fare you pay. ${PAY} ${CANCEL} Child seats can be added during booking.`,
        ],
      },
    ],
    needsOwnerFact: COMMON_OWNER_FACTS,
  },
  {
    path: "/stations/glasgow-central",
    sections: [
      {
        heading: "Arriving at Glasgow Central",
        paragraphs: [
          "Glasgow Central is where many long-distance trains into the west of Scotland end, and passengers often arrive tired, late in the evening or with a meeting to reach. A private car booked in advance means a named driver, a known vehicle and a price agreed before you travel, rather than a search for a cab outside.",
          "Add Glasgow Central as your pickup and give your train details in the notes. If plans change before the day, you can review the booking through Manage Booking using your reference.",
        ],
      },
      {
        heading: "Onward journeys around Glasgow",
        paragraphs: [
          "Nearby places linked from this page are Glasgow, the University of Glasgow and Glasgow Queen Street, the city's other main station. Some passengers simply need a short hop between the two stations with luggage; others head to the university for term start or to a business address across the city.",
          "Corporate travellers can book on behalf of colleagues, and the confirmation goes to the email address entered at booking.",
        ],
      },
      {
        heading: "Vehicles for business and family travel",
        paragraphs: [
          "Solo business travellers usually book a saloon, which carries up to four passengers and two large cases. Families with more luggage choose the Estate Car for three cases or the Standard MPV for four. For six people the Seven-Seater MPV takes three cases; the Premium MPV carries seven with seven cases; the Eight-Seater Van carries eight with eight cases. Bigger groups travel in multiple vehicles.",
        ],
      },
      {
        heading: "What you pay and when",
        paragraphs: [
          `Fares are fixed at booking. ${PAY} ${CANCEL}`,
        ],
      },
    ],
    needsOwnerFact: COMMON_OWNER_FACTS,
  },
  {
    path: "/stations/glasgow-queen-street",
    sections: [
      {
        heading: "Glasgow Queen Street and the Edinburgh line",
        paragraphs: [
          "Glasgow Queen Street serves a lot of travel between Glasgow and the rest of Scotland, and it is a frequent starting point for passengers who would rather finish their trip by car. Whether you are collecting a relative, heading to a hotel or continuing to an appointment, a pre-booked transfer gives you a fixed price and a driver expecting you.",
          "To book, choose Queen Street as the pickup, set the time and add any notes about where you will wait. The driver follows the details you provide.",
        ],
      },
      {
        heading: "Places close to Queen Street",
        paragraphs: [
          "This page links to Glasgow, the University of Glasgow and Glasgow Central. Students arriving with a term's worth of bags, visitors checking in across the city and travellers changing to a train from Central all book short transfers from here.",
          "Parents can book and pay for a journey they are not taking themselves: enter the passenger's name and phone number, and the booking confirmation still comes to you.",
        ],
      },
      {
        heading: "Fitting people and bags",
        paragraphs: [
          "Count cases before choosing. A saloon takes up to four passengers and two large cases. The Estate Car manages three cases, the Standard MPV four. Six passengers with three cases suit the Seven-Seater MPV, seven with seven cases the Premium MPV, and eight with eight cases the Eight-Seater Van. Larger parties can book additional vehicles in the same trip.",
        ],
      },
      {
        heading: "Cancellation and card payment",
        paragraphs: [
          `${CANCEL} ${PAY} The quote you see is the price you pay.`,
        ],
      },
    ],
    needsOwnerFact: COMMON_OWNER_FACTS,
  },
];
