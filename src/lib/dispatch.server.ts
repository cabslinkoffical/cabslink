/**
 * Server-only outbound delivery of booking events to dispatch systems.
 * Each request is signed with the endpoint's own secret (HMAC-SHA256) so the
 * receiving system can verify the payload really came from us.
 */

const MAX_ATTEMPTS = 6;
const REQUEST_TIMEOUT_MS = 10_000;

export function isHttpsUrl(url: unknown): boolean {
  try {
    return new URL(String(url)).protocol === "https:";
  } catch {
    return false;
  }
}

async function notifyDispatchFailure(ev: any, ep: any, message: string) {
  try {
    const { defaultNotifyAdmin } = await import("@/lib/stripe-payments.server");
    await defaultNotifyAdmin(
      "Dispatch delivery failed",
      [
        `A booking update could not be delivered to "${ep?.name ?? "dispatch"}" after ${MAX_ATTEMPTS} attempts.`,
        `Event: ${ev.event_type}`,
        `Booking: ${ev.payload?.booking_ref ?? ev.booking_id ?? "unknown"}`,
        `Last error: ${message}`,
      ],
      ev.booking_id ?? null,
    );
  } catch (e) {
    console.error("[dispatch] failure notification failed", e);
  }
}

async function sign(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function deliverPendingDispatchEvents(limit = 25) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Narrow extension until generated database types include the lease and RPC.
  type Event = {
    id: string; event_type: string; payload: any; booking_id: string | null;
    attempts: number; lease_expires_at: string;
    endpoint: { id: string; active: boolean; url: string; secret: string } | null;
  };
  const claim = supabaseAdmin.rpc.bind(supabaseAdmin) as unknown as
    (name: "claim_dispatch_event") => Promise<{ data: Event | null; error: { message: string } | null }>;
  let processed = 0;
  let delivered = 0;
  let failed = 0;

  // Claim just before sending, rather than letting a sequential batch's leases age.
  for (let i = 0; i < limit; i++) {
    const { data: ev, error } = await claim("claim_dispatch_event");
    if (error) throw new Error(error.message);
    if (!ev) break;
    processed++;
    const ep = ev.endpoint;
    const attempts = (ev.attempts ?? 0) + 1;
    let message: string | null = null;
    if (ep?.active) {
      try {
        if (!isHttpsUrl(ep.url)) throw new Error("Dispatch address must use https://");
        const body = JSON.stringify({ id: ev.id, type: ev.event_type, data: ev.payload });
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signature = await sign(ep.secret, `${timestamp}.${body}`);
        const res = await fetch(ep.url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-cabslink-event": ev.event_type,
            "x-cabslink-delivery": ev.id,
            "x-cabslink-timestamp": timestamp,
            "x-cabslink-signature": signature,
          },
          body,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (!res.ok) throw new Error(`Dispatch system replied ${res.status}`);
      } catch (e) {
        message = String(e instanceof Error ? e.message : e).slice(0, 500);
      }
    }
    const giveUp = attempts >= MAX_ATTEMPTS;
    const backoffMs = Math.min(60 * 60 * 1000, 30_000 * 2 ** (attempts - 1));
    const patch = !ep?.active
      ? { status: "skipped", last_error: "No active endpoint" }
      : message !== null
        ? { status: giveUp ? "failed" : "pending", attempts, last_error: message,
            next_attempt_at: new Date(Date.now() + backoffMs).toISOString() }
        : { status: "delivered", attempts, delivered_at: new Date().toISOString(), last_error: null };
    try {
      // Fence stale workers: an expired claim that another drain acquired cannot be completed here.
      const { data, error: stateError } = await supabaseAdmin.from("dispatch_events")
        .update(patch).eq("id", ev.id).eq("status", "sending")
        .eq("lease_expires_at" as "id", ev.lease_expires_at).select("id").maybeSingle();
      if (stateError) throw new Error(stateError.message);
      if (!data) throw new Error("Dispatch claim no longer owned");
      if (ep?.active) {
        const { error: endpointError } = await supabaseAdmin.from("dispatch_endpoints")
          .update({ last_delivery_at: new Date().toISOString(), last_delivery_ok: message === null, last_error: message })
          .eq("id", ep.id);
        if (endpointError) throw new Error(endpointError.message);
      }
      if (message !== null) {
        failed++;
        if (giveUp) await notifyDispatchFailure(ev, ep, message);
      } else if (ep?.active) {
        delivered++;
      }
    } catch (e) {
      // Do not overwrite an ambiguous completion with a retry/terminal write.
      // A failed event write leaves its lease intact for recovery with the same ID.
      console.error("[dispatch] delivery-state update failed", { eventId: ev.id, error: e });
      failed++;
    }
  }
  return { processed, delivered, failed };
}
