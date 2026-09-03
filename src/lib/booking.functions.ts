// Public + admin server functions for the booking lifecycle.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { hashConfirmationToken, isConfirmationTokenShape } from "@/lib/booking-confirmation.server";
import { notifyStatusChange, retryNotificationById } from "@/lib/notifications.server";
import { checkLimit } from "@/lib/rate-limit.server";
import { getRequestIP, setResponseHeader } from "@tanstack/react-start/server";
import { BOOKING_STATUSES, STATUS_META, type BookingStatus } from "@/lib/booking-lifecycle";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden: admin access required");
}

/** Response headers applied to every confirmation-token lookup. */
function applyConfirmationHeaders() {
  try {
    setResponseHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    setResponseHeader("Referrer-Policy", "no-referrer");
    setResponseHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  } catch { /* headers not available in some contexts */ }
}

// ---------------- Public: get booking by confirmation token ----------------
export const getBookingByToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ token: z.string().trim().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data }) => {
    applyConfirmationHeaders();

    // Generic message reused for every failure — never leak whether the
    // token was malformed, expired, or unknown.
    const GENERIC = "This booking confirmation link is invalid or has expired. Please contact Cabslink and provide your booking reference.";

    if (!isConfirmationTokenShape(data.token)) {
      throw new Error(GENERIC);
    }
    let ip = "unknown";
    try { ip = getRequestIP({ xForwardedFor: true }) ?? "unknown"; } catch {}
    if (!checkLimit({ name: "confirmationLookup", windowMs: 60_000, max: 30 }, ip).ok) {
      throw new Error("Too many requests. Please try again in a moment.");
    }
    const hash = hashConfirmationToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const res: any = await supabaseAdmin.rpc("get_booking_by_confirmation_hash", { _hash: hash });
    const row = Array.isArray(res?.data) ? res.data[0] : res?.data;
    if (!row) throw new Error(GENERIC);
    // Customer-safe projection: no ids, place ids, hashes, tokens, or admin fields.
    return {
      bookingRef: row.booking_ref,
      status: row.status,
      paymentStatus: row.payment_status,
      customerName: row.customer_name,
      customerEmail: row.email,
      customerPhone: row.phone,
      pickupAddress: row.pickup_address,
      dropoffAddress: row.dropoff_address,
      pickupDate: row.pickup_date,
      pickupTime: row.pickup_time,
      passengers: row.passengers,
      luggage: row.luggage,
      handLuggage: (row as { hand_luggage?: number }).hand_luggage ?? 0,
      vehicleType: row.vehicle_type,
      flightNumber: row.flight_number,
      childSeat: !!row.child_seat,
      meetGreet: !!row.meet_greet,
      returnJourney: !!row.return_journey,
      price: row.price == null ? null : Number(row.price),
      distanceMiles: row.distance_miles == null ? null : Number(row.distance_miles),
      notes: row.notes,
      createdAt: row.created_at,
    };
  });

// ---------------- Public: track booking by reference ----------------
const trackBookingSchema = z.object({
  bookingRef: z.string().trim().min(1).max(50),
});

/** j***@e***.com — enough for the owner to recognise, useless to a scraper. */
function maskEmail(v: string | null): string {
  if (!v) return "—";
  const [user = "", domain = ""] = v.split("@");
  const u = user.slice(0, 1) + "***";
  const dotIdx = domain.lastIndexOf(".");
  const tld = dotIdx >= 0 ? domain.slice(dotIdx) : "";
  return `${u}@${domain.slice(0, 1)}***${tld}`;
}

/** •••• 123 */
function maskPhone(v: string | null): string {
  if (!v) return "—";
  const digits = v.replace(/\D/g, "");
  return digits.length < 3 ? "•••" : `•••• ${digits.slice(-3)}`;
}

/** First name only. */
function maskName(v: string | null): string {
  if (!v) return "—";
  return v.trim().split(/\s+/)[0] ?? "—";
}

/**
 * Keep only the coarse locality (last one or two comma segments) so the
 * customer can confirm the journey without exposing a street address.
 */
function maskAddress(v: string | null): string {
  if (!v) return "—";
  const parts = v.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "—";
  return parts.slice(-2).join(", ");
}

export const getBookingByReference = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => trackBookingSchema.parse(input))
  .handler(async ({ data }) => {
    applyConfirmationHeaders();

    let ip = "unknown";
    try { ip = getRequestIP({ xForwardedFor: true }) ?? "unknown"; } catch {}
    if (!checkLimit({ name: "bookingTrackLookup", windowMs: 60_000, max: 10 }, ip).ok) {
      throw new Error("Too many requests. Please try again in a moment.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const res: any = await supabaseAdmin
      .from("bookings")
      .select("booking_ref, status, payment_status, customer_name, email, phone, pickup_address, dropoff_address, pickup_date, pickup_time, passengers, vehicle_type, distance_miles")
      .eq("booking_ref", data.bookingRef.trim().toUpperCase())
      .maybeSingle();

    if (res.error) throw new Error("Unable to look up booking. Please try again.");
    if (!res.data) {
      throw new Error("We couldn't find a booking with that reference. Please check and try again.");
    }

    const row = res.data;

    // Reference-only lookups are unauthenticated, so this projection is
    // deliberately minimal + masked: a guessed reference must never reveal
    // another customer's contact details, exact addresses, notes or price.
    // Full details stay behind the unguessable confirmation-token link.
    return {
      bookingRef: row.booking_ref,
      status: row.status,
      paymentStatus: (row.payment_status ?? "unpaid") as string,
      customerName: maskName(row.customer_name),
      customerEmail: maskEmail(row.email),
      customerPhone: maskPhone(row.phone),
      pickupAddress: maskAddress(row.pickup_address),
      dropoffAddress: maskAddress(row.dropoff_address),
      pickupDate: row.pickup_date,
      pickupTime: row.pickup_time,
      passengers: row.passengers,
      vehicleType: row.vehicle_type,
      distanceMiles: row.distance_miles == null ? null : Number(row.distance_miles),
    };
  });


// ---------------- Admin: list notifications for a booking ----------------
export const listBookingNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ bookingId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("notification_log")
      .select("id, booking_id, channel, recipient, subject, status, notification_type, recipient_category, event_key, attempt_count, last_attempt_at, sent_at, error_category, created_at")
      .eq("booking_id", data.bookingId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ---------------- Admin: retry a failed notification ----------------
export const retryBookingNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ logId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!checkLimit({ name: "retryNotification", windowMs: 5 * 60_000, max: 30 }, context.userId).ok) {
      throw new Error("Too many retries. Please wait a moment and try again.");
    }
    const res = await retryNotificationById(data.logId);
    try {
      await context.supabase.from("activity_logs").insert({
        actor_id: context.userId,
        action: res.providerConfigured ? "notification_retry" : "notification_retry_blocked",
        entity: "notification_log",
        entity_id: data.logId,
        diff: { ok: res.ok, alreadySent: res.alreadySent, providerConfigured: res.providerConfigured },
      });
    } catch { /* activity log is best-effort */ }
    return res;
  });

// ---------------- Admin: private notification recipient ----------------
export const getAdminNotificationRecipient = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const res: any = await context.supabase
      .from("private_settings")
      .select("value")
      .eq("key", "admin_notification_email")
      .maybeSingle();
    return { email: (res?.data?.value as string | null) ?? null };
  });

export const setAdminNotificationRecipient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ email: z.string().trim().email().max(254).nullable() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const value = data.email ? data.email.trim().toLowerCase() : null;
    const existing: any = await context.supabase
      .from("private_settings")
      .select("id")
      .eq("key", "admin_notification_email")
      .maybeSingle();
    if (existing?.data?.id) {
      const upd = await context.supabase
        .from("private_settings")
        .update({ value })
        .eq("id", existing.data.id);
      if (upd.error) throw new Error(upd.error.message);
    } else {
      const ins = await context.supabase
        .from("private_settings")
        .insert({ key: "admin_notification_email", value } as any);
      if (ins.error) throw new Error(ins.error.message);
    }
    try {
      await context.supabase.from("activity_logs").insert({
        actor_id: context.userId,
        action: "admin_notification_email_changed",
        entity: "private_settings",
        entity_id: "admin_notification_email",
        diff: { has_value: !!value },
      });
    } catch { /* best-effort */ }
    return { ok: true };
  });

// ---------------- Admin: controlled status transition ----------------
const bookingStatusSchema = z.enum(BOOKING_STATUSES as unknown as [string, ...string[]]);

export const setBookingStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: bookingStatusSchema,
      reason: z.string().trim().max(1000).optional().nullable(),
      override: z.boolean().optional().default(false),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const newStatus = data.status as BookingStatus;
    const meta = STATUS_META[newStatus];
    if (!meta) throw new Error("Unknown status");
    if (!meta.adminSelectable && !data.override) {
      throw new Error("This status can only be set with an explicit override.");
    }
    const rpc: any = await context.supabase.rpc("set_booking_status", {
      _booking_id: data.id,
      _new_status: newStatus,
      _actor_id: context.userId,
      _reason: data.reason ?? undefined,
      _override: !!data.override,
    });
    if (rpc.error) throw new Error(rpc.error.message);
    const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;

    // Only fire the customer notification when the status actually changed
    // AND the target notifies the customer. Same-status saves create no event.
    if (row?.changed && meta.notifyCustomer) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const b: any = await supabaseAdmin.from("bookings").select("*").eq("id", data.id).maybeSingle();
        const booking = b?.data;
        if (booking?.email) {
          await notifyStatusChange({
            bookingRef: booking.booking_ref,
            status: booking.status,
            paymentMode: "manual",
            customerName: booking.customer_name,
            customerEmail: booking.email,
            customerPhone: booking.phone,
            pickupAddress: booking.pickup_address,
            dropoffAddress: booking.dropoff_address,
            pickupDate: booking.pickup_date,
            pickupTime: booking.pickup_time,
            vehicleType: booking.vehicle_type,
            passengers: booking.passengers,
            luggage: booking.luggage,
            flightNumber: booking.flight_number,
            meetGreet: !!booking.meet_greet,
            childSeat: !!booking.child_seat,
            returnJourney: !!booking.return_journey,
            distanceMiles: booking.distance_miles,
            price: booking.price,
            notes: booking.notes,
            cancellationReason: booking.cancellation_reason,
          }, data.id, booking.status, row?.transition_id ?? null);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("status change notification failed", err);
      }
    }

    return {
      ok: true,
      changed: !!row?.changed,
      previous: row?.previous_status ?? null,
      current: row?.status ?? newStatus,
    };
  });
