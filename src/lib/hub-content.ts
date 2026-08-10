/**
 * Long-form editorial content for the destination hub pages.
 *
 * Kept out of `hub-config.ts` so the hub definitions stay readable. Every
 * entry is factual: it describes how we actually operate (quotes agreed before
 * travel, pick-up points confirmed in advance, waiting time stated up front)
 * and avoids claims we cannot evidence.
 */
import type { ContentFaq, ContentSection } from "@/components/site/ContentSections";

export type HubContent = { sections: ContentSection[]; faqs: ContentFaq[] };

const QUOTE_FAQ: ContentFaq = {
  q: "How is the price worked out?",
  a: "We quote per journey from the pick-up and drop-off you enter, the vehicle class you choose and any extras such as additional stops or child seats. The figure is shown before you confirm, and it is the figure we hold you to — there is no meter running in the car.",
};
const PAY_FAQ: ContentFaq = {
  q: "How do I pay?",
  a: "Bookings are confirmed by our team, who send you the payment arrangement for your journey. We do not take card details on the website, so nothing is charged at the moment you submit the form.",
};
const CHANGE_FAQ: ContentFaq = {
  q: "Can I change or cancel a booking?",
  a: "Yes. Contact us with your booking reference as early as you can and we will move the time, route or vehicle subject to availability. Cancellation terms are set out on our Booking & Cancellation Policy page.",
};

export const HUB_CONTENT: Record<string, HubContent> = {
  areas: {
    sections: [
      {
        title: "What an area page tells you",
        paragraphs: [
          "Each area page is built around the journeys people actually make from that town or city: the run to the nearest airport, the mainline station most passengers connect through, the day trips within reasonable driving distance, and the account travel local businesses book repeatedly.",
          "Where the roads or parking restrict what can be used — narrow historic streets, height-limited car parks, permit-only residential zones — the page says so and names the vehicle classes that work there instead.",
        ],
      },
      {
        title: "Coverage beyond the published pages",
        paragraphs: [
          "The list below is not the limit of where we drive. We cover UK postcodes generally, including addresses with no dedicated page yet, and long-distance cross-border journeys between Scotland, England and Wales.",
          "If your town is not listed, enter the postcode in the booking form and you will still get a quote for the same vehicle classes and the same fixed-fare terms.",
        ],
      },
      {
        title: "Choosing between vehicle classes",
        paragraphs: [
          "You book a class rather than a specific registration: an executive saloon for one or two passengers with cabin bags, an estate or SUV where cases are larger, a people carrier for four to seven passengers, and minibus or coach classes above that.",
          "Tell us the number of large cases as well as the passenger count. Seat capacity and luggage capacity rarely run out at the same time, and luggage is what usually decides the class.",
        ],
      },
      {
        title: "Timing local journeys",
        paragraphs: [
          "For airport runs we work backwards from your check-in window rather than quoting a bare driving time, and we build in margin for the routes that regularly congest at commuter hours.",
          "For city-centre pick-ups we agree a specific door or bay in advance, because most UK city centres now have bus gates, low-emission zones or timed loading restrictions that decide where a car can legally stop.",
        ],
      },
    ],
    faqs: [
      QUOTE_FAQ,
      PAY_FAQ,
      {
        q: "Do you cover towns without their own page?",
        a: "Yes. The pages here are the areas we publish detail for; quoting works from any UK postcode, including rural addresses and journeys that cross between Scotland, England and Wales.",
      },
      CHANGE_FAQ,
    ],
  },

  stations: {
    sections: [
      {
        title: "Where the driver waits",
        paragraphs: [
          "Station forecourts are the most restricted pick-up points we deal with. Many have timed drop-off bays, private taxi ranks that only licensed rank holders may use, and separate short-stay car parks for pre-booked cars.",
          "Each station page records the point our drivers use, so you walk to an agreed place rather than looking for a car among a queue of vehicles that cannot legally wait.",
        ],
      },
      {
        title: "Delays, cancellations and platform changes",
        paragraphs: [
          "Give us your train service when you book and we track it. If the train runs late the driver waits for the revised arrival; if it is cancelled we move the booking to the next realistic arrival rather than treating it as a no-show.",
          "For onward connections the same applies in reverse: if road conditions threaten a departure we tell you early enough to change the plan, instead of arriving at the barrier as the train leaves.",
        ],
      },
      {
        title: "Luggage, bikes and sports kit",
        paragraphs: [
          "Rail passengers usually travel with more than airline luggage allows — full-size cases, bike boxes, ski bags, golf travel covers and instrument cases all appear regularly on station runs.",
          "List these when you book. We size the vehicle around the load, which sometimes means an estate or people carrier for two passengers rather than a saloon.",
        ],
      },
      {
        title: "Station to airport transfers",
        paragraphs: [
          "A large share of station work is the link leg: rail into a city, then road out to an airport that has no direct rail service, or the reverse after a late landing when the last train has gone.",
          "Because these legs are timed against a flight, we quote them as airport transfers with the same flight tracking and waiting-time allowance as a home pick-up.",
        ],
      },
    ],
    faqs: [
      {
        q: "What happens if my train is delayed?",
        a: "We track the service you give us and hold the driver for the revised arrival time. If the train is cancelled, contact us and we will move the booking to your next realistic arrival.",
      },
      {
        q: "Where will the driver meet me at the station?",
        a: "At the pick-up point named on the station page, which is a location where private cars may legally wait. The driver confirms it by message before setting off so there is no ambiguity on arrival.",
      },
      QUOTE_FAQ,
      CHANGE_FAQ,
    ],
  },

  "cruise-ports": {
    sections: [
      {
        title: "Working backwards from your boarding window",
        paragraphs: [
          "Cruise embarkation runs to a fixed slot, and terminals close their check-in well before departure. We plan the journey from that slot rather than from the fastest possible driving time, adding margin for the roads that reliably congest on sailing days.",
          "Most UK cruise terminals also sit outside the nearest city, so the drive from an airport or hotel is longer than passengers expect. Each port page states realistic driving times from the airports and city centres people actually arrive from.",
        ],
      },
      {
        title: "Luggage decides the vehicle",
        paragraphs: [
          "Cruise passengers travel heavy: large hold cases per person, plus formalwear bags and, on longer sailings, a second case each. A saloon that comfortably suits an airport couple will not take a fortnight's cruise luggage.",
          "Tell us the case count per passenger and we quote the class that fits, usually an estate, SUV or people carrier for two to four passengers.",
        ],
      },
      {
        title: "Disembarkation day",
        paragraphs: [
          "Ships clear passengers in waves by deck or luggage colour, so exact release times vary. For the return leg we agree a pick-up window and the driver waits at the terminal's designated collection area.",
          "If you have a same-day flight, tell us the departure time when booking so the leg is planned against the airport check-in rather than the ship's schedule alone.",
        ],
      },
      {
        title: "Groups sailing together",
        paragraphs: [
          "Family and friend groups usually arrive from different places but need to reach the terminal at the same time. We can run several vehicles on one booking reference so the arrivals are coordinated.",
          "For larger parties, minibus and coach classes carry the group and their luggage in one movement, which is normally cheaper than three or four cars.",
        ],
      },
    ],
    faqs: [
      {
        q: "How early should the car collect me on embarkation day?",
        a: "We plan the pick-up from your check-in slot and add road-traffic margin, so the exact time depends on the route. Send us your boarding window and we will confirm a collection time with the quote.",
      },
      {
        q: "Will the vehicle take full cruise luggage?",
        a: "Yes, provided you tell us the number of large cases per passenger. Cruise loads usually need an estate, SUV or people carrier rather than a saloon, and we quote the class that fits.",
      },
      QUOTE_FAQ,
      CHANGE_FAQ,
    ],
  },

  universities: {
    sections: [
      {
        title: "Move-in and move-out weekends",
        paragraphs: [
          "Term-start arrivals and end-of-year move-outs are the heaviest journeys we run: bedding, kitchen boxes, a term of clothes and study equipment for one passenger. These need a van-sized boot, not a saloon.",
          "Campuses also restrict vehicle access on those weekends, with one-way systems and timed unloading bays outside halls. Each university page names the access point drivers use, so the load goes to the right door.",
        ],
      },
      {
        title: "Airport and station runs during term",
        paragraphs: [
          "The routine student journey is the airport or station run at the start and end of each term, often with an early flight or a late landing. Both are timed against a flight or service, with tracking and a stated waiting allowance.",
          "For international students arriving for the first time, we agree the arrivals meeting point in advance and the driver holds a name board, which matters most on a first landing in an unfamiliar airport.",
        ],
      },
      {
        title: "Bookings a parent or department can arrange",
        paragraphs: [
          "A journey does not have to be booked by the person travelling. Parents regularly arrange and pay for a student's transfer, and departments book for visiting academics, interview candidates and open-day guests.",
          "Give us both sets of contact details when the booker is not the passenger, so the driver contacts the traveller while updates also reach whoever arranged it.",
        ],
      },
      {
        title: "Group and faculty travel",
        paragraphs: [
          "Sports teams, society trips and field-course groups travel with kit and need one vehicle rather than several. Minibus and coach classes cover these, including return legs late at night after fixtures or events.",
          "Departments booking repeatedly can run travel on an account so journeys are consolidated onto a single monthly invoice with cost-centre references.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can a parent book and pay for a student's journey?",
        a: "Yes. Provide the student's phone number as the passenger contact and your own as the booker, and we will keep both informed while the driver contacts the traveller directly.",
      },
      {
        q: "Will one vehicle take a full move-in load?",
        a: "Tell us what you are bringing and we quote a class sized for it. Full move-in loads normally need a large people carrier or minibus even for a single passenger.",
      },
      QUOTE_FAQ,
      CHANGE_FAQ,
    ],
  },

  hospitals: {
    sections: [
      {
        title: "Appointments and admissions",
        paragraphs: [
          "Hospital journeys are timed against an appointment, not a rough arrival window, and hospital car parks are frequently full at peak clinic hours. We plan the pick-up so you reach the correct entrance with time to find the department.",
          "Each hospital page names the entrance our drivers use, which matters on large sites where outpatient, maternity and day-surgery entrances can be several minutes' walk apart.",
        ],
      },
      {
        title: "Discharges and open return times",
        paragraphs: [
          "Discharge times move. Rather than booking a fixed return that may be hours out, tell us it is a discharge and we hold the journey loosely: you call when the ward releases you and the driver comes in.",
          "For day procedures where you cannot drive afterwards, the same arrangement covers the trip home with a driver who can assist to the door.",
        ],
      },
      {
        title: "Accessibility and assistance",
        paragraphs: [
          "Tell us about mobility needs when booking: step height, folding wheelchair or walking frame stowage, whether a passenger needs help from the door to the car, and whether a companion is travelling.",
          "We match a vehicle with a suitable step and boot, and brief the driver so the assistance is arranged rather than improvised at the kerb.",
        ],
      },
      {
        title: "Long-distance and specialist referrals",
        paragraphs: [
          "Specialist treatment often means travelling well outside your own health board or trust area, sometimes repeatedly over a course of treatment.",
          "These runs are quoted as long-distance private journeys, and repeat courses can be arranged on one reference so you are not rebooking from scratch each week.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can you collect me when I am discharged, if I do not know the time?",
        a: "Yes. Book it as a discharge and call us when the ward releases you. We hold the journey open rather than fixing a time you may miss.",
      },
      {
        q: "Do you carry wheelchairs and walking frames?",
        a: "Folding wheelchairs and frames travel regularly. Tell us at booking so we allocate a vehicle with a suitable step and boot space, and brief the driver on the assistance needed.",
      },
      QUOTE_FAQ,
      CHANGE_FAQ,
    ],
  },

  attractions: {
    sections: [
      {
        title: "Parking is the real constraint",
        paragraphs: [
          "At most popular UK landmarks the visit is easy and the parking is not: car parks fill by mid-morning, overflow fields close in wet weather, and the nearest legal drop-off can be a walk from the entrance.",
          "Each attraction page records the drop-off point, so you are set down close to the entrance while the driver deals with waiting and parking separately.",
        ],
      },
      {
        title: "How long to allow on site",
        paragraphs: [
          "Timed-entry tickets, guided tours and seasonal closures all change how long a stop takes. A castle with a timed slot behaves differently from a coastal viewpoint where twenty minutes is enough.",
          "We plan itineraries around the on-site time you want, rather than fitting sites into a fixed loop and rushing each one.",
        ],
      },
      {
        title: "Combining stops into one day",
        paragraphs: [
          "Many of these sites sit within an hour of each other, so two or three make a comfortable private day out with the driver waiting between stops and your belongings staying in the car.",
          "Adding stops to a transfer works the same way: an airport run can take in a landmark on the route, quoted with the additional stop shown separately before you confirm.",
        ],
      },
      {
        title: "Weather, seasons and daylight",
        paragraphs: [
          "In winter, short daylight decides how much fits into a day, particularly for viewpoints and outdoor sites in the Highlands and rural Wales.",
          "We flag it when a planned itinerary runs past useful light, and suggest reordering the stops instead of leaving you at a dark site.",
        ],
      },
    ],
    faqs: [
      {
        q: "Does the driver wait while we visit?",
        a: "On day itineraries, yes — the car stays with you, so you can leave coats and bags on board and set the pace at each stop.",
      },
      {
        q: "Can you add a landmark stop to an airport transfer?",
        a: "Yes. Add the stop when booking and the extra distance and waiting time appear as separate lines in the quote before you confirm.",
      },
      QUOTE_FAQ,
      CHANGE_FAQ,
    ],
  },

  distilleries: {
    sections: [
      {
        title: "Everyone can taste",
        paragraphs: [
          "The reason to book a driver for a distillery day is straightforward: nobody in the group has to stay sober to drive, and nobody has to hand back a tasting.",
          "Drink-drive limits in Scotland are lower than in England and Wales, which catches out visitors planning to drive between sites themselves.",
        ],
      },
      {
        title: "A realistic day is two or three distilleries",
        paragraphs: [
          "Standard tours run 60 to 90 minutes, tastings add time, and the roads between distilleries are single-carriageway and slow. Three visits is a full day; four means rushing all of them.",
          "Tours also need booking directly with each distillery in advance. Tell us your confirmed slots and we build the driving around them.",
        ],
      },
      {
        title: "Regions and driving distances",
        paragraphs: [
          "Speyside packs many distilleries into a small area, so a day there covers more ground per hour than one on Islay or in the western Highlands, where distances between sites are much longer.",
          "Each distillery page notes the drive from the nearest cities and which neighbouring sites realistically pair with it.",
        ],
      },
      {
        title: "Purchases and travelling on",
        paragraphs: [
          "Bottles bought on site travel in the car rather than being carried between stops, and we allow for boot space when a group intends to buy.",
          "If you are flying home the same trip, remember bottles must go in checked luggage; tell us if the day ends at an airport so the timing accounts for bag drop.",
        ],
      },
    ],
    faqs: [
      {
        q: "How many distilleries fit into one day?",
        a: "Two or three, depending on the region. Tours run 60 to 90 minutes and the connecting roads are slow, so a fourth visit usually means cutting the others short.",
      },
      {
        q: "Do you book the distillery tours for us?",
        a: "Tours are booked directly with each distillery, which also lets you choose the tour and tasting level. Send us the confirmed times and we plan the driving around them.",
      },
      QUOTE_FAQ,
      CHANGE_FAQ,
    ],
  },

  corporate: {
    sections: [
      {
        title: "Site access and pick-up points",
        paragraphs: [
          "Business parks, campuses and financial districts each set their own rules for vehicle access: barrier codes, visitor bays, marshalled loading zones and streets where cars cannot stop at all.",
          "Each corporate location page records where a driver can legitimately collect, so visitors and staff are not directed to a door where the car would be moved on.",
        ],
      },
      {
        title: "Account travel and invoicing",
        paragraphs: [
          "Accounts remove per-trip payment: journeys are consolidated onto one monthly invoice, with cost-centre, project or PO references carried on each line for your finance team.",
          "Bookers can arrange travel for colleagues and visitors without handling payment, and repeat journeys can run on a standing reference rather than being re-entered each time.",
        ],
      },
      {
        title: "Visiting clients and airport meets",
        paragraphs: [
          "For inbound visitors we track the flight, meet at arrivals with a name board and take them directly to the office or hotel, which removes the arrival uncertainty from your side of the meeting.",
          "Return legs are planned against the departure time and check-in window, not just the driving time from the office.",
        ],
      },
      {
        title: "Events, roadshows and multi-car movements",
        paragraphs: [
          "Board meetings, conferences and client events often need several vehicles arriving together, or a shuttle pattern between a venue and hotels across a day.",
          "These run on one reference with a single point of contact, so changes on the day are handled once rather than car by car.",
        ],
      },
    ],
    faqs: [
      {
        q: "How does a corporate account work?",
        a: "Your team books without paying per trip. Journeys are consolidated onto a monthly invoice carrying the cost-centre or PO references you need for reconciliation.",
      },
      {
        q: "Can we book travel for visitors and clients?",
        a: "Yes. Give us the visitor's contact details as the passenger and your own as the booker; the driver contacts them directly while updates also reach you.",
      },
      {
        q: "Can you cover several vehicles for one event?",
        a: "Yes. Multi-car movements and venue shuttles run on a single booking reference with one point of contact for changes on the day.",
      },
      CHANGE_FAQ,
    ],
  },

  guides: {
    sections: [
      {
        title: "Written from journeys we drive",
        paragraphs: [
          "These guides come from routes our drivers cover regularly. Where we quote a driving time it reflects the road as it behaves at a given hour, not a mapping estimate taken at 3am with clear traffic.",
          "That includes the parts route planners omit: where a single-carriageway section slows everything down, which airport approaches jam at commuter hours, and which stops are genuinely worth breaking a long drive for.",
        ],
      },
      {
        title: "How to use them",
        paragraphs: [
          "Guides are reference reading rather than booking pages. Read them to plan a trip, then follow the links through to the airport, station, area or tour page that covers the journey you need.",
          "Where a guide describes an itinerary, the linked page shows how the same route works as a private day out with a driver waiting between stops.",
        ],
      },
      {
        title: "What we do not do",
        paragraphs: [
          "We do not publish invented reviews, guaranteed timings or seasonal claims we cannot stand behind. Opening hours and ticket rules change, so check them with the venue before you travel.",
          "If a guide is out of date because a road, terminal or attraction has changed, tell us and we will correct it.",
        ],
      },
      {
        title: "Turning a guide into a booking",
        paragraphs: [
          "Every guide links to the relevant transfer or tour page, where you can enter the pick-up and drop-off and get a quote for the vehicle class that fits your group and luggage.",
          "Quotes are agreed before you travel and our team confirms the booking, so nothing is charged at the moment you submit the form.",
        ],
      },
    ],
    faqs: [
      {
        q: "Are the driving times in these guides reliable?",
        a: "They reflect journeys our drivers run regularly, including the times of day when specific roads slow down. Treat them as realistic planning figures rather than guarantees, since traffic and weather vary.",
      },
      QUOTE_FAQ,
      PAY_FAQ,
      CHANGE_FAQ,
    ],
  },
};
