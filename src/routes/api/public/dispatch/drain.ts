import { createFileRoute } from "@tanstack/react-router";

/**
 * Called on a schedule (cron) to push queued booking events to dispatch systems.
 * Protected with a shared token so only the scheduler can trigger it.
 */
export const Route = createFileRoute("/api/public/dispatch/drain")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env["DISPATCH_DRAIN_TOKEN"];
        if (!token) return new Response("Not configured", { status: 503 });

        const provided =
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          request.headers.get("x-dispatch-token") ??
          "";
        if (provided.length !== token.length) return new Response("Unauthorized", { status: 401 });
        let same = 0;
        for (let i = 0; i < token.length; i++) same |= provided.charCodeAt(i) ^ token.charCodeAt(i);
        if (same !== 0) return new Response("Unauthorized", { status: 401 });

        const { deliverPendingDispatchEvents } = await import("@/lib/dispatch.server");
        const result = await deliverPendingDispatchEvents();
        return Response.json(result);
      },
    },
  },
});
