/**
 * Trustpilot proof data for Cabslink.
 *
 * SINGLE SOURCE OF TRUTH — update the values below when the public Trustpilot
 * profile changes. Nothing here may be invented: every value must be visible
 * on https://www.trustpilot.com/review/cabslink.com at the time of the update.
 *
 * There is no Trustpilot API credential or official widget configured for this
 * project, and Trustpilot blocks automated fetching of the public profile, so
 * the figures are recorded manually together with the date they were read. The
 * UI always renders `verifiedOn` next to the rating so the snapshot reads as a
 * dated snapshot rather than a live feed.
 *
 * If Trustpilot Business API access or the official widget is added later,
 * replace `TRUSTPILOT` with a server-function fetch returning the same shape —
 * every consumer reads this object only.
 */
export type TrustpilotStarShare = {
  /** 1–5 */
  stars: number;
  /** Whole-percent share of reviews at this star level, as shown on the profile. */
  percent: number;
};

export type TrustpilotReview = {
  /** Reviewer display name exactly as shown on Trustpilot. */
  author: string;
  /** Star rating the reviewer gave, 1–5. */
  stars: number;
  /** Month and year as displayed on the profile, e.g. "March 2026". */
  date: string;
  /**
   * The same month as an ISO date (first of the month — Trustpilot only shows
   * month precision on the profile). Used ONLY for sorting newest-first; never
   * displayed, because it would imply a day we cannot see.
   */
  dateIso: string;
  /**
   * Short topic label describing what the review covers. This is neutral
   * descriptive metadata for the card — NOT a paraphrase or a claim, and never
   * presented as the reviewer's words.
   */
  topic: string;
  /**
   * A SHORT VERBATIM excerpt, copied character-for-character from the review on
   * Trustpilot. Leave empty until someone has copied the real wording from the
   * profile — the UI renders the card without a quote when this is empty.
   *
   * RULES when filling this in:
   *  - Copy exactly. Never paraphrase, tidy up, or strengthen the wording.
   *  - Keep it to roughly one sentence; link out for the rest.
   *  - If you cannot see the review on the profile, leave it empty.
   */
  excerpt?: string;
};

export type TrustpilotSnapshot = {
  /** Displayed TrustScore on the public profile. */
  rating: number;
  /** Word Trustpilot displays for the current TrustScore band. */
  ratingLabel: string;
  /** Total number of reviews shown on the public profile. */
  reviewCount: number;
  /** Star distribution exactly as published. Levels with 0% are omitted. */
  distribution: TrustpilotStarShare[];
  /** Individual reviews referenced on the site. */
  reviews: TrustpilotReview[];
  /**
   * True while Trustpilot displays its notice that the profile has no recent
   * history of asking customers for reviews. When true the UI must not describe
   * the reviews as verified, invited, or representative.
   */
  noRecentInviteHistory: boolean;
  /** Public profile URL — always linked so visitors can verify. */
  profileUrl: string;
  /** ISO date the figures above were read from the public profile. */
  verifiedOn: string;
};

export const TRUSTPILOT: TrustpilotSnapshot = {
  rating: 4.7,
  ratingLabel: "Excellent",
  reviewCount: 27,
  distribution: [
    { stars: 5, percent: 96 },
    { stars: 4, percent: 4 },
  ],
  reviews: [
    { author: "Cam Burley", stars: 5, date: "March 2026", dateIso: "2026-03-01", topic: "Response & issue resolution" },
    { author: "Glen Snedden", stars: 5, date: "May 2025", dateIso: "2025-05-01", topic: "Communication & vehicle" },
    { author: "Karen Resendez", stars: 5, date: "April 2025", dateIso: "2025-04-01", topic: "Booking & drivers" },
    { author: "Hannah climber", stars: 4, date: "September 2024", dateIso: "2024-09-01", topic: "Punctuality & comfort" },
  ],
  noRecentInviteHistory: true,
  profileUrl: "https://www.trustpilot.com/review/cabslink.com",
  verifiedOn: "2026-08-10",
};

/** "10 August 2026" — UK formatting for display next to the rating. */
export function trustpilotVerifiedOnLabel(snapshot: TrustpilotSnapshot = TRUSTPILOT): string {
  return new Date(`${snapshot.verifiedOn}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
