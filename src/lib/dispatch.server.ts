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
  const db = supabaseAdmin as any;
  const nowIso = new Date().toISOString();

  const { data: due, error } = await db
    .from("dispatch_events")
    .select("id")
    .eq("status", "pending")
    .lte("next_attempt_at", nowIso)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);

  // Claim before sending: only rows this run moved pending -> sending are
  // delivered, so overlapping runs never send the same event twice.
  const ids = (due ?? []).map((r: any) => r.id);
  let events: any[] = [];
  if (ids.length) {
    const { data: claimed, error: claimErr } = await db
      .from("dispatch_events")
      .update({ status: "sending" })
      .in("id", ids)
      .eq("status", "pending")
      .select("*, endpoint:dispatch_endpoints(*)");
    if (claimErr) throw new Error(claimErr.message);
    events = claimed ?? [];
  }

  let delivered = 0;
  let failed = 0;

  for (const ev of events ?? []) {
    const ep = ev.endpoint;
    if (!ep || !ep.active) {
      await db.from("dispatch_events").update({ status: "skipped", last_error: "No active endpoint" }).eq("id", ev.id);
      continue;
    }

    const body = JSON.stringify({ id: ev.id, type: ev.event_type, data: ev.payload });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const attempts = (ev.attempts ?? 0) + 1;

    try {
      if (!isHttpsUrl(ep.url)) throw new Error("Dispatch address must use https://");
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

      if (res.ok) {
        delivered++;
        await db
          .from("dispatch_events")
          .update({ status: "delivered", attempts, delivered_at: new Date().toISOString(), last_error: null })
          .eq("id", ev.id);
        await db
          .from("dispatch_endpoints")
          .update({ last_delivery_at: new Date().toISOString(), last_delivery_ok: true, last_error: null })
          .eq("id", ep.id);
        continue;
      }
      throw new Error(`Dispatch system replied ${res.status}`);
    } catch (e: any) {
      failed++;
      const message = String(e?.message ?? e).slice(0, 500);
      const giveUp = attempts >= MAX_ATTEMPTS;
      const backoffMs = Math.min(60 * 60 * 1000, 30_000 * 2 ** (attempts - 1));
      await db
        .from("dispatch_events")
        .update({
          status: giveUp ? "failed" : "pending",
          attempts,
          last_error: message,
          next_attempt_at: new Date(Date.now() + backoffMs).toISOString(),
        })
        .eq("id", ev.id);
      await db
        .from("dispatch_endpoints")
        .update({ last_delivery_at: new Date().toISOString(), last_delivery_ok: false, last_error: message })
        .eq("id", ep.id);
      if (giveUp) {
        await notifyDispatchFailure(ev, ep, message);
      }
    }
  }

  return { processed: events.length, delivered, failed };
}
