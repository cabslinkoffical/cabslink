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
    // Waiting after the free period is priced per vehicle class in the Extras
    // admin and shown at booking; pages never state a rate.
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
  airportWait: `Airport pickups include ${FACTS.airportWait.freeMinutes} minutes of free waiting from the actual landing time. After the free period, waiting time is charged by the hour; the rate depends on the vehicle and is shown when you book.`,
  airportWaitShort: `${FACTS.airportWait.freeMinutes} minutes free from actual landing`,
  meetGreet: "Meet and greet is available on every booking for a small extra charge, shown in your quote: your driver waits in arrivals with a name board.",
  transferCancellation: `Transfers: free cancellation more than ${FACTS.transferCancellation.freeOverHours} hours before pickup, 50% of the fare from ${FACTS.transferCancellation.halfFromHours} to ${FACTS.transferCancellation.halfToHours} hours, and the full fare under ${FACTS.transferCancellation.halfFromHours} hours.`,
  transferCancellationShort: `Free cancellation more than ${FACTS.transferCancellation.freeOverHours} hours before pickup`,
  tourCancellation: `Tours: free cancellation more than ${FACTS.tourCancellation.freeOverHours} hours before the start, 50% of the price from ${FACTS.tourCancellation.halfFromHours} to ${FACTS.tourCancellation.halfToHours} hours, and the full price under ${FACTS.tourCancellation.halfFromHours} hours or for a no-show.`,
  tourCancellationShort: `Free cancellation more than ${FACTS.tourCancellation.freeOverHours} hours before the tour`,
  payment: `Pay online by card through Stripe at the end of the booking (${cardList}), or choose to pay another way: cash, bank transfer or another method agreed with our team. No card details are stored on cabslink.com.`,
  payCashOrTransfer: "Yes. Complete your booking, skip the online payment, and message us on WhatsApp or email with your booking reference. We'll confirm your booking and arrange payment.",
  confirmationRule: "A card booking is confirmed as soon as the payment succeeds. If you pay another way, your booking is confirmed when our team confirms it after you contact us.",
  feesIncluded: "Your fixed fare includes road tolls and standard airport drop-off and pickup charges, so there is nothing extra to pay for them on the day.",
  feesIncludedShort: "Tolls and airport fees included",
  flightTracking: "Add your flight number when you book and our team will track your flight and adjust your pickup if it lands early or late.",
  flightNumberRequired: "Please add your flight number so we can track your flight.",
  companyLine: `${FACTS.company.legalName} · Company number ${FACTS.company.companyNumber} · Registered office: ${FACTS.company.registeredOffice}`,
} as const;
