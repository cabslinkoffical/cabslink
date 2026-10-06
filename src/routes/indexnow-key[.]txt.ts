import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { publicServerClient } from "@/lib/seo/public-client.server";

/** IndexNow key file: proves to search engines we own the pinged URLs. */
export const Route = createFileRoute("/indexnow-key.txt")({
  server: {
    handlers: {
      GET: async () => {
        const { data } = await publicServerClient()
          .from("site_settings_public" as any).select("indexnow_key").eq("id", 1).maybeSingle();
        const key = (data as { indexnow_key?: string } | null)?.indexnow_key;
        if (!key) return new Response("Not found", { status: 404 });
        return new Response(key, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});
