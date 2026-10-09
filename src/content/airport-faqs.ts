import type { FaqItem } from "@/components/seo/FaqBlock";

/**
 * Page-specific FAQs for airport pages. Only facts the project already
 * states may appear here: no meeting points, waiting policies or
 * flight-tracking claims unless they exist in project data.
 */
// TODO(owner): confirm the exact Edinburgh Airport meeting point (which
// arrivals exit / landmark) before it is added to these answers.
export const AIRPORT_FAQS: Record<string, FaqItem[]> = {
  "/airports/edinburgh-airport": [
    {
      q: "Is the fare fixed?",
      a: "Yes. Your fare is fixed and agreed when you book. It does not change on the day.",
    },
    {
      q: "Where will my driver meet me?",
      a: "Your driver waits for you in arrivals with a name board.",
    },
    {
      q: "How do I pay?",
      a: "You pay by card through Stripe at the end of booking. You do not pay the driver.",
    },
    {
      q: "How far is Edinburgh city centre from the airport?",
      a: "The city centre is 10.3 miles away. The drive takes about 33 minutes.",
    },
    {
      q: "How long is the drive to St Andrews?",
      a: "St Andrews is 48 miles from the airport. The drive takes about 80 minutes.",
    },
    {
      q: "How long is the drive to Gleneagles?",
      a: "Gleneagles is 40 miles from the airport. The drive takes about 55 minutes.",
    },
  ],
};

export function airportFaqFor(path: string): FaqItem[] {
  return AIRPORT_FAQS[path] ?? [];
}
