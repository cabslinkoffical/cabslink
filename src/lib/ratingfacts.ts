/**
 * RatingFacts proof data for Cabslink.
 *
 * SINGLE SOURCE OF TRUTH — update the values below when the public profile
 * changes. Nothing here may be invented: every value must be visible on
 * https://ratingfacts.com/reviews/cabslink.com at the time of the update.
 *
 * Like Trustpilot, this data is recorded manually (there is no API credential
 * configured), and the UI renders `verifiedOn` next to the figures so the
 * snapshot reads as a dated snapshot rather than a live feed.
 *
 * DATES: the profile displays relative dates only ("1 year ago"), so
 * `dateLabel` repeats that wording verbatim and `dateIso` is the same coarse
 * approximation for every review — it exists only so newest-first sorting
 * keeps these older than Trustpilot reviews, and the stable sort preserves the
 * profile's own display order within the group.
 */
import type { TrustpilotSnapshot } from "./trustpilot";

export type RatingFactsReview = {
  /** Reviewer display name exactly as shown on RatingFacts. */
  author: string;
  /** Star rating the reviewer gave, 1–5. */
  stars: number;
  /** Relative date exactly as displayed on the profile, e.g. "1 year ago". */
  dateLabel: string;
  /**
   * Coarse approximation for sorting only (see the date note above). Never
   * rendered.
   */
  dateIso: string;
  /** Neutral topic label for the card — not a paraphrase of the review. */
  topic: string;
  /**
   * A SHORT VERBATIM excerpt, copied character-for-character from the review on
   * RatingFacts. Line breaks on the profile are flattened to single spaces.
   */
  excerpt?: string;
};

export type RatingFactsSnapshot = Pick<
  TrustpilotSnapshot,
  "rating" | "ratingLabel" | "reviewCount" | "distribution" | "reviews" | "profileUrl" | "verifiedOn"
> & {
  reviews: RatingFactsReview[];
};

export const RATINGFACTS: RatingFactsSnapshot = {
  rating: 5.0,
  ratingLabel: "Excellent",
  reviewCount: 16,
  distribution: [{ stars: 5, percent: 100 }],
  reviews: [
    {
      author: "Raja Khan",
      stars: 5,
      dateLabel: "1 year ago",
      dateIso: "2025-09-01",
      topic: "Driver helpfulness",
      excerpt: "Khaver was extremely helpful and nothing was a problem for him",
    },
    {
      author: "RW Quinn",
      stars: 5,
      dateLabel: "1 year ago",
      dateIso: "2025-09-01",
      topic: "Group travel",
      excerpt:
        "Great company Great Service Very friendly driver Nice clean bus Plenty of room I will use Cabslink every time I am in the UK",
    },
    {
      author: "Guillaume Gazel",
      stars: 5,
      dateLabel: "1 year ago",
      dateIso: "2025-09-01",
      topic: "Booking experience",
      excerpt: "Very quick and easy booking with them",
    },
    {
      author: "Peter Comandulli",
      stars: 5,
      dateLabel: "1 year ago",
      dateIso: "2025-09-01",
      topic: "Overall service",
      excerpt:
        "Great service all over Nice drivers great and spacious cars Thank you for your service",
    },
    {
      author: "ERIC",
      stars: 5,
      dateLabel: "1 year ago",
      dateIso: "2025-09-01",
      topic: "Driver & service",
      excerpt: "Service and drivers were perfect Well done",
    },
    {
      author: "Tweed Farm",
      stars: 5,
      dateLabel: "1 year ago",
      dateIso: "2025-09-01",
      topic: "Comfort & driver",
      excerpt: "Great service in a comfortable car with a friendly driver",
    },
    {
      author: "GG",
      stars: 5,
      dateLabel: "1 year ago",
      dateIso: "2025-09-01",
      topic: "Traffic handling",
      excerpt:
        "The driver was very professional and knew there were traffic delays and diversions because of the weather so he managed to find ways to routes to gain time",
    },
    {
      author: "George Asiminei",
      stars: 5,
      dateLabel: "1 year ago",
      dateIso: "2025-09-01",
      topic: "Vehicle & driver",
      excerpt:
        "Nice comfortable car a Mercedes Vito Excelent and patient driver I would recommend to anyone",
    },
    {
      author: "Anne Pearson",
      stars: 5,
      dateLabel: "1 year ago",
      dateIso: "2025-09-01",
      topic: "Punctuality & comfort",
      excerpt:
        "Our driver was 10 mins late but apologised and was accommodating by stopping for us to grab a coffee The car was very comfortable and the journey was pleasurable",
    },
    {
      author: "Ryan",
      stars: 5,
      dateLabel: "1 year ago",
      dateIso: "2025-09-01",
      topic: "Night-time pickup",
      excerpt: "Friendly service easy to contact Got me home safe late at night",
    },
  ],
  profileUrl: "https://ratingfacts.com/reviews/cabslink.com",
  verifiedOn: "2026-09-26",
};

/** UK formatting for the date the figures were read from the public profile. */
export function ratingfactsVerifiedOnLabel(snapshot: RatingFactsSnapshot = RATINGFACTS): string {
  return new Date(`${snapshot.verifiedOn}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
