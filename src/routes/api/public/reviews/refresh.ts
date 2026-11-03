import { createFileRoute } from "@tanstack/react-router";

/**
 * Called hourly by the database scheduler to pull the newest Google reviews
 * and save them. Protected by a private token stored in the database; Google
 * is asked at most once every 15 minutes however often this is called.
 */
export const Route = createFileRoute("/api/public/reviews/refresh")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const setting = await supabaseAdmin
          .from("private_settings")
          .select("value")
          .eq("key", "reviews_refresh_token")
          .maybeSingle();
        const token = setting.error ? null : setting.data?.value;
        if (!token) return new Response("Not configured", { status: 503 });

        const provided = request.headers.get("x-reviews-token") ?? "";
        if (provided.length !== token.length) return new Response("Unauthorized", { status: 401 });
        let same = 0;
        for (let i = 0; i < token.length; i++) same |= provided.charCodeAt(i) ^ token.charCodeAt(i);
        if (same !== 0) return new Response("Unauthorized", { status: 401 });

        const { refreshSnapshot, REFRESH_MIN_GAP_MS } = await import("@/lib/google-reviews.server");
        try {
          const { refreshed, snapshot } = await refreshSnapshot(REFRESH_MIN_GAP_MS);
          return Response.json({ refreshed, reviews: snapshot.reviews.length, fetchedAt: snapshot.fetchedAt });
        } catch (err) {
          console.error("reviews refresh:", err);
          return Response.json({ refreshed: false, error: String(err) }, { status: 502 });
        }
      },
    },
  },
});
