// Server-only notification dispatcher.
//
// - Always logs an attempt to notification_log (best-effort).
// - Never throws to the caller: a failed email must not roll back the booking.
// - Deduplicates status-change emails by (booking_id, notification_type)
//   using the most-recent successful send.

import { getEmailAdapter, type EmailErrorCategory, type EmailSendInput } from "@/lib/email/adapter.server";
import {
  adminNewBookingEmail,
  customerReceivedEmail,
  statusChangeEmail,
  normaliseEmail,
  type BookingEmailContext,
} from "@/lib/email/templates.server";
import type { BookingStatus } from "@/lib/booking-lifecycle";

type LogRow = {
  id?: string;
  booking_id: string | null;
  channel: string;
  recipient: string;
  subject: string | null;
  status: "sent" | "failed" | "pending";
  notification_type: string;
  recipient_category: "customer" | "admin";
  provider_message_id?: string | null;
  attempt_count?: number;
  last_attempt_at?: string;
  error?: string | null;
  error_category?: EmailErrorCategory | null;
  sent_at?: string | null;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Sanitise a subject so nothing customer-provided ends up as raw headers. */
function safeRecipient(email: string): string {
  return normaliseEmail(email); // throws on header-injection chars
}

async function insertLog(row: LogRow): Promise<string | null> {
  try {
    const sb = await admin();
    const res: any = await sb
      .from("notification_log")
      .insert({
        booking_id: row.booking_id,
        channel: row.channel,
        recipient: row.recipient,
        subject: row.subject,
        status: row.status,
        notification_type: row.notification_type,
        recipient_category: row.recipient_category,
        provider_message_id: row.provider_message_id ?? null,
        attempt_count: row.attempt_count ?? 1,
        last_attempt_at: row.last_attempt_at ?? new Date().toISOString(),
        error: row.error ?? null,
        error_category: row.error_category ?? null,
        sent_at: row.sent_at ?? null,
      })
      .select("id")
      .single();
    return res?.data?.id ?? null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("notification_log insert failed", err);
    return null;
  }
}

async function sendEmail(input: EmailSendInput): Promise<{
  ok: boolean;
  providerMessageId: string | null;
  errorCategory: EmailErrorCategory | null;
  errorMessage: string | null;
}> {
  try {
    const adapter = getEmailAdapter();
    const res = await adapter.send(input);
    if (res.ok) return { ok: true, providerMessageId: res.providerMessageId, errorCategory: null, errorMessage: null };
    return { ok: false, providerMessageId: null, errorCategory: res.errorCategory, errorMessage: res.errorCategory };
  } catch (err: any) {
    return { ok: false, providerMessageId: null, errorCategory: "unknown", errorMessage: (err?.message ?? "unknown").slice(0, 500) };
  }
}

/** Fire-and-forget email send — logs outcome, never throws. */
export async function sendAndLog(params: {
  bookingId: string | null;
  notificationType: string;
  recipientCategory: "customer" | "admin";
  recipient: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: boolean; logId: string | null; providerMessageId: string | null }> {
  let recipient: string;
  try {
    recipient = safeRecipient(params.recipient);
  } catch {
    const id = await insertLog({
      booking_id: params.bookingId,
      channel: "email",
      recipient: (params.recipient || "").slice(0, 254),
      subject: params.subject,
      status: "failed",
      notification_type: params.notificationType,
      recipient_category: params.recipientCategory,
      error_category: "invalid_recipient",
      error: "invalid_recipient",
    });
    return { ok: false, logId: id, providerMessageId: null };
  }

  const send = await sendEmail({ to: recipient, subject: params.subject, html: params.html, text: params.text });
  const id = await insertLog({
    booking_id: params.bookingId,
    channel: "email",
    recipient,
    subject: params.subject,
    status: send.ok ? "sent" : "failed",
    notification_type: params.notificationType,
    recipient_category: params.recipientCategory,
    provider_message_id: send.providerMessageId,
    error: send.errorMessage,
    error_category: send.errorCategory,
    sent_at: send.ok ? new Date().toISOString() : null,
  });
  return { ok: send.ok, logId: id, providerMessageId: send.providerMessageId };
}

/** Look up whether we already sent this type for this booking. */
async function alreadySent(bookingId: string, notificationType: string): Promise<boolean> {
  try {
    const sb = await admin();
    const res: any = await sb
      .from("notification_log")
      .select("id")
      .eq("booking_id", bookingId)
      .eq("notification_type", notificationType)
      .eq("status", "sent")
      .limit(1);
    return Array.isArray(res?.data) && res.data.length > 0;
  } catch {
    return false;
  }
}

/** Look up the admin notification email address from site_settings. */
export async function getAdminNotificationEmail(): Promise<string | null> {
  try {
    const sb = await admin();
    const res: any = await sb.from("site_settings").select("admin_notification_email").limit(1).maybeSingle();
    const raw = res?.data?.admin_notification_email;
    if (!raw || typeof raw !== "string") return null;
    return normaliseEmail(raw);
  } catch {
    return null;
  }
}

// ============ High-level notification helpers ============

export async function notifyBookingReceived(ctx: BookingEmailContext, bookingId: string) {
  const email = customerReceivedEmail(ctx);
  await sendAndLog({
    bookingId,
    notificationType: "customer_booking_received",
    recipientCategory: "customer",
    recipient: ctx.customerEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}

export async function notifyAdminNewBooking(ctx: BookingEmailContext, bookingId: string) {
  const adminEmail = await getAdminNotificationEmail();
  if (!adminEmail) {
    await insertLog({
      booking_id: bookingId,
      channel: "email",
      recipient: "(admin not configured)",
      subject: null,
      status: "failed",
      notification_type: "admin_new_booking",
      recipient_category: "admin",
      error_category: "config_missing",
      error: "config_missing",
    });
    return;
  }
  const email = adminNewBookingEmail(ctx);
  await sendAndLog({
    bookingId,
    notificationType: "admin_new_booking",
    recipientCategory: "admin",
    recipient: adminEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}

export async function notifyStatusChange(ctx: BookingEmailContext, bookingId: string, status: BookingStatus) {
  const type = `customer_status_${status}`;
  if (await alreadySent(bookingId, type)) return { ok: true, deduplicated: true };
  const email = statusChangeEmail(ctx);
  const res = await sendAndLog({
    bookingId,
    notificationType: type,
    recipientCategory: "customer",
    recipient: ctx.customerEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
  return { ok: res.ok, deduplicated: false };
}

/** Retry a previously failed notification. Returns updated log id. */
export async function retryNotificationById(logId: string): Promise<{ ok: boolean; alreadySent: boolean }> {
  const sb = await admin();
  const existing: any = await sb.from("notification_log").select("*").eq("id", logId).maybeSingle();
  const row = existing?.data;
  if (!row) throw new Error("Notification not found");
  if (row.status === "sent") return { ok: true, alreadySent: true };

  // Rebuild the send. We regenerate using stored subject/body when present.
  // In this phase, the log stores subject only — retries call the send route again
  // using the recipient + subject + body-less pending row: without a template body
  // we cannot resend blindly. Instead we look up the booking and re-render.
  if (!row.booking_id) throw new Error("Cannot retry a notification without a booking reference");

  const b: any = await sb.from("bookings").select("*").eq("id", row.booking_id).maybeSingle();
  const booking = b?.data;
  if (!booking) throw new Error("Booking not found");

  const ctx: BookingEmailContext = {
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
  };

  let template;
  const type = row.notification_type as string;
  if (type === "customer_booking_received") template = customerReceivedEmail(ctx);
  else if (type === "admin_new_booking") template = adminNewBookingEmail(ctx);
  else if (type.startsWith("customer_status_")) template = statusChangeEmail(ctx);
  else throw new Error("Unsupported notification type");

  const send = await sendEmail({ to: row.recipient, subject: template.subject, html: template.html, text: template.text });
  const nowIso = new Date().toISOString();
  await sb
    .from("notification_log")
    .update({
      status: send.ok ? "sent" : "failed",
      attempt_count: (Number(row.attempt_count) || 0) + 1,
      last_attempt_at: nowIso,
      sent_at: send.ok ? nowIso : row.sent_at,
      provider_message_id: send.providerMessageId ?? row.provider_message_id,
      error: send.errorMessage ?? null,
      error_category: send.errorCategory ?? null,
    })
    .eq("id", logId);
  return { ok: send.ok, alreadySent: false };
}
