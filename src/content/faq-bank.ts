/**
 * Answers to the owner's FAQ question bank (Cabslink_FAQ_Question_Bank.xlsx).
 * `n` is the question number in that sheet. Only questions that can be
 * answered from verified project facts (FACTS, live vehicle classes, booking
 * features, existing policy pages) appear here. Questions that need an owner
 * answer (VAT, licensing, tipping, pets, same-day cut-off, driver details,
 * night surcharges…) are deliberately left out — never guess them.
 */
import { FACTS, FACT_TEXT } from "@/lib/site-facts";
import { SITE } from "@/lib/site";

export type BankFaq = { n: number; q: string; a: string };
export type BankGroup = { id: string; title: string; items: BankFaq[] };

export const FAQ_GROUPS: BankGroup[] = [
  {
    id: "booking",
    title: "Booking and prices",
    items: [
      {
        n: 1,
        q: "How do I book a private transfer with Cabslink?",
        a: "Enter your pickup, drop-off, date and time in the booking form, confirm how many passengers and bags you have, then choose a vehicle. You see a fixed price for each vehicle straight away, and you can pay online or choose to pay another way.",
      },
      {
        n: 2,
        q: "Is the price fixed, or can it change on the day?",
        a: `The price is fixed when you book and does not change with traffic. It only changes if the booking changes: extra stops, a different route, or airport waiting beyond the free ${FACTS.airportWait.freeMinutes} minutes. ${FACT_TEXT.feesIncluded}`,
      },
      {
        n: 30,
        q: "Is the price per person or per vehicle?",
        a: "Per vehicle. Everyone travelling in the car shares the same fixed price.",
      },
      {
        n: 10,
        q: "Can I book a return journey at the same time?",
        a: 'Yes. Press "Add return" in the booking form and enter the return date and time; both journeys are priced together before you pay.',
      },
      {
        n: 27,
        q: "Can I add an extra stop on the way?",
        a: 'Yes. Press "Add stop" in the booking form. Each extra pickup or drop-off has a small charge plus any extra distance, and it is all included in the fixed price you see before paying.',
      },
      {
        n: 19,
        q: "Do you offer corporate accounts?",
        a: "Yes. Companies can open a free corporate account on our Corporate Booking page, with no minimum monthly spend, and are invoiced for journeys taken.",
      },
      {
        n: 18,
        q: "Can I choose a specific car model?",
        a: "You book a vehicle class, such as Saloon, Executive Saloon or Seven-Seater MPV, rather than an exact model. The class sets the number of seats and luggage space you are guaranteed.",
      },
    ],
  },
  {
    id: "payment",
    title: "Payment and receipts",
    items: [
      { n: 4, q: "How do I pay? Can I pay by card?", a: FACT_TEXT.payment },
      {
        n: 31,
        q: "Can I pay in US dollars or euros?",
        a: "Fares are shown and charged in pounds sterling (GBP). If your card is in another currency, your card provider converts the amount.",
      },
      {
        n: 6,
        q: "Can I get a receipt or invoice for my company?",
        a: "Your booking confirmation, showing the fare you paid, is emailed to the address you enter when booking. Companies can open a free corporate account on our Corporate Booking page and receive invoices for their journeys.",
      },
    ],
  },
  {
    id: "changes",
    title: "Changes and cancellations",
    items: [
      {
        n: 11,
        q: "How do I change or cancel my booking?",
        a: `Use Manage Booking with your booking reference, booking email and last name, or call ${SITE.phoneUK}. ${FACT_TEXT.transferCancellationShort}.`,
      },
      {
        n: 12,
        q: "What is your cancellation policy?",
        a: `${FACT_TEXT.transferCancellation} ${FACT_TEXT.tourCancellation}`,
      },
    ],
  },
  {
    id: "airport",
    title: "Airport pickups",
    items: [
      { n: 33, q: "What is a meet and greet airport transfer?", a: FACT_TEXT.meetGreet },
      { n: 38, q: "How much free waiting time do I get at the airport?", a: FACT_TEXT.airportWait },
      {
        n: 39,
        q: "How much do you charge for extra waiting time?",
        a: `After the free ${FACTS.airportWait.freeMinutes} minutes, waiting time is charged by the hour; the rate depends on the vehicle and is shown when you book. You can also pre-book extra waiting time when you book.`,
      },
    ],
  },
  {
    id: "contact",
    title: "Contact and accessibility",
    items: [
      {
        n: 15,
        q: "Do you have a phone number I can contact?",
        a: `Call us on ${SITE.phoneUK} or email ${SITE.email}. You can also book online at any time.`,
      },
      {
        n: 22,
        q: "Can you carry a wheelchair or mobility scooter?",
        a: "Our MPV and van classes carry folding wheelchairs, walkers and mobility scooters in the luggage area; tell us when you book. For a wheelchair accessible vehicle, where the passenger stays seated in their wheelchair, book at least 24 hours ahead and we confirm availability first. Assistance dogs travel free on every journey.",
      },
      {
        n: 23,
        q: "Do you have child seats and booster seats?",
        a: "Yes. Add a rear-facing baby seat, a forward-facing toddler seat or a high-back booster in the booking form. Each seat has a small charge shown in your quote.",
      },
    ],
  },
];

/** Vehicle questions answered from the live vehicle classes. */
export type FaqVehicle = {
  name: string;
  passengers: number | null;
  large_luggage: number | null;
  cabin_bags: number | null;
  fuel_type?: string | null;
};

export function vehicleFaqs(classes: FaqVehicle[]): BankFaq[] {
  const sized = classes
    .filter((c) => c.passengers && c.large_luggage != null)
    .sort((a, b) => (a.passengers ?? 0) - (b.passengers ?? 0));
  if (!sized.length) return [];
  const list = sized
    .map((c) => `${c.name}: up to ${c.passengers} passengers, ${c.large_luggage} large cases and ${c.cabin_bags ?? 0} cabin bags`)
    .join("; ");
  const out: BankFaq[] = [
    {
      n: 25,
      q: "How much luggage can I bring?",
      a: `It depends on the vehicle class. ${list}. For golf bags, skis or prams, choose a class with more large-case space.`,
    },
  ];
  const big = sized.filter((c) => (c.passengers ?? 0) >= 8);
  if (big.length) {
    out.push({
      n: 43,
      q: "Do you have a vehicle big enough for 8 people and luggage?",
      a: `Yes. ${big.map((c) => `The ${c.name} seats up to ${c.passengers} passengers with ${c.large_luggage} large cases`).join(". ")}. The driver is in addition to these seats.`,
    });
  }
  const four = sized.filter((c) => (c.passengers ?? 0) >= 4 && (c.large_luggage ?? 0) >= 4);
  if (four.length) {
    out.push({
      n: 241,
      q: "Which vehicle do I need for 4 people and 4 large suitcases?",
      a: `Choose a class with room for at least 4 passengers and 4 large cases: ${four.map((c) => c.name).join(", ")}.`,
    });
  }
  const electric = sized.filter((c) => /electric/i.test(c.fuel_type ?? "") || /electric/i.test(c.name));
  if (electric.length) {
    out.push({
      n: 32,
      q: "Are your vehicles electric or hybrid?",
      a: `You can choose an electric vehicle when you book: ${electric.map((c) => c.name).join(" or ")}.`,
    });
  }
  return out;
}

/** Every answered question number, for the owner's tracking sheet. */
export const ANSWERED_ON_FAQ_PAGE = [...FAQ_GROUPS.flatMap((g) => g.items.map((i) => i.n)), 25, 43, 241, 32];
