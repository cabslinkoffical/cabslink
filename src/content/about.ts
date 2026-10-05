/**
 * About page copy. Short and factual. Business rules come from FACTS;
 * anything only the owner can confirm is marked TODO and not shown.
 */
import { FACTS, FACT_TEXT } from "@/lib/site-facts";

export const ABOUT = {
  heroTitle: "Airport transfers and private travel from Edinburgh.",
  heroSubtitle:
    "Cabslink provides pre-booked airport transfers, private hire and day tours across Scotland and the UK, with a fixed price agreed before you travel.",
  whoWeAre: [
    `${FACTS.company.legalName} is a private hire company registered in Scotland (company number ${FACTS.company.companyNumber}), based at ${FACTS.company.registeredOffice}.`,
    "We run pre-booked airport, station and cruise port transfers, corporate travel, long-distance journeys and private day tours.",
  ],
  // TODO(owner): founder name, year the business started, team size. Not shown until supplied.
  founder: null as string | null,
  yearStarted: null as number | null,
  team: null as string | null,
  howItWorks: [
    "Enter your journey and get a fixed price",
    "Pay by card to confirm",
    "Your driver is assigned",
    "Airport pickups are flight-tracked",
    "Your driver meets you",
  ],
  promises: [
    { t: "Fixed prices", d: "The price you see before booking is the price you pay for that journey." },
    { t: "Meet and greet", d: FACT_TEXT.meetGreet },
    { t: "Airport waiting", d: FACT_TEXT.airportWait },
    { t: "Cancellation", d: `${FACT_TEXT.transferCancellation} ${FACT_TEXT.tourCancellation}` },
    { t: "Card payment", d: FACT_TEXT.payment },
  ],
  faqs: [
    { q: "Do you monitor flights?", a: "Yes. Airport pickups are linked to your flight number so the pickup moves with an early or late landing." },
    { q: "How long will the driver wait at the airport?", a: FACT_TEXT.airportWait },
    { q: "Is meet and greet included?", a: FACT_TEXT.meetGreet },
    { q: "How do I pay?", a: FACT_TEXT.payment },
    { q: "Can I cancel my booking?", a: `${FACT_TEXT.transferCancellation} ${FACT_TEXT.tourCancellation}` },
    { q: "Do you provide child seats?", a: "Yes, on request. Tell us the child's age and weight when booking so the right seat is fitted." },
  ],
} as const;
