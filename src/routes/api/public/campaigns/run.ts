import { createFileRoute } from "@tanstack/react-router";

/**
 * Called hourly by the database scheduler (only when a campaign is due) to
 * send offer emails. Protected by a private token stored in the database.
 */
export const Route = createFileRoute("/api/public/campaigns/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const setting = await supabaseAdmin.from("private_settings").select("value").eq("key", "campaigns_run_token").maybeSingle();
        const token = setting.error ? null : setting.data?.value;
        if (!token) return new Response("Not configured", { status: 503 });
        const provided = request.headers.get("x-campaigns-token") ?? "";
        if (provided.length !== token.length) return new Response("Unauthorized", { status: 401 });
        let same = 0;
        for (let i = 0; i < token.length; i++) same |= provided.charCodeAt(i) ^ token.charCodeAt(i);
        if (same !== 0) return new Response("Unauthorized", { status: 401 });
        const { runDueCampaigns } = await import("@/lib/marketing.server");
        try {
          const results = await runDueCampaigns(supabaseAdmin);
          return Response.json({ ran: results.length });
        } catch (err) {
          console.error("campaign run:", err);
          return Response.json({ error: "run failed" }, { status: 502 });
        }
      },
    },
  },
});
