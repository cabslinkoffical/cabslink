/**
 * Code-defined editorial guides served at `/guides/:slug`.
 *
 * These take precedence over any `destinations` row of type `guide` with the
 * same slug. They exist in code because they are long-form, hand-verified
 * reference pages rather than templated location content.
 *
 * RULES:
 *  - Nothing here is generated from a template. If a guide would only restate
 *    another with a place name swapped, it does not get written.
 *  - Fares, admission prices, journey times and timetables are the operator's
 *    or attraction's own published figures, each with a source URL. Anything
 *    unverifiable is left out, not estimated.
 *  - `lastChecked` is surfaced on the page, with a note that prices change.
 */
import type { JourneyTransportComparison } from "@/lib/seo/transport-modes";

export type GuideSection = {
  heading: string;
  /** Paragraphs of body copy. */
  body: string[];
  /** Optional bullet list rendered after the paragraphs. */
  bullets?: string[];
};

export type DayTripEntry = {
  name: string;
  /** Road distance from Edinburgh in miles. */
  miles: number;
  /** Typical driving time, e.g. "1h 10m". */
  driveTime: string;
  /** How long the trip realistically needs, e.g. "Half day". */
  timeNeeded: string;
  /** Two or three concrete facts. No adjectives-only copy. */
  whatsThere: string;
  /** Honest public transport answer, including when there isn't a good one. */
  publicTransport: string;
  /** Admission or price detail, only when published. */
  admission?: string;
  /** Our matching tour page, when one genuinely exists. */
  tourSlug?: string;
  /** Journey page for the same corridor, when one exists. */
  routeSlug?: string;
  /** Source for the facts above. */
  source?: string;
};

export type GuideRecord = {
  slug: string;
  /** Kept out of the sitemap and served noindex while awaiting sign-off. */
  review?: boolean;
  /** On-page H1. */
  h1: string;
  metaTitle: string;
  metaDescription: string;
  /** Short label used in listings. */
  cardTitle: string;
  cardBlurb: string;
  /** ISO date the figures in this guide were verified. */
  lastChecked: string;
  /** Lead paragraphs. */
  intro: string[];
  /** Optional mode-by-mode comparison table (same component as route pages). */
  comparison?: JourneyTransportComparison;
  /** Optional day-trip listing. */
  dayTrips?: DayTripEntry[];
  /** Prose sections rendered after the comparison / listing. */
  sections?: GuideSection[];
  faqs: { q: string; a: string }[];
  /** Internal links out of the guide. */
  related?: { label: string; to: string }[];
};

export const GUIDES: GuideRecord[] = [];

export function getGuide(slug: string): GuideRecord | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function guidePath(slug: string): string {
  return `/guides/${slug}`;
}

/** Guides advertised in the sitemap — review drafts are excluded. */
export function publishedGuidePaths(): string[] {
  return GUIDES.filter((g) => !g.review).map((g) => guidePath(g.slug));
}

export function publishedGuides(): GuideRecord[] {
  return GUIDES.filter((g) => !g.review);
}
