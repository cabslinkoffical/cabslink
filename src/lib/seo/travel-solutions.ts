/**
 * Customer-need ("Travel Solutions") content.
 *
 * These pages target audience/need intent and always defer service identity
 * to SERVICE_REGISTRY. Slugs here are the only source of truth for
 * /travel-solutions/{slug} URLs.
 */
import type { SolutionContent } from "@/components/site/SolutionPage";
import { DEFAULT_COVERAGE } from "@/components/site/ServicePillarPage";
import corporateImg from "@/assets/services/corporate.jpg.asset.json";
import stationImg from "@/assets/services/station.jpg.asset.json";
import airportImg from "@/assets/services/airport.jpg.asset.json";
import toursImg from "@/assets/services/tours.jpg.asset.json";
import eventsImg from "@/assets/services/events.jpg.asset.json";

const baseIncluded = [
  "Fixed price confirmed before travel",
  "Flight, train and ferry tracking where relevant",
  "Free waiting time and no surge pricing",
  "Licensed drivers and inspected vehicles",
  "24/7 UK-based booking support",
  "Card, invoice or account payment",
];

export const TRAVEL_SOLUTIONS: Record<string, SolutionContent> = {
  "business-travel": {
    slug: "business-travel",
    eyebrow: "Business travel",
    h1: "Business travel that runs to your diary, not the traffic.",
    subtitle:
      "Account-billed travel for teams, clients and visiting colleagues across Scotland and the UK — booked once, tracked end to end.",
    breadcrumbLabel: "Business travel",
    hubTitle: "Business travel",
    hubBlurb: "Account billing, priority dispatch and client-ready vehicles for teams.",
    metaTitle: "Business Travel Scotland — Account Transfers | Cabslink",
    metaDescription:
      "Business travel across the UK: account billing, executive vehicles, airport meet & greet and priority dispatch for visiting clients.",
    image: corporateImg.url,
    imageAlt: "Executive saloon collecting a business traveller outside a city office",
    intro: {
      title: "One account, every journey your business needs",
      body: "Finance teams get a single monthly invoice with cost centres; travellers get a named driver, a tracked flight and a vehicle that looks right in front of a client. Bookings can be placed by a PA, by the traveller, or forwarded from an itinerary email.",
    },
    needs: [
      {
        need: "Our flights slip and the car is gone.",
        answer:
          "We track the inbound flight and shift the pickup automatically, with free waiting time built in — nobody rebooks anything.",
      },
      {
        need: "Expenses are a monthly headache.",
        answer:
          "Journeys are billed to your account with references and cost centres, then settled on one invoice instead of dozens of receipts.",
      },
      {
        need: "We need a vehicle that suits a client meeting.",
        answer:
          "Executive saloons and V-Class MPVs are allocated by class, so the standard is the same in Edinburgh as it is in Aberdeen.",
      },
      {
        need: "Someone always books at short notice.",
        answer:
          "Priority dispatch for account holders, with 24/7 phone cover for same-day and out-of-hours requests.",
      },
    ],
    services: ["corporate-travel", "executive-transfers", "airport-transfers", "hourly-hire", "long-distance-transfers"],
    included: [...baseIncluded, "Named account manager and monthly reporting"],
    coverage: DEFAULT_COVERAGE,
    faqs: [
      {
        q: "How do I open a business account?",
        a: "Send us your company details and expected monthly volume through the corporate page. Accounts are usually live within one working day, with 30-day invoicing available after the first month.",
      },
      {
        q: "Can several people book on the same account?",
        a: "Yes. You can nominate as many bookers as you need, and each journey can carry a reference, project code or cost centre for your own reporting.",
      },
      {
        q: "Do you cover travel outside Scotland?",
        a: "Yes — long-distance journeys run UK-wide, including cross-border runs to Newcastle, Manchester and London.",
      },
    ],
  },

  "student-travel": {
    slug: "student-travel",
    eyebrow: "Student travel",
    h1: "Student travel for arrivals, term starts and going home.",
    subtitle:
      "Airport-to-campus transfers with luggage space and a fixed price parents can pay in advance.",
    breadcrumbLabel: "Student travel",
    hubTitle: "Student travel",
    hubBlurb: "Airport-to-campus runs with luggage space and prepaid fixed fares.",
    metaTitle: "Student Airport Transfers — Campus Travel | Cabslink",
    metaDescription:
      "Student travel across Scotland: airport-to-campus transfers, term-start moves and end-of-term journeys with luggage space and fixed prepaid fares.",
    image: stationImg.url,
    imageAlt: "Student loading luggage into an MPV outside a university building",
    intro: {
      title: "Built for arrival week, not just the journey",
      body: "First arrivals often mean a long-haul flight, three cases and an address nobody has been to before. We meet inside arrivals with a name-board, load properly, and drop at the halls entrance rather than the nearest main road.",
    },
    needs: [
      {
        need: "I have more luggage than a normal car takes.",
        answer:
          "Book an estate, MPV or minibus class and tell us the case count — capacity is confirmed before you pay, not guessed on the day.",
      },
      {
        need: "My parents want to pay from another country.",
        answer:
          "The fare is fixed and can be paid by card in advance by anyone, with the confirmation emailed to both of you.",
      },
      {
        need: "I land late at night and don't know the campus.",
        answer:
          "Meet and greet inside the terminal, 24/7 cover, and a driver who takes you to the specific halls or accommodation entrance.",
      },
      {
        need: "We're a group of flatmates travelling together.",
        answer:
          "Split one minibus instead of three cars — usually cheaper per person and everyone arrives at the same time.",
      },
    ],
    services: ["university-transfers", "airport-transfers", "minibus-hire", "long-distance-transfers"],
    included: [...baseIncluded, "Luggage capacity confirmed at booking"],
    coverage: DEFAULT_COVERAGE,
    faqs: [
      {
        q: "Can I book a transfer to a specific hall of residence?",
        a: "Yes. Give us the accommodation name in the notes and the driver will drop at that entrance, which matters on large campuses like Edinburgh, Glasgow and St Andrews.",
      },
      {
        q: "What if my flight is delayed?",
        a: "We track it and move the pickup for you. Waiting time after landing is included, so a delay does not cost extra.",
      },
      {
        q: "Do you handle end-of-term moves?",
        a: "Yes — same booking process in reverse, with larger vehicle classes available for boxes and bikes.",
      },
    ],
  },

  "family-travel": {
    slug: "family-travel",
    eyebrow: "Family travel",
    h1: "Family travel with the right seats, space and patience.",
    subtitle:
      "Holiday airport runs and day trips in vehicles that actually fit the pram, the cases and everyone in the family.",
    breadcrumbLabel: "Family travel",
    hubTitle: "Family travel",
    hubBlurb: "Child seats, pram space and door-to-door holiday airport runs.",
    metaTitle: "Family Airport Transfers — Child Seats & MPVs | Cabslink",
    metaDescription:
      "Family travel across Scotland: airport transfers with child and booster seats, MPV space for prams and cases, and fixed door-to-door prices.",
    image: airportImg.url,
    imageAlt: "Family with luggage being helped into an MPV at the airport",
    intro: {
      title: "Holiday travel without the 5am scramble",
      body: "Family airport runs live or die on space and timing. We size the vehicle to your cases and pram, fit the child seats before we arrive, and build in enough margin that nobody is watching the clock on the way to the terminal.",
    },
    needs: [
      {
        need: "We need child or booster seats.",
        answer:
          "Infant, child and booster seats are requested during booking and fitted before pickup, at no extra charge subject to availability.",
      },
      {
        need: "The pram never fits with the suitcases.",
        answer:
          "Tell us the pram and case count and we allocate an MPV or larger class with the boot space to take all of it.",
      },
      {
        need: "An early flight with young children is stressful.",
        answer:
          "Door-to-door collection at a time we plan backwards from your check-in, with the driver's details sent the night before.",
      },
      {
        need: "We want a day out without driving.",
        answer:
          "Private day tours and hourly hire let you stop where you like while somebody else handles the parking and the single-track roads.",
      },
    ],
    services: ["airport-transfers", "private-hire", "tours", "minibus-hire", "cruise-transfers"],
    included: [...baseIncluded, "Child, booster and infant seats on request"],
    coverage: DEFAULT_COVERAGE,
    faqs: [
      {
        q: "Are child seats included in the price?",
        a: "Yes — child, booster and infant seats are added during booking at no extra charge, subject to availability. Please request them at least 24 hours ahead.",
      },
      {
        q: "How much luggage fits in an MPV?",
        a: "A V-Class MPV typically takes six passengers with six cases, or fewer passengers plus a pram and buggy. If in doubt, tell us the exact items and we'll confirm the class.",
      },
      {
        q: "Can we stop on the way for a long journey?",
        a: "Yes. Comfort stops on long-distance journeys are fine and don't change the fixed price.",
      },
    ],
  },

  "group-travel": {
    slug: "group-travel",
    eyebrow: "Group travel",
    h1: "Group travel where everyone arrives at the same time.",
    subtitle:
      "Minibuses, coasters and coaches with drivers for parties of 8 to 55 — one plan, one price, one arrival.",
    breadcrumbLabel: "Group travel",
    hubTitle: "Group travel",
    hubBlurb: "8 to 55 seats with drivers, coordinated as one movement.",
    metaTitle: "Group Travel Scotland — Minibus & Coach Hire | Cabslink",
    metaDescription:
      "Group travel across Scotland: minibus, coaster and coach hire with professional drivers for 8 to 55 passengers, quoted as one fixed price.",
    image: toursImg.url,
    imageAlt: "Group boarding a minibus for a Scottish tour",
    intro: {
      title: "One movement, not five separate cars",
      body: "Groups fail on coordination, not vehicles. We work out the right vehicle mix for your headcount and luggage, agree pickup points, and keep the whole party on one itinerary so the last car isn't 40 minutes behind the first.",
    },
    needs: [
      {
        need: "We don't know whether to book cars or a minibus.",
        answer:
          "Give us the headcount and luggage and we model both — usually one larger vehicle beats several cars on cost and on arrival time.",
      },
      {
        need: "People are joining from different addresses.",
        answer:
          "Multiple pickup points can be built into one route, priced up front rather than added as extras on the day.",
      },
      {
        need: "Our group is bigger than a minibus.",
        answer:
          "24-seat coasters and 55-seat coaches are available with drivers, and large vehicles are quoted on request so the price reflects the real itinerary.",
      },
      {
        need: "We need the vehicle all day, not just one leg.",
        answer:
          "Hourly and day hire keeps the same vehicle and driver with you between venues.",
      },
    ],
    services: ["group-transfers", "minibus-hire", "coach-hire", "event-transport", "tours", "hourly-hire"],
    included: [...baseIncluded, "Vehicle mix planned to your headcount and luggage"],
    coverage: DEFAULT_COVERAGE,
    faqs: [
      {
        q: "How many passengers can you carry?",
        a: "Up to 55 in a single coach, and more across multiple vehicles coordinated as one booking. Minibuses cover 8 to 16 and coasters 24.",
      },
      {
        q: "Why are some large vehicles quote-on-request?",
        a: "Coasters and coaches depend heavily on route, duration and driver hours, so we price them individually rather than showing a fare that could be wrong.",
      },
      {
        q: "Can we add multiple pickup points?",
        a: "Yes — add stops during booking and the quote includes them, so there are no surprise charges on the day.",
      },
    ],
  },

  "event-travel": {
    slug: "event-travel",
    eyebrow: "Event travel",
    h1: "Event travel timed to doors, kick-off and last orders.",
    subtitle:
      "Weddings, matches, concerts and conferences — scheduled vehicles that work around road closures and end-of-night crowds.",
    breadcrumbLabel: "Event travel",
    hubTitle: "Event travel",
    hubBlurb: "Weddings, sport and conferences with scheduled shuttles.",
    metaTitle: "Event Travel Scotland — Wedding & Concert Cars | Cabslink",
    metaDescription:
      "Event travel across Scotland: wedding cars, guest shuttles, stadium and concert transfers and conference transport scheduled around closures and crowds.",
    image: eventsImg.url,
    imageAlt: "Guests arriving at an evening event venue by private car",
    intro: {
      title: "The travel plan is part of the event",
      body: "Event days have hard deadlines and unpredictable roads. We plan drop-off points that survive closures, stagger guest shuttles so nobody waits in the rain, and hold vehicles for the return leg when 3,000 people leave at once.",
    },
    needs: [
      {
        need: "Guests are staggered across hotels.",
        answer:
          "Scheduled shuttle loops between hotels and the venue, with timings published to your guests in advance.",
      },
      {
        need: "Roads around the venue are closed.",
        answer:
          "We use pre-agreed drop-off points outside the closure and brief every driver on the same plan.",
      },
      {
        need: "Getting home after the event is chaos.",
        answer:
          "Return vehicles are held and allocated a meeting point, so you're not competing for a car at 11pm.",
      },
      {
        need: "The wedding car has to be right.",
        answer:
          "Presentation vehicles for the couple plus guest transport, coordinated on one timeline with your venue.",
      },
    ],
    services: ["event-transport", "wedding-transport", "stadium-transfers", "football-transfers", "vip-sports-hospitality", "coach-hire"],
    included: [...baseIncluded, "Written travel schedule shared before the event"],
    coverage: DEFAULT_COVERAGE,
    faqs: [
      {
        q: "How far ahead should event travel be booked?",
        a: "For weddings and multi-vehicle events, four to six weeks gives the best vehicle choice. Match days and concerts should be booked as soon as tickets are confirmed.",
      },
      {
        q: "Can you run a shuttle rather than single journeys?",
        a: "Yes. We run timed loops between hotels, venues and stations, which is usually cheaper per guest than individual transfers.",
      },
      {
        q: "Do you handle late finishes?",
        a: "Yes — we operate 24/7 and hold return vehicles for the agreed finish time, including late-night departures.",
      },
    ],
  },
};

export const SOLUTION_ORDER = [
  "business-travel",
  "student-travel",
  "family-travel",
  "group-travel",
  "event-travel",
] as const;

export function solutionList(): SolutionContent[] {
  return SOLUTION_ORDER.map((s) => TRAVEL_SOLUTIONS[s]!).filter(Boolean);
}
