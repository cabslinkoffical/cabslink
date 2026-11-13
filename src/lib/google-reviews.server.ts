/**
 * Google Business Profile review feed, server only.
 *
 * The latest feed is stored as one saved snapshot so every server instance
 * shows the same, newest reviews and a slow or failed Google call never hides
 * them. A scheduler refreshes it hourly; page reads also refresh it when stale.
 */
import type { Json } from "@/integrations/supabase/types";
import type { UnifiedReview } from "./reviews";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_business_profile";
const ACCOUNT = "accounts/114484939592816872743";
const LOCATION = "locations/1354775158043435232";
export const GOOGLE_PROFILE_URL = "https://share.google/eVCAo7I5A17ZPE0pk";

/** How old the saved snapshot may be before a page view asks Google again. */
export const SNAPSHOT_FRESH_MS = 60 * 60 * 1000;
/** The scheduler never calls Google more often than this, however often it is hit. */
export const REFRESH_MIN_GAP_MS = 15 * 60 * 1000;

export type GoogleReviewsSnapshot = {
  rating: number;
  reviewCount: number;
  reviews: UnifiedReview[];
  profileUrl: string;
  fetchedAt: string;
};

const STARS: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

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

export function mapGoogleReview(r: GbpReview): UnifiedReview {
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
}

export async function fetchFromGoogle(timeoutMs = 2500): Promise<GoogleReviewsSnapshot> {
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
      signal: AbortSignal.timeout(timeoutMs),
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

  // Newest first, by when the review was written.
  const reviews = all.map(mapGoogleReview).sort((a, b) => b.dateIso.localeCompare(a.dateIso));
  return { rating, reviewCount: total, reviews, profileUrl: GOOGLE_PROFILE_URL, fetchedAt: new Date().toISOString() };
}

export async function readSavedSnapshot(): Promise<{ data: GoogleReviewsSnapshot; at: number } | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("google_reviews_snapshot")
    .select("data, fetched_at")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return null;
  return { data: data.data as unknown as GoogleReviewsSnapshot, at: new Date(data.fetched_at).getTime() };
}

export async function saveSnapshot(snapshot: GoogleReviewsSnapshot): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("google_reviews_snapshot")
    .upsert({ id: 1, data: snapshot as unknown as Json, fetched_at: snapshot.fetchedAt });
  if (error) throw new Error(`Saving Google reviews failed: ${error.message}`);
}

/** Fetch from Google and save, unless the saved copy is newer than `minGapMs`. */
export async function refreshSnapshot(minGapMs: number, timeoutMs = 8000) {
  const saved = await readSavedSnapshot();
  if (saved && Date.now() - saved.at < minGapMs) {
    return { refreshed: false as const, snapshot: saved.data };
  }
  const fresh = await fetchFromGoogle(timeoutMs);
  await saveSnapshot(fresh);
  return { refreshed: true as const, snapshot: fresh };
}
