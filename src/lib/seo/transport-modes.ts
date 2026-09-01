/**
 * "How to get there" comparison data for journey (`/routes/*`) pages.
 *
 * HARD RULES for this file — read before editing:
 *  1. Every fare, journey time and frequency here must come from the
 *     operator's own published information. Nothing is estimated, averaged or
 *     inferred. If a figure cannot be verified, the mode is OMITTED for that
 *     journey rather than guessed at.
 *  2. Each mode carries a `source` URL so any claim can be re-checked.
 *  3. `lastChecked` is the date the whole block was verified. Operator fares
 *     change; the page says so in plain language.
 *  4. Where a public option is cheaper or faster than a private car, the copy
 *     says so. This file is not marketing.
 */

export type TransportModeKind = "bus" | "coach" | "train" | "tram" | "park-and-ride" | "car";

export type TransportOption = {
  kind: TransportModeKind;
  /** Operator's own name, e.g. "Lothian Buses". */
  operator: string;
  /** Service as the operator brands it, e.g. "Airlink 100". */
  service: string;
  /** Published single fare, exactly as advertised. */
  fare: string;
  /** Published or operator-stated journey time. */
  duration: string;
  /** How often it runs, in the operator's own terms. */
  frequency: string;
  /** First and last departures, where published. */
  firstLast?: string;
  /** Where it actually picks up and drops off. */
  stops: string;
  /** Honest trade-off. Say the awkward part. */
  tradeOff: string;
  /** URL the figures above were read from. */
  source: string;
};

export type JourneyTransportComparison = {
  /** ISO date the figures were last verified against operator sources. */
  lastChecked: string;
  /** One honest sentence framing the choice for this specific journey. */
  verdict: string;
  options: TransportOption[];
  /** Who a private car is genuinely the right answer for on this journey. */
  carSuitsWhen: string[];
};

/**
 * Keyed by journey slug in `src/lib/seo/journeys.ts`. A journey with no entry
 * renders no comparison section at all.
 */
export const JOURNEY_TRANSPORT: Record<string, JourneyTransportComparison> = {};

export function getJourneyTransport(slug: string): JourneyTransportComparison | null {
  return JOURNEY_TRANSPORT[slug] ?? null;
}
