// Public tour enquiry submission. A tour enquiry is a real booking row
// (service_type = "private_tour") so it gets a reference, Manage Booking
// tracking, the shared cancellation flow and the same admin lifecycle as a
// transfer — the team just adds the price afterwards.

import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { checkLimit } from "@/lib/rate-limit.server";
import { assertCaptcha } from "@/lib/captcha.server";
import { TOUR_SERVICE_TYPE } from "@/lib/tour-enquiries";

const tourInput = z.object({
  tourSlug: z.string().trim().min(1).max(120),
  tourName: z.string().trim().min(1).max(160),
  routeFrom: z.string().trim().max(160).default(""),
  routeTo: z.string().trim().max(160).default(""),
  summary: z.string().trim().max(300).default(""),
  time: z.string().trim().regex(/^\d{1,2}:\d{2}$/, "Choose a start time."),
  passengers: z.number().int().min(1).max(60),
  luggage: z.number().int().min(0).max(60),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30).nullable().optional(),
  flight: z.string().trim().max(40).nullable().optional(),
  hotel: z.string().trim().max(200).nullable().optional(),
  stops: z.array(z.string().trim().min(1).max(160)).max(40).default([]),
  notes: z.string().trim().max(1500).nullable().optional(),
  /** Honeypot — must be empty. If filled we accept and drop silently. */
  website: z.string().trim().max(500).optional().default(""),
  captchaToken: z.string().trim().max(4096).optional().nullable(),
});

export type TourEnquiryInput = z.input<typeof tourInput>;
export type TourEnquiryResult = { ok: true; bookingRef: string };

// Short recent-dup cache so a rapid double-submit doesn't create two bookings.
const recent = new Map<string, { at: number; ref: string }>();
const RECENT_TTL_MS = 5 * 60_000;

export const submitTourEnquiry = createServerFn({ method: "POST" })
  .inputValidator((data: TourEnquiryInput) => tourInput.parse(data))
  .handler(async ({ data }): Promise<TourEnquiryResult> => {
    if (data.website && data.website.trim() !== "") {
      return { ok: true, bookingRef: "" };
    }

    let ip = "unknown";
    try { ip = getRequestIP({ xForwardedFor: true }) ?? "unknown"; } catch { /* no request ip */ }
    if (!checkLimit({ name: "tour-enquiry", windowMs: 10 * 60_000, max: 5 }, ip).ok) {
      try { setResponseStatus(429); } catch { /* headers already sent */ }
      throw new Error("You've sent several enquiries already. Please try again in a few minutes.");
    }

    await assertCaptcha(data.captchaToken, ip, setResponseStatus);

    const now = Date.now();
    for (const [k, v] of recent) if (v.at + RECENT_TTL_MS <= now) recent.delete(k);
    const dedupeKey = `${data.email.toLowerCase()}|${data.tourSlug}|${data.date}|${data.time}`;
    const seen = recent.get(dedupeKey);
    if (seen) return { ok: true, bookingRef: seen.ref };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const refRpc: any = await supabaseAdmin.rpc("generate_booking_ref");
    if (refRpc.error || !refRpc.data) {
      console.error("generate_booking_ref failed", refRpc.error);
      throw new Error("Couldn't save your enquiry. Please try again.");
    }
    const bookingRef = String(refRpc.data);

    const time = data.time.padStart(5, "0");
    const noteLines = [
      `TOUR ENQUIRY — ${data.tourName} (${data.tourSlug})`,
      data.routeFrom && data.routeTo ? `Route: ${data.routeFrom} → ${data.routeTo}` : null,
      data.summary || null,
      data.stops.length ? `Selected stops: ${data.stops.join(", ")}` : null,
      data.hotel ? `Hotel / drop-off: ${data.hotel}` : null,
      data.notes ? `\nCustomer notes: ${data.notes}` : null,
    ].filter(Boolean);

    const insert: any = {
      booking_ref: bookingRef,
      customer_name: data.name,
      email: data.email,
      phone: data.phone || null,
      pickup_address: data.routeFrom || data.tourName,
      dropoff_address: data.hotel || data.routeTo || data.routeFrom || data.tourName,
      pickup_date: data.date,
      pickup_time: time,
      passengers: data.passengers,
      luggage: data.luggage,
      hand_luggage: 0,
      flight_number: data.flight || null,
      notes: noteLines.join("\n"),
      status: "new",
      payment_status: "unpaid",
      price: null,
      service_type: TOUR_SERVICE_TYPE,
      original_service_type: TOUR_SERVICE_TYPE,
      tour_slug: data.tourSlug,
      tour_name: data.tourName,
      tour_stops: data.stops,
    };

    const res: any = await supabaseAdmin.from("bookings").insert(insert).select("id, booking_ref").maybeSingle();
    if (res.error || !res.data) {
      console.error("tour enquiry insert failed", res.error);
      throw new Error("Couldn't save your enquiry. Please try again.");
    }

    recent.set(dedupeKey, { at: now, ref: bookingRef });

    const { notifyTourEnquiryReceived } = await import("@/lib/notifications.server");
    await notifyTourEnquiryReceived({
      bookingRef,
      customerName: data.name,
      email: data.email,
      phone: data.phone || null,
      tourName: data.tourName,
      pickupDate: data.date,
      pickupTime: time,
      passengers: data.passengers,
      stops: data.stops,
      notes: data.notes || null,
    });

    return { ok: true, bookingRef };
  });
