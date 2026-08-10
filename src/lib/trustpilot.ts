/**
 * Trustpilot proof data for Cabslink.
 *
 * SINGLE SOURCE OF TRUTH — update the values below when the public Trustpilot
 * profile changes. Nothing here may be invented: every number must be visible
 * on https://www.trustpilot.com/review/cabslink.com at the time of the update.
 *
 * There is no Trustpilot API credential configured for this project, so the
 * figures are recorded manually together with the date they were read. The
 * UI always renders `verifiedOn` next to the rating so the snapshot is
 * transparent rather than implied to be live.
 *
 * If Trustpilot Business API access is added later, replace `TRUSTPILOT`
 * with a server-function fetch that returns the same shape — every consumer
 * reads this object only.
 */
export type TrustpilotStarShare = {
  /** 1–5 */
  stars: number;
  /** Whole-percent share of reviews at this star level, as shown on the profile. */
  percent: number;
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
