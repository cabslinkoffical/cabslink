/**
 * Live Google Business Profile reviews for Cabslink.
 *
 * Reads the saved review snapshot (refreshed hourly by the scheduler and on
 * demand when stale), with a short per-server memory copy on top. Fails soft:
 * if Google is unreachable the last saved reviews are shown; null only when
 * nothing has ever been saved.
 */
import { createServerFn } from "@tanstack/react-start";
import type { UnifiedReview } from "./reviews";

export const GOOGLE_PROFILE_URL = "https://share.google/eVCAo7I5A17ZPE0pk";
const MEMORY_TTL_MS = 5 * 60 * 1000;

export type GoogleReviewsSnapshot = {
  rating: number;
  reviewCount: number;
  reviews: UnifiedReview[];
  profileUrl: string;
  fetchedAt: string;
};

let memory: { at: number; data: GoogleReviewsSnapshot } | null = null;

export const getGoogleReviews = createServerFn({ method: "GET" }).handler(
  async (): Promise<GoogleReviewsSnapshot | null> => {
    if (memory && Date.now() - memory.at < MEMORY_TTL_MS) return memory.data;
    const { readSavedSnapshot, fetchFromGoogle, saveSnapshot, SNAPSHOT_FRESH_MS } = await import(
      "./google-reviews.server"
    );
    const saved = await readSavedSnapshot().catch(() => null);
    if (saved && Date.now() - saved.at < SNAPSHOT_FRESH_MS) {
      memory = { at: Date.now(), data: saved.data };
      return saved.data;
    }
    try {
      const data = await fetchFromGoogle(2500);
      memory = { at: Date.now(), data };
      await saveSnapshot(data).catch((err) => console.error("getGoogleReviews save:", err));
      return data;
    } catch (err) {
      console.error("getGoogleReviews:", err);
      const fallback = saved?.data ?? memory?.data ?? null;
      if (fallback) memory = { at: Date.now(), data: fallback };
      return fallback;
    }
  },
);
