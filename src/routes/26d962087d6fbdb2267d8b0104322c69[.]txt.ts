import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { INDEXNOW_KEY } from "@/lib/seo/indexnow-key";

/** IndexNow key file: contains only the key. */
export const Route = createFileRoute("/26d962087d6fbdb2267d8b0104322c69.txt")({
  server: {
    handlers: {
      GET: async () => new Response(INDEXNOW_KEY, {
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
      }),
    },
  },
});
