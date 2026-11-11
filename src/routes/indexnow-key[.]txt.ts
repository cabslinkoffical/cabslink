import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { INDEXNOW_KEY } from "@/lib/seo/indexnow-key";

/** Older key-file address, kept so the URL never disappears; serves the current key. */
export const Route = createFileRoute("/indexnow-key.txt")({
  server: {
    handlers: {
      GET: async () => new Response(INDEXNOW_KEY, {
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
      }),
    },
  },
});
