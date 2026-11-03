import { describe, it, expect, vi, beforeEach } from "vitest";

const row = { data: null as unknown, fetched_at: "" };
const upsert = vi.fn(async () => ({ error: null }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row.data ? row : null, error: null }) }) }),
    }),
  }),
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: () => ({ upsert }) },
}));

const googleBody = {
  averageRating: 4.9,
  totalReviewCount: 2,
  reviews: [
    { reviewId: "a", starRating: "FIVE", comment: "Older", createTime: "2026-10-01T10:00:00Z", reviewer: { displayName: "Ann" } },
    { reviewId: "b", starRating: "FOUR", comment: "Newest", createTime: "2026-10-25T10:00:00Z", reviewer: { displayName: "Bob" } },
  ],
};

beforeEach(() => {
  process.env.LOVABLE_API_KEY = "k";
  process.env.GOOGLE_BUSINESS_PROFILE_API_KEY = "c";
  process.env.SUPABASE_URL = "http://x";
  process.env.SUPABASE_PUBLISHABLE_KEY = "p";
  upsert.mockClear();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(googleBody), { status: 200 })));
});

describe("Google review refresh", () => {
  it("does not ask Google again when the saved reviews are under 15 minutes old", async () => {
    row.data = { reviews: [] };
    row.fetched_at = new Date(Date.now() - 5 * 60_000).toISOString();
    const { refreshSnapshot, REFRESH_MIN_GAP_MS } = await import("@/lib/google-reviews.server");
    const r = await refreshSnapshot(REFRESH_MIN_GAP_MS);
    expect(r.refreshed).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("fetches and saves newest-first when the saved reviews are older than 15 minutes", async () => {
    row.data = { reviews: [] };
    row.fetched_at = new Date(Date.now() - 20 * 60_000).toISOString();
    const { refreshSnapshot, REFRESH_MIN_GAP_MS } = await import("@/lib/google-reviews.server");
    const r = await refreshSnapshot(REFRESH_MIN_GAP_MS);
    expect(r.refreshed).toBe(true);
    expect(r.snapshot.reviews.map((x) => x.excerpt)).toEqual(["Newest", "Older"]);
    expect(upsert).toHaveBeenCalledTimes(1);
  });
});
