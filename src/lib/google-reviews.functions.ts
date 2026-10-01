/**
 * Live Google Business Profile reviews for Cabslink.
 *
 * Fetched from the owner's connected profile on the server and cached in
 * memory for 30 minutes, so new Google reviews appear automatically without
 * calling Google on every page view. Fails soft: returns null on any error.
 */
import { createServerFn } from "@tanstack/react-start";
import type { UnifiedReview } from "./reviews";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_business_profile";
const ACCOUNT = "accounts/114484939592816872743";
const LOCATION = "locations/1354775158043435232";
export const GOOGLE_PROFILE_URL = "https://share.google/eVCAo7I5A17ZPE0pk";
const TTL_MS = 30 * 60 * 1000;

export type GoogleReviewsSnapshot = {
  rating: number;
  reviewCount: number;
  reviews: UnifiedReview[];
  profileUrl: string;
  fetchedAt: string;
};

const STARS: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

let cache: { at: number; data: GoogleReviewsSnapshot } | null = null;

type GbpReview = {
  reviewId: string;
  reviewer?: { displayName?: string; isAnonymous?: boolean };
  starRating?: string;
  comment?: string;
  createTime?: string;
};

function cleanComment(text?: string): string | undefined {
  if (!text) return undefined;
  // Google appends machine translations after this marker; keep the original.
  const original = text.split("(Translated by Google)")[0].replace(/\(Original\)/g, "");
  const flat = original.replace(/\s+/g, " ").trim();
  return flat || undefined;
}

async function fetchFromGoogle(): Promise<GoogleReviewsSnapshot> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const connKey = process.env.GOOGLE_BUSINESS_PROFILE_API_KEY;
  if (!lovableKey || !connKey) throw new Error("Google Business Profile is not connected");

  const all: GbpReview[] = [];
  let rating = 0;
  let total = 0;
  let pageToken: string | undefined;
  for (let page = 0; page < 10; page++) {
    const qs = new URLSearchParams({ pageSize: "50", orderBy: "updateTime desc" });
    if (pageToken) qs.set("pageToken", pageToken);
    const res = await fetch(`${GATEWAY_URL}/my_business/v4/${ACCOUNT}/${LOCATION}/reviews?${qs}`, {
      headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": connKey },
    });
    if (!res.ok) {
      throw new Error(`Google reviews request failed [${res.status}]: ${await res.text()}`);
    }
    const body = (await res.json()) as {
      reviews?: GbpReview[];
      averageRating?: number;
      totalReviewCount?: number;
      nextPageToken?: string;
    };
    rating = body.averageRating ?? rating;
    total = body.totalReviewCount ?? total;
    all.push(...(body.reviews ?? []));
    pageToken = body.nextPageToken;
    if (!pageToken) break;
  }

  const reviews: UnifiedReview[] = all.map((r) => {
    const iso = r.createTime ?? new Date().toISOString();
    const d = new Date(iso);
    return {
      id: `google-${r.reviewId}`,
      channel: "google" as const,
      author: r.reviewer?.isAnonymous ? "A Google user" : (r.reviewer?.displayName ?? "A Google user"),
      stars: STARS[r.starRating ?? ""] ?? 5,
      dateLabel: d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
      dateIso: iso.slice(0, 10),
      topic: "Google review",
      excerpt: cleanComment(r.comment),
      url: GOOGLE_PROFILE_URL,
    };
  });

  return { rating, reviewCount: total, reviews, profileUrl: GOOGLE_PROFILE_URL, fetchedAt: new Date().toISOString() };
}

export const getGoogleReviews = createServerFn({ method: "GET" }).handler(
  async (): Promise<GoogleReviewsSnapshot | null> => {
    if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
    try {
      const data = await fetchFromGoogle();
      cache = { at: Date.now(), data };
      return data;
    } catch (err) {
      console.error("getGoogleReviews:", err);
      return cache?.data ?? null;
    }
  },
);
