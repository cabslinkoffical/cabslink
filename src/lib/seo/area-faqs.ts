/**
 * The FAQ list shown on area (/areas/:slug) pages. Shared by the visible
 * FaqBlock in AreaLocationPage and the FAQPage JSON-LD in auto-seo, so the
 * structured data always matches exactly what a visitor sees. Every answer is
 * built from the page's own data or the shared FACT_TEXT rules.
 */
import type { Destination } from "@/lib/destinations.functions";
import { FACT_TEXT } from "@/lib/site-facts";

export function buildAreaFaqs(ctx: {
  destination: Destination;
  airports?: Destination[];
}): { q: string; a: string }[] {
  const d = ctx.destination;
  const name = d.display_name ?? d.name;
  const airport = ctx.airports?.[0];
  const airportName = airport ? airport.display_name ?? airport.name : "Edinburgh Airport";

  return [
    {
      q: `How much is a taxi from ${name} to ${airportName}?`,
      a: `Fares from ${name} to ${airportName} are fixed and quoted instantly on our booking page. Prices depend on vehicle class (executive saloon, MPV, van) — start a quote to see the exact total.`,
    },
    {
      q: `Can I pre-book an airport transfer from ${name}?`,
      a: `Yes — book online 24/7 or by phone. Pre-booked transfers include flight tracking and meet-and-greet at no extra cost.`,
    },
    {
      q: `Do you offer meet and greet at the airport?`,
      a: `Yes. ${FACT_TEXT.meetGreet} ${FACT_TEXT.airportWait}`,
    },
    {
      q: `Can I book a larger vehicle for a group in ${name}?`,
      a: `Yes. MPVs and eight-seater vans are available for group and family transfers. Exact seats and bags for every class are listed on our fleet page.`,
    },
    {
      q: `Are child seats available?`,
      a: `Yes — child, booster and infant seats can be added during checkout at no extra charge (subject to availability).`,
    },
    {
      q: `Do you provide corporate transport in ${name}?`,
      a: `Yes. Business accounts include monthly billing, priority dispatch, and dedicated account management. Visit our corporate page to open an account.`,
    },
  ];
}
