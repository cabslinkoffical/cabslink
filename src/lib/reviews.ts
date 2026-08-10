/**
 * Unified review registry for Cabslink.
 *
 * WHY THIS FILE EXISTS
 * Reviews are going to arrive from several places over time — Trustpilot today,
 * then Google Business Profile, YouTube video reviews, and others. Rather than
 * scatter that across pages, every review surface on the site (the homepage
 * section, the /reviews page, the booking strips) reads from here.
 *
 * TRUTH RULES — these are not style preferences, they are correctness rules:
 *  1. A review may only appear here if it exists publicly on the channel it is
 *     attributed to. Never invent a reviewer, a score, a date, or wording.
 *  2. `excerpt` must be a SHORT VERBATIM copy of the reviewer's own words.
 *     Leave it undefined until someone has copied the real text. The UI renders
 *     the card without a quote when it is missing — that is the intended,
 *     honest fallback, not a bug to fill with a paraphrase.
 *  3. A channel is only `"live"` when there is real, publicly viewable content
 *     on it. Everything else is `"planned"` and is presented to visitors as
 *     "coming soon", never as if reviews were already there.
 *  4. No AggregateRating / Review structured data is emitted for any of this.
 *     These are third-party scores on third-party platforms; the proof we show
 *     is a visible link and correct attribution instead.
 */
import { TRUSTPILOT, type TrustpilotSnapshot } from "./trustpilot";

export type ReviewChannelId = "trustpilot" | "google" | "youtube" | "facebook" | "direct";

/**
 * "live"    — real public reviews exist on this channel right now.
 * "planned" — the channel is intended but has nothing public yet. Shown to
 *             visitors as an upcoming way to review us.
 */
export type ReviewChannelStatus = "live" | "planned";

export type ReviewChannel = {
  id: ReviewChannelId;
  /** Platform name, spelled as the platform spells it. */
  name: string;
  status: ReviewChannelStatus;
  /** What kind of review this channel collects, in plain language. */
  blurb: string;
  /** Why a traveller might choose this channel — shown on the reviews page. */
  detail: string;
  /** Public profile / channel URL. Only set once it genuinely resolves. */
  url?: string;
  /**
   * Platform brand colour, used sparingly for the channel badge so third-party
   * attribution reads as third-party. The site palette stays navy/gold.
   */
  brandColor: string;
};

/**
 * Every way a customer can (or soon will be able to) review Cabslink.
 * Order is the order shown on the reviews page.
 */
export const REVIEW_CHANNELS: ReviewChannel[] = [
  {
    id: "trustpilot",
    name: "Trustpilot",
    status: "live",
    blurb: "Independent written reviews",
    detail:
      "Our main public review profile. Reviews are hosted and moderated by Trustpilot, not by us, so we cannot edit or remove them.",
    url: TRUSTPILOT.profileUrl,
    brandColor: "#00B67A",
  },
  {
    id: "google",
    name: "Google Business Profile",
    status: "planned",
    blurb: "Star ratings on Google Maps & Search",
    detail:
      "Being set up. Once it is live you will be able to rate a journey straight from Google Maps or Search, and those ratings will show here alongside Trustpilot.",
    brandColor: "#4285F4",
  },
  {
    id: "youtube",
    name: "YouTube",
    status: "planned",
    blurb: "Video reviews from real journeys",
    detail:
      "We are inviting customers to film a short clip about their transfer or tour. Published videos will be embedded on this page, credited to the person who filmed them.",
    brandColor: "#FF0000",
  },
  {
    id: "facebook",
    name: "Facebook",
    status: "planned",
    blurb: "Recommendations from the Cabslink page",
    detail:
      "Planned. Facebook Recommendations will let travellers vouch for us to their own network, which matters for group and wedding bookings.",
    brandColor: "#1877F2",
  },
  {
    id: "direct",
    name: "Direct feedback",
    status: "planned",
    blurb: "Emailed after your journey",
    detail:
      "Planned. A short post-journey email so every passenger can tell us how it went. We will only publish direct feedback with the passenger's written permission, and it will always be labelled as collected by us rather than by an independent platform.",
    brandColor: "#DEAE25",
  },
];

export function reviewChannel(id: ReviewChannelId): ReviewChannel {
  const found = REVIEW_CHANNELS.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown review channel: ${id}`);
  return found;
}

export const liveReviewChannels = () => REVIEW_CHANNELS.filter((c) => c.status === "live");
export const plannedReviewChannels = () => REVIEW_CHANNELS.filter((c) => c.status === "planned");

/** A written review, normalised across channels. */
export type UnifiedReview = {
  /** Stable key for React lists. */
  id: string;
  channel: ReviewChannelId;
  /** Reviewer display name exactly as the channel shows it. */
  author: string;
  /** Score out of 5 as given on that channel. */
  stars: number;
  /** Human-readable date exactly as the channel displays it, e.g. "March 2026". */
  dateLabel: string;
  /** ISO date used only for newest-first sorting. Never rendered. */
  dateIso: string;
  /** Neutral topic label. Not a paraphrase and never shown as the reviewer's words. */
  topic: string;
  /** Short verbatim quote, or undefined when nobody has copied the real wording yet. */
  excerpt?: string;
  /** Link to the review or to the profile it sits on. */
  url?: string;
};

/**
 * A customer video review.
 *
 * Deliberately EMPTY: no video reviews have been published yet, and inventing a
 * YouTube ID would render a broken or — worse — an unrelated person's video.
 * Add real entries here as they are filmed and the page picks them up.
 */
export type VideoReview = {
  id: string;
  /** YouTube video ID, e.g. the "dQw4w9WgXcQ" in a watch URL. */
  youtubeId: string;
  /** Video title as published. */
  title: string;
  /** Who filmed it, credited as they wish to be. */
  author: string;
  /** Journey the video covers, e.g. "Edinburgh Airport to St Andrews". */
  journey?: string;
  dateLabel: string;
  dateIso: string;
};

export const VIDEO_REVIEWS: VideoReview[] = [];

/** Written reviews from Trustpilot, normalised into the shared shape. */
function trustpilotReviews(snapshot: TrustpilotSnapshot = TRUSTPILOT): UnifiedReview[] {
  return snapshot.reviews.map((r) => ({
    id: `trustpilot-${r.author}-${r.dateIso}`,
    channel: "trustpilot" as const,
    author: r.author,
    stars: r.stars,
    dateLabel: r.date,
    dateIso: r.dateIso,
    topic: r.topic,
    excerpt: r.excerpt,
    url: snapshot.profileUrl,
  }));
}

/**
 * Every written review we can show, newest first.
 *
 * As channels come online, concatenate their normalised reviews here — every
 * surface on the site then picks them up without further changes.
 */
export function allReviews(): UnifiedReview[] {
  return [...trustpilotReviews()].sort((a, b) => b.dateIso.localeCompare(a.dateIso));
}

/** The newest `count` reviews — used by the homepage section. */
export function latestReviews(count = 4): UnifiedReview[] {
  return allReviews().slice(0, count);
}

/** Totals for the reviews page header. Trustpilot's own count is authoritative. */
export function reviewTotals() {
  return {
    written: TRUSTPILOT.reviewCount,
    shownOnPage: allReviews().length,
    video: VIDEO_REVIEWS.length,
    liveChannels: liveReviewChannels().length,
    plannedChannels: plannedReviewChannels().length,
  };
}
