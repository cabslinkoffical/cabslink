/**
 * Server-only work for custom tour requests (CL-CT): saving a request with a
 * best-effort instant estimate, the customer status lookup and customer
 * update emails. Called from the handlers in custom-tour-requests.functions.ts.
 */
import { z } from "zod";
import { ukDate } from "@/lib/uk-time";
import { setResponseStatus } from "@tanstack/react-start/server";
import {
  CUSTOM_TOUR_STATUS_LABEL,
  CUSTOM_TOUR_STATUS_CUSTOMER,
  PRICE_VISIBLE_STATUSES,
  type CustomTourStatus,
} from "@/lib/custom-tour-requests";
import type { requestSchema, requestStop } from "@/lib/custom-tour-requests.functions";

const PUBLIC_SITE_URL = "https://cabslink.com";
export const statusUrl = (ref: string) => `${PUBLIC_SITE_URL}/custom-tour-status?ref=${encodeURIComponent(ref)}`;

export type CustomTourRequestCreated = { reference: string };

type StoredStop = { name: string; placeId: string; poiId: string | null; dwellMinutes: number | null; locked: boolean };
const toStored = (s: z.infer<typeof requestStop>): StoredStop => ({
  name: s.name, placeId: s.placeId, poiId: s.poiId ?? null, dwellMinutes: s.dwellMinutes ?? null, locked: !!s.locked,
});

/** Pure handler — callable from tests with an injected IP. */
export async function createCustomTourRequestImpl(
  data: z.infer<typeof requestSchema>,
  opts: { ip?: string; skipChecks?: boolean } = {},
): Promise<CustomTourRequestCreated> {
  if (data.website && data.website.trim() !== "") return { reference: "" };
  if (data.date < ukDate()) throw new Error("Choose a tour date from today onwards.");

  const ip = opts.ip ?? "unknown";
  if (!opts.skipChecks) {
    const { enforceRateLimit, LIMITS } = await import("@/lib/db-rate-limit.server");
    await enforceRateLimit(LIMITS.customTourRequest, ip, "You've sent several tour requests already. Please try again shortly or call us.");
    const { assertCaptcha } = await import("@/lib/captcha.server");
    await assertCaptcha(data.captchaToken, ip, setResponseStatus);
  }

  const { loadTourConfig, quoteTourImpl, measureLoop } = await import("@/lib/tour-quote.server");
  const config = await loadTourConfig();
  const vehicle = data.vehicleClassId ? config.classes.find((c) => c.id === data.vehicleClassId) ?? null : null;
  const stops = data.stops.map(toStored);
  const minStop = config.rules.minimum_stop_minutes;
  let dwell = stops.reduce((sum, s) => sum + Math.max(minStop, Number(s.dwellMinutes ?? minStop)), 0);

  // Best-effort estimate: a reliable instant price is kept for the team, but a
  // failure never blocks the request — that is exactly when people ask us.
  let estimatedTotal: number | null = null;
  let snapshot: unknown = null;
  let priceNote: string | null = null;
  let routeMiles: number | null = null;
  let driveMinutes: number | null = null;
  if (vehicle) {
    try {
      const res = await quoteTourImpl({
        mode: "custom",
        startPlaceId: data.startPlaceId,
        startLabel: data.startLabel,
        endPlaceId: data.endPlaceId ?? null,
        endLabel: data.endLabel ?? null,
        hours: data.hours,
        vehicleClassId: vehicle.id,
        passengers: data.passengers,
        luggage: data.luggage,
        stops: data.stops,
      });
      routeMiles = res.quote.routeMiles;
      driveMinutes = Math.round(res.quote.driveMinutes);
      dwell = Math.round(res.quote.dwellTotalMinutes);
      if (res.quote.blockedReason) priceNote = res.quote.blockedReason;
      else if (res.quote.total > 0) { estimatedTotal = res.quote.total; snapshot = res.quote; }
      else priceNote = "No online tour price is set for this vehicle.";
    } catch (e) {
      priceNote = (e as Error)?.message?.slice(0, 300) || "Instant price unavailable.";
    }
  } else {
    priceNote = "No single vehicle chosen — the team needs to plan the vehicles.";
  }
  if (routeMiles == null) {
    try {
      const loop = await measureLoop({
        startPlaceId: data.startPlaceId,
        endPlaceId: data.endPlaceId || data.startPlaceId,
        stopPlaceIds: data.stops.map((s) => s.placeId),
      });
      routeMiles = loop.miles;
      driveMinutes = Math.round(loop.driveMinutes);
    } catch { /* route unavailable — the team will measure it */ }
  }

  const originalChanged = data.originalStops && data.originalStops.length
    && data.originalStops.map((s) => s.placeId).join("|") !== stops.map((s) => s.placeId).join("|");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const ins: any = await (supabaseAdmin as any)
    .from("custom_tour_requests")
    .insert({
      customer_name: data.name,
      email: data.email.trim().toLowerCase(),
      phone: data.phone,
      start_label: data.startLabel,
      start_place_id: data.startPlaceId,
      end_label: data.endLabel || null,
      end_place_id: data.endPlaceId || null,
      tour_date: data.date,
      start_time: data.time.padStart(5, "0"),
      hours: data.hours,
      passengers: data.passengers,
      luggage: data.luggage,
      vehicle_class_id: vehicle?.id ?? null,
      vehicle_name: vehicle?.name ?? null,
      stops,
      original_stops: originalChanged ? data.originalStops!.map(toStored) : null,
      flight_number: data.flight || null,
      customer_notes: data.notes || null,
      route_miles: routeMiles == null ? null : Math.round(routeMiles * 10) / 10,
      drive_minutes: driveMinutes,
      dwell_minutes: dwell,
      estimated_total: estimatedTotal,
      price_snapshot: snapshot,
      price_note: priceNote,
    })
    .select("id, reference_code")
    .single();
  if (ins.error || !ins.data) {
    console.error("custom tour request insert failed", ins.error);
    throw new Error("We couldn't send your tour request right now. Please try again or call us.");
  }
  const reference = String(ins.data.reference_code);

  try {
    const { sendAndLog, getAdminNotificationEmail } = await import("@/lib/notifications.server");
    const { customTourRequestReceivedEmail } = await import("@/lib/email/tour.server");
    const ctx = {
      reference, customerName: data.name, tourDate: data.date, startTime: data.time.padStart(5, "0"),
      passengers: data.passengers, stops: stops.map((s) => s.name), statusUrl: statusUrl(reference),
    };
    const tpl = customTourRequestReceivedEmail(ctx);
    await sendAndLog({
      bookingId: null, eventKey: `custom_tour_ack_${reference}`, notificationType: "customer_custom_tour_request",
      recipientCategory: "customer", recipient: data.email, subject: tpl.subject, html: tpl.html, text: tpl.text,
    });
    const adminEmail = await getAdminNotificationEmail();
    if (adminEmail) {
      const lines = [
        `New custom tour request ${reference}`,
        `Customer: ${data.name} (${data.email}, ${data.phone})`,
        `Date/time: ${data.date} ${data.time} · ${data.hours} hours`,
        `Passengers: ${data.passengers} · Suitcases: ${data.luggage}`,
        `Start: ${data.startLabel}${data.endLabel ? ` · Finish: ${data.endLabel}` : ""}`,
        `Stops: ${stops.map((s) => s.name).join(" → ")}`,
        vehicle ? `Vehicle: ${vehicle.name}` : "Vehicle: not chosen",
        estimatedTotal != null ? `Instant estimate: £${estimatedTotal.toFixed(2)}` : `No instant price: ${priceNote ?? "—"}`,
        data.notes ? `Notes: ${data.notes}` : null,
        "",
        "Open Custom tour requests in the staff console to review and quote.",
      ].filter(Boolean) as string[];
      const body = lines.join("\n");
      await sendAndLog({
        bookingId: null, eventKey: `custom_tour_admin_${reference}`, notificationType: "admin_custom_tour_request",
        recipientCategory: "admin", recipient: adminEmail, subject: `New custom tour request ${reference}`,
        html: `<pre style="font:14px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;white-space:pre-wrap;">${body.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>`,
        text: body,
      });
    }
  } catch (err) {
    console.error("custom tour request emails failed", err);
  }

  return { reference };
}

export type CustomTourStatusView = {
  reference: string;
  status: CustomTourStatus;
  statusLabel: string;
  statusMessage: string;
  tourDate: string;
  startTime: string;
  hours: number;
  passengers: number;
  luggage: number;
  startLabel: string;
  endLabel: string | null;
  vehicleName: string | null;
  stops: Array<{ name: string; dwellMinutes: number | null }>;
  price: number | null;
  createdAt: string;
  updates: Array<{ at: string; body: string }>;
};

const NOT_FOUND = "We couldn't find a request with that reference and email. Please check both and try again.";

export async function lookupCustomTourRequestImpl(input: { reference: string; email: string }): Promise<CustomTourStatusView> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const res: any = await (supabaseAdmin as any)
    .from("custom_tour_requests")
    .select("id, reference_code, status, email, tour_date, start_time, hours, passengers, luggage, start_label, end_label, vehicle_name, stops, quoted_total, created_at")
    .eq("reference_code", input.reference)
    .maybeSingle();
  if (res.error) throw new Error("We couldn't check your request right now. Please try again.");
  const row = res.data;
  if (!row || String(row.email).toLowerCase() !== input.email) throw new Error(NOT_FOUND);
  const notes: any = await (supabaseAdmin as any)
    .from("custom_tour_request_notes")
    .select("body, created_at")
    .eq("request_id", row.id)
    .eq("visible_to_customer", true)
    .order("created_at", { ascending: false })
    .limit(20);
  if (notes.error) throw new Error("We couldn't check your request right now. Please try again.");
  const status = row.status as CustomTourStatus;
  return {
    reference: row.reference_code,
    status,
    statusLabel: CUSTOM_TOUR_STATUS_LABEL[status] ?? status,
    statusMessage: CUSTOM_TOUR_STATUS_CUSTOMER[status] ?? "",
    tourDate: row.tour_date,
    startTime: row.start_time,
    hours: Number(row.hours),
    passengers: row.passengers,
    luggage: row.luggage,
    startLabel: row.start_label,
    endLabel: row.end_label ?? null,
    vehicleName: row.vehicle_name ?? null,
    stops: ((row.stops ?? []) as StoredStop[]).map((s) => ({ name: s.name, dwellMinutes: s.dwellMinutes ?? null })),
    price: PRICE_VISIBLE_STATUSES.includes(status) && row.quoted_total != null ? Number(row.quoted_total) : null,
    createdAt: row.created_at,
    updates: ((notes.data ?? []) as any[]).map((n) => ({ at: n.created_at, body: n.body })),
  };
}

export async function emailCustomer(row: any, status: CustomTourStatus, message: string | null) {
  const { sendAndLog } = await import("@/lib/notifications.server");
  const { customTourRequestUpdateEmail } = await import("@/lib/email/tour.server");
  const price = PRICE_VISIBLE_STATUSES.includes(status) && row.quoted_total != null ? Number(row.quoted_total) : null;
  const tpl = customTourRequestUpdateEmail({
    reference: row.reference_code, customerName: row.customer_name, tourDate: row.tour_date, startTime: row.start_time,
    passengers: row.passengers, stops: ((row.stops ?? []) as StoredStop[]).map((s) => s.name), statusUrl: statusUrl(row.reference_code),
    statusLabel: CUSTOM_TOUR_STATUS_LABEL[status], statusMessage: CUSTOM_TOUR_STATUS_CUSTOMER[status], price, message,
  });
  const res = await sendAndLog({
    bookingId: null, eventKey: null, notificationType: "customer_custom_tour_update",
    recipientCategory: "customer", recipient: row.email, subject: tpl.subject, html: tpl.html, text: tpl.text,
  });
  if (!res.configured) return "Saved, but email sending isn't set up, so the customer wasn't emailed.";
  return res.ok ? null : "Saved, but the email to the customer failed.";
}

