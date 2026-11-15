import { createFileRoute } from "@tanstack/react-router";

/** One-click unsubscribe used by mail apps (List-Unsubscribe-Post). Returns no personal data. */
export const Route = createFileRoute("/api/public/unsubscribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = new URL(request.url).searchParams.get("token") ?? "";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { unsubscribeToken } = await import("@/lib/marketing.server");
        const result = await unsubscribeToken(supabaseAdmin, token);
        return new Response(result === "invalid" ? "Invalid link" : "Unsubscribed", { status: result === "invalid" ? 400 : 200 });
      },
    },
  },
});
