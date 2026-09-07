// Public "Manage booking" server functions: verified lookup (track) and
// customer-initiated cancellation requests.
//
// Verification rule: the last name used on the booking is ALWAYS required, plus
// at least one of booking reference or email. That means a guessed reference
// alone reveals nothing, so a verified lookup can safely return the customer's
// own full journey details (unlike the masked reference-only tracker).

import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { checkLimit } from "@/lib/rate-limit.server";
import { SITE } from "@/lib/site";

const GENERIC_NOT_FOUND =
  "We couldn't match those details to a booking. Check the last name exactly as it was entered when booking, and either the reference or the email address used.";

const identitySchema = z
  .object({
    bookingRef: z.string().trim().max(50).optional().or(z.literal("")),
    email: z.string().trim().max(255).optional().or(z.literal("")),
    lastName: z.string().trim().min(2, "Enter the last name used on the booking").max(80),
  })
  .refine((v) => !!(v.bookingRef && v.bookingRef.trim()) || !!(v.email && v.email.trim()), {
    message: "Enter your booking reference or the email address used to book.",
    path: ["bookingRef"],
  });

type Identity = z.infer<typeof identitySchema>;

const SELECT =
  "id, booking_ref, status, payment_status, customer_name, email, phone, pickup_address, dropoff_address, pickup_place_id, dropoff_place_id, pickup_date, pickup_time, passengers, luggage, hand_luggage, vehicle_type, vehicle_id, vehicle_class_name_snapshot, vehicle_capacity_snapshot, flight_number, meet_greet, child_seat, child_seat_count, return_journey, notes, selected_pois, price, distance_miles, created_at, cancellation_reason, service_type, admin_notes";

function noStore() {
  try {
    setResponseHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    setResponseHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    setResponseHeader("Referrer-Policy", "no-referrer");
  } catch { /* not available in every context */ }
}

function ipOf(): string {
  try { return getRequestIP({ xForwardedFor: true }) ?? "unknown"; } catch { return "unknown"; }
}

/** Last-name match: the supplied value must equal one of the name's words. */
function surnameMatches(fullName: string | null, supplied: string): boolean {
  if (!fullName) return false;
  const want = supplied.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  if (!want) return false;
  const words = fullName.toLowerCase().split(/[\s'-]+/).map((w) => w.replace(/[^\p{L}\p{N}]+/gu, "")).filter(Boolean);
  return words.includes(want);
}

export type RefundTier = "unpaid" | "full" | "partial" | "none";

export type ManagedBooking = {
  bookingRef: string;
  status: string;
  paymentStatus: string;
  customerName: string;
  email: string;
  phone: string | null;
  pickupAddress: string;
  dropoffAddress: string;
  pickupDate: string;
  pickupTime: string;
  passengers: number;
  luggage: number;
  handLuggage: number;
  vehicleType: string | null;
  flightNumber: string | null;
  meetGreet: boolean;
  childSeat: boolean;
  childSeatCount: number;
  returnJourney: boolean;
  notes: string | null;
  price: number | null;
  distanceMiles: number | null;
  createdAt: string;
  cancellationReason: string | null;
  serviceType: string | null;
  /** Cancellation window facts, computed server-side (never trust the clock in the browser). */
  cancellation: {
    /** Whether a cancellation request can still be submitted. */
    allowed: boolean;
    /** Why not, when `allowed` is false. */
    blockedReason: string | null;
    tier: RefundTier;
    hoursUntilPickup: number | null;
    withinBookingGrace: boolean;
    policyLabel: string;
    policyDetail: string;
  };
  /** Amendment window facts (what the customer may change themselves). */
  amendment: {
    allowed: boolean;
    blockedReason: string | null;
  };
};


/** Combine pickup date + "HH:MM" into a UTC-ish timestamp for window maths. */
function pickupTimestamp(date: string | null, time: string | null): number | null {
  if (!date) return null;
  const t = /^\d{1,2}:\d{2}$/.test(time ?? "") ? (time as string) : "00:00";
  const ms = Date.parse(`${date}T${t.padStart(5, "0")}:00Z`);
  return Number.isFinite(ms) ? ms : null;
}

const TERMINAL = new Set(["cancelled", "rejected", "completed"]);

function cancellationFacts(row: any, now = Date.now()): ManagedBooking["cancellation"] {
  const createdMs = Date.parse(row.created_at ?? "");
  const withinBookingGrace = Number.isFinite(createdMs) && now - createdMs <= 24 * 3_600_000;
  const pickupMs = pickupTimestamp(row.pickup_date, row.pickup_time);
  const hoursUntilPickup = pickupMs == null ? null : Math.round(((pickupMs - now) / 3_600_000) * 10) / 10;

  const status = String(row.status ?? "");
  let allowed = true;
  let blockedReason: string | null = null;
  if (TERMINAL.has(status)) {
    allowed = false;
    blockedReason =
      status === "cancelled"
        ? "This booking is already cancelled."
        : status === "completed"
        ? "This journey has already been completed, so it can no longer be cancelled."
        : "This booking is no longer active. Please contact us if you need help.";
  } else if (hoursUntilPickup != null && hoursUntilPickup < 0) {
    allowed = false;
    blockedReason = `The pickup time has already passed. Please call us on ${SITE.phoneUK} so we can help.`;
  }

  const farFromPickup = hoursUntilPickup == null ? true : hoursUntilPickup >= 24;
  const paymentStatus = String(row.payment_status ?? "unpaid");
  const nothingPaid = paymentStatus === "unpaid" || paymentStatus === "failed";
  const tier: RefundTier = !allowed
    ? "none"
    : nothingPaid
    ? "unpaid"
    : withinBookingGrace || farFromPickup
    ? "full"
    : "partial";

  const policyLabel =
    tier === "unpaid"
      ? "No payment taken — nothing to refund"
      : tier === "full"
      ? "Eligible for a full refund"
      : tier === "partial"
      ? "Eligible for a partial refund claim"
      : "Refund review required";
  const policyDetail =
    tier === "unpaid"
      ? "We have not charged you for this booking yet, so cancelling costs you nothing and there is no refund to process. We'll release the vehicle and confirm by email."
      : tier === "full"
      ? withinBookingGrace
        ? "You booked less than 24 hours ago, so cancelling now qualifies for a full refund of anything you have paid."
        : "Your pickup is more than 24 hours away, so cancelling now qualifies for a full refund of anything you have paid."
      : tier === "partial"
      ? "Your pickup is less than 24 hours away. Cancelling now is treated as a partial-refund claim — our team reviews driver and allocation costs already committed and confirms the amount by email."
      : "Our team will review this booking manually and reply by email.";

  return { allowed, blockedReason, tier, hoursUntilPickup, withinBookingGrace, policyLabel, policyDetail };
}

async function findBooking(id: Identity) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const ref = (id.bookingRef ?? "").trim().toUpperCase();
  const email = (id.email ?? "").trim().toLowerCase();

  let query = supabaseAdmin.from("bookings").select(SELECT).is("deleted_at", null);
  if (ref) query = query.eq("booking_ref", ref);
  if (email) query = query.ilike("email", email);

  const res: any = await query.order("created_at", { ascending: false }).limit(5);
  if (res.error) throw new Error("Unable to look up your booking right now. Please try again.");
  const rows: any[] = res.data ?? [];
  const match = rows.find((r) => surnameMatches(r.customer_name, id.lastName));
  return match ?? null;
}

function project(row: any): ManagedBooking {
  return {
    bookingRef: row.booking_ref,
    status: row.status,
    paymentStatus: (row.payment_status ?? "unpaid") as string,
    customerName: row.customer_name,
    email: row.email,
    phone: row.phone ?? null,
    pickupAddress: row.pickup_address,
    dropoffAddress: row.dropoff_address,
    pickupDate: row.pickup_date,
    pickupTime: row.pickup_time,
    passengers: row.passengers ?? 1,
    luggage: row.luggage ?? 0,
    handLuggage: row.hand_luggage ?? 0,
    vehicleType: row.vehicle_class_name_snapshot ?? row.vehicle_type ?? null,
    flightNumber: row.flight_number ?? null,
    meetGreet: !!row.meet_greet,
    childSeat: !!row.child_seat,
    returnJourney: !!row.return_journey,
    price: row.price == null ? null : Number(row.price),
    distanceMiles: row.distance_miles == null ? null : Number(row.distance_miles),
    createdAt: row.created_at,
    cancellationReason: row.cancellation_reason ?? null,
    serviceType: row.service_type ?? null,
    cancellation: cancellationFacts(row),
  };
}

// ---------------- Verified lookup ----------------
export const findMyBooking = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => identitySchema.parse(input))
  .handler(async ({ data }) => {
    noStore();
    const ip = ipOf();
    if (!checkLimit({ name: "manageBookingLookup", windowMs: 10 * 60_000, max: 15 }, ip).ok) {
      try { setResponseStatus(429); } catch {}
      throw new Error("Too many attempts. Please wait a few minutes and try again.");
    }
    const row = await findBooking(data);
    if (!row) throw new Error(GENERIC_NOT_FOUND);
    return project(row);
  });

// ---------------- Cancellation request ----------------
const CANCEL_REASONS = [
  "Travel plans changed",
  "Flight cancelled or rescheduled",
  "Booked by mistake / duplicate booking",
  "Found an alternative arrangement",
  "Illness or emergency",
  "Other",
] as const;

export const CANCELLATION_REASONS = CANCEL_REASONS;

const cancelInput = z.object({
  bookingRef: z.string().trim().max(50).optional().or(z.literal("")),
  email: z.string().trim().max(255).optional().or(z.literal("")),
  lastName: z.string().trim().min(2).max(80),
  reason: z.enum(CANCEL_REASONS),
  details: z.string().trim().max(600).optional().or(z.literal("")),
  callbackPhone: z.string().trim().max(30).optional().or(z.literal("")),
});

export const requestBookingCancellation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => cancelInput.parse(input))
  .handler(async ({ data }) => {
    noStore();
    const ip = ipOf();
    if (!checkLimit({ name: "manageBookingCancel", windowMs: 10 * 60_000, max: 5 }, ip).ok) {
      try { setResponseStatus(429); } catch {}
      throw new Error("Too many requests. Please wait a few minutes or call us instead.");
    }

    const row = await findBooking({ bookingRef: data.bookingRef, email: data.email, lastName: data.lastName } as Identity);
    if (!row) throw new Error(GENERIC_NOT_FOUND);

    const facts = cancellationFacts(row);
    if (!facts.allowed) throw new Error(facts.blockedReason ?? "This booking can no longer be cancelled online.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const message = [
      `Cancellation request for booking ${row.booking_ref}.`,
      `Refund tier assessed: ${facts.tier === "unpaid" ? "NO PAYMENT TAKEN — nothing to refund" : facts.tier === "full" ? "FULL REFUND" : "PARTIAL REFUND CLAIM"}.`,
      facts.hoursUntilPickup != null ? `Hours until pickup at request time: ${facts.hoursUntilPickup}.` : "",
      `Booked at: ${row.created_at}.`,
      `Journey: ${row.pickup_address} → ${row.dropoff_address} on ${row.pickup_date} ${row.pickup_time}.`,
      `Fare on file: ${row.price == null ? "—" : `£${Number(row.price).toFixed(2)}`} (${row.payment_status}).`,
      "",
      `Reason: ${data.reason}`,
      data.details ? `Customer notes: ${data.details}` : "",
      data.callbackPhone ? `Call-back number: ${data.callbackPhone}` : `Call-back number: ${row.phone ?? "—"}`,
    ]
      .filter(Boolean)
      .join("\n");

    const { error } = await supabaseAdmin.from("cancellation_requests").insert({
      booking_id: row.id ?? null,
      booking_ref: row.booking_ref,
      customer_name: row.customer_name,
      email: row.email,
      phone: row.phone ?? null,
      reason: data.reason,
      details: data.details || null,
      callback_phone: data.callbackPhone || null,
      refund_tier: facts.tier,
      hours_until_pickup: facts.hoursUntilPickup,
      price_at_request: row.price ?? null,
      payment_status_at_request: row.payment_status ?? null,
      pickup_date: row.pickup_date ?? null,
      pickup_time: row.pickup_time ?? null,
      pickup_address: row.pickup_address ?? null,
      dropoff_address: row.dropoff_address ?? null,
      status: "pending",
    });
    if (error) {
      console.error("cancellation request insert failed", error);
      throw new Error("We couldn't record that request. Please call us so we can cancel it for you.");
    }

    // Flag it on the booking itself so the operations panel sees the intent
    // even before anyone opens the inbox. The status change stays with an
    // admin, because refunds are money movements.
    try {
      await supabaseAdmin
        .from("bookings")
        .update({
          admin_notes: `${row.admin_notes ? `${row.admin_notes}\n\n` : ""}[${new Date().toISOString()}] Customer cancellation request (${facts.tier}): ${data.reason}${data.details ? ` — ${data.details}` : ""}`,
        })
        .eq("booking_ref", row.booking_ref);
    } catch (err) {
      console.error("cancellation admin_notes update failed", err);
    }

    try {
      const { notifyEnquiry } = await import("@/lib/notifications.server");
      await notifyEnquiry({
        kind: "contact",
        name: row.customer_name,
        email: row.email,
        phone: data.callbackPhone || row.phone || null,
        subject: `Cancellation request: ${row.booking_ref}`,
        message,
        extra: [
          { label: "Booking reference", value: row.booking_ref },
          { label: "Refund tier", value: facts.tier === "full" ? "Full refund" : "Partial refund claim" },
          { label: "Pickup", value: `${row.pickup_date} ${row.pickup_time}` },
          { label: "Reason", value: data.reason },
        ],
      });
    } catch (err) {
      console.error("cancellation notify failed", err);
    }

    return {
      ok: true as const,
      bookingRef: row.booking_ref as string,
      tier: facts.tier,
      phone: SITE.phoneUK,
    };
  });
