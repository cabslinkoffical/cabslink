/**
 * The single source of truth for business rules shown to customers.
 * Every page that mentions waiting time, cancellation, meet and greet,
 * payment or company details must read from FACTS — never hardcode them.
 * tests/site-facts.test.ts fails if these figures appear in page files.
 */
export const FACTS = {
  company: {
    legalName: "Cabslink Limited",
    companyNumber: "SC814706",
    registeredOffice: "263a Leith Walk, Edinburgh, EH6 8NY",
    phone: "+44 333 888 2991",
  },
  airportWait: {
    freeMinutes: 60,
    /** Pence per minute after the free period. */
    perMinutePence: 50,
    perMinutePenceLarge: 75,
  },
  transferCancellation: {
    freeOverHours: 12,
    halfFromHours: 3,
    halfToHours: 12,
  },
  tourCancellation: {
    freeOverHours: 48,
    halfFromHours: 24,
    halfToHours: 48,
  },
  payment: {
    cards: ["Visa", "Mastercard", "American Express"] as const,
  },
} as const;

const pence = (p: number) => `${p}p`;
const cards = FACTS.payment.cards;
const cardList = `${cards.slice(0, -1).join(", ")} or ${cards[cards.length - 1]}`;

/** Ready-made sentences so every page states each rule the same way. */
export const FACT_TEXT = {
  airportWait: `Airport pickups include ${FACTS.airportWait.freeMinutes} minutes of free waiting from the actual landing time. After that, waiting is ${pence(FACTS.airportWait.perMinutePence)} per minute (${pence(FACTS.airportWait.perMinutePenceLarge)} per minute for larger vehicles).`,
  airportWaitShort: `${FACTS.airportWait.freeMinutes} minutes free from actual landing`,
  meetGreet: "Meet and greet is included on every airport pickup: your driver waits in arrivals with a name board.",
  transferCancellation: `Transfers: free cancellation more than ${FACTS.transferCancellation.freeOverHours} hours before pickup, 50% of the fare from ${FACTS.transferCancellation.halfFromHours} to ${FACTS.transferCancellation.halfToHours} hours, and the full fare under ${FACTS.transferCancellation.halfFromHours} hours.`,
  transferCancellationShort: `Free cancellation more than ${FACTS.transferCancellation.freeOverHours} hours before pickup`,
  tourCancellation: `Tours: free cancellation more than ${FACTS.tourCancellation.freeOverHours} hours before the start, 50% of the price from ${FACTS.tourCancellation.halfFromHours} to ${FACTS.tourCancellation.halfToHours} hours, and the full price under ${FACTS.tourCancellation.halfFromHours} hours or for a no-show.`,
  tourCancellationShort: `Free cancellation more than ${FACTS.tourCancellation.freeOverHours} hours before the tour`,
  payment: `You pay by card through Stripe at the end of the booking (${cardList}). No card details are stored on cabslink.com.`,
  companyLine: `${FACTS.company.legalName} · Company number ${FACTS.company.companyNumber} · Registered office: ${FACTS.company.registeredOffice}`,
} as const;
