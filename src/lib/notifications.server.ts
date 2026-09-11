// Server-only notification dispatcher.
//
// Design:
// - Every logical notification event has an `event_key` (unique per booking).
//   Repeating the same operational event reuses the existing log row instead
//   of creating a duplicate. A genuinely new event (e.g. a later status
//   transition) has a different `event_key` and creates a new row.
// - When no email provider is configured, records are stored with
//   status = `not_configured`. The system NEVER records `sent` and NEVER
//   invents a provider message id in that state.
// - Retry re-invokes the adapter. If the adapter is still `not_configured`,
//   retry reports "provider not configured" instead of pretending to send.
// - Nothing here ever throws to the caller — a failed notification must
//   not roll back a booking.

import {
  getEmailAdapter,
  type EmailErrorCategory,
  type EmailSendInput,
} from "@/lib/email/adapter.server";
import {
  adminNewBookingEmail,
  customerReceivedEmail,
  statusChangeEmail,
  normaliseEmail,
  type BookingEmailContext,
} from "@/lib/email/templates.server";
import {
  adminEnquiryEmail,
  customerEnquiryAckEmail,
  type EnquiryContext,
} from "@/lib/email/enquiry.server";
import type { BookingStatus } from "@/lib/booking-lifecycle";

type LogStatus = "sent" | "failed" | "pending" | "not_configured";

type LogRow = {
  booking_id: string | null;
  event_key: string | null;
  channel: string;
  recipient: string;
  subject: string | null;
  status: LogStatus;
  notification_type: string;
  recipient_category: "customer" | "admin";
  provider_message_id?: string | null;
  attempt_count?: number;
  last_attempt_at?: string | null;
  error?: string | null;
  error_category?: EmailErrorCategory | null;
  sent_at?: string | null;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function safeRecipient(email: string): string {
  return normaliseEmail(email);
}

/** Insert a log row. On event_key collision, returns the existing row's id. */
async function upsertLog(row: LogRow): Promise<string | null> {
  try {
    const sb = await admin();
    // If a row for this booking + event_key already exists, reuse it.
    if (row.booking_id && row.event_key) {
      const existing: any = await sb
        .from("notification_log")
        .select("id")
        .eq("booking_id", row.booking_id)
        .eq("event_key", row.event_key)
        .maybeSingle();
      if (existing?.data?.id) return existing.data.id as string;
    }
    const res: any = await sb
      .from("notification_log")
      .insert({
        booking_id: row.booking_id,
        event_key: row.event_key,
        channel: row.channel,
        recipient: row.recipient,
        subject: row.subject,
        status: row.status,
        notification_type: row.notification_type,
        recipient_category: row.recipient_category,
        provider_message_id: row.provider_message_id ?? null,
        attempt_count: row.attempt_count ?? 0,
        last_attempt_at: row.last_attempt_at ?? null,
        error: row.error ?? null,
        error_category: row.error_category ?? null,
        sent_at: row.sent_at ?? null,
      } as any)
      .select("id")
      .single();
    return res?.data?.id ?? null;
  } catch (err) {
    // Unique-violation on (booking_id, event_key) → look up existing.
    try {
      if (row.booking_id && row.event_key) {
        const sb = await admin();
        const existing: any = await sb
          .from("notification_log")
          .select("id")
          .eq("booking_id", row.booking_id)
          .eq("event_key", row.event_key)
          .maybeSingle();
        return existing?.data?.id ?? null;
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line no-console
    console.error("notification_log insert failed");
    return null;
  }
}

async function sendViaAdapter(input: EmailSendInput): Promise<{
  ok: boolean;
  configured: boolean;
  providerMessageId: string | null;
  errorCategory: EmailErrorCategory | null;
  errorMessage: string | null;
}> {
  const adapter = getEmailAdapter();
  try {
    const res = await adapter.send(input);
    if (res.ok) {
      return {
        ok: true,
        configured: adapter.configured,
        providerMessageId: res.providerMessageId,
        errorCategory: null,
        errorMessage: null,
      };
    }
    return {
      ok: false,
      configured: adapter.configured,
      providerMessageId: null,
      errorCategory: res.errorCategory,
      errorMessage: res.errorCategory,
    };
  } catch (err: any) {
    return {
      ok: false,
      configured: adapter.configured,
      providerMessageId: null,
      errorCategory: "unknown",
      errorMessage: (err?.message ?? "unknown").slice(0, 500),
    };
  }
}

/** Prepare + best-effort dispatch one notification event. */
export async function sendAndLog(params: {
  bookingId: string | null;
  eventKey: string | null;
  notificationType: string;
  recipientCategory: "customer" | "admin";
  recipient: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: boolean; logId: string | null; configured: boolean; providerMessageId: string | null }> {
  let recipient: string;
  try {
    recipient = safeRecipient(params.recipient);
  } catch {
    const id = await upsertLog({
      booking_id: params.bookingId,
      event_key: params.eventKey,
      channel: "email",
      recipient: (params.recipient || "").slice(0, 254),
      subject: params.subject,
      status: "failed",
      notification_type: params.notificationType,
      recipient_category: params.recipientCategory,
      error_category: "invalid_recipient",
      error: "invalid_recipient",
    });
    return { ok: false, logId: id, configured: false, providerMessageId: null };
  }

  const send = await sendViaAdapter({
    to: recipient,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });

  // When no provider is configured, we record "not_configured" — never
  // "sent", never "failed". No provider message id is ever fabricated.
  let status: LogStatus;
  if (!send.configured) status = "not_configured";
  else status = send.ok ? "sent" : "failed";

  const nowIso = new Date().toISOString();
  const id = await upsertLog({
    booking_id: params.bookingId,
    event_key: params.eventKey,
    channel: "email",
    recipient,
    subject: params.subject,
    status,
    notification_type: params.notificationType,
    recipient_category: params.recipientCategory,
    provider_message_id: send.providerMessageId, // null unless configured provider returned one
    attempt_count: send.configured ? 1 : 0,
    last_attempt_at: send.configured ? nowIso : null,
    error: send.errorMessage,
    error_category: send.errorCategory,
    sent_at: send.ok && send.configured ? nowIso : null,
  });

  return {
    ok: status === "sent",
    logId: id,
    configured: send.configured,
    providerMessageId: send.providerMessageId,
  };
}

/** Look up the admin notification email from the private (admin-only) settings table. */
export async function getAdminNotificationEmail(): Promise<string | null> {
  try {
    const sb = await admin();
    const res: any = await sb
      .from("private_settings")
      .select("value")
      .eq("key", "admin_notification_email")
      .maybeSingle();
    const raw = res?.data?.value;
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
    eventKey: "customer_booking_received",
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
    await upsertLog({
      booking_id: bookingId,
      event_key: "admin_new_booking",
      channel: "email",
      recipient: "(admin recipient not configured)",
      subject: null,
      status: "not_configured",
      notification_type: "admin_new_booking",
      recipient_category: "admin",
      error_category: "config_missing",
      error: "admin_recipient_missing",
    });
    return;
  }
  const email = adminNewBookingEmail(ctx);
  await sendAndLog({
    bookingId,
    eventKey: "admin_new_booking",
    notificationType: "admin_new_booking",
    recipientCategory: "admin",
    recipient: adminEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}

export async function notifyStatusChange(
  ctx: BookingEmailContext,
  bookingId: string,
  status: BookingStatus,
  transitionId: string | null,
) {
  // Include transition id so repeated legitimate transitions to the same
  // status (e.g. confirmed→assigned→confirmed→assigned) each create a fresh
  // event, while retries of the SAME transition reuse the existing log row.
  const eventKey = transitionId
    ? `customer_status_${status}:${transitionId}`
    : `customer_status_${status}`;
  const email = statusChangeEmail(ctx);
  const res = await sendAndLog({
    bookingId,
    eventKey,
    notificationType: `customer_status_${status}`,
    recipientCategory: "customer",
    recipient: ctx.customerEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
  return { ok: res.ok, configured: res.configured };
}

/**
 * Retry a previously prepared notification.
 *
 * When no provider is configured, this NEVER pretends to send. It returns
 * a structured "provider not configured" result and does not increment
 * `attempt_count` or invent a provider id.
 */
export async function retryNotificationById(logId: string): Promise<{
  ok: boolean;
  alreadySent: boolean;
  providerConfigured: boolean;
  reason?: string;
}> {
  const sb = await admin();
  const existing: any = await sb.from("notification_log").select("*").eq("id", logId).maybeSingle();
  const row = existing?.data;
  if (!row) throw new Error("Notification not found");
  if (row.status === "sent") return { ok: true, alreadySent: true, providerConfigured: true };
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

  let template: { subject: string; html: string; text: string };
  const type = row.notification_type as string;
  if (type === "customer_booking_received") template = customerReceivedEmail(ctx);
  else if (type === "admin_new_booking") template = adminNewBookingEmail(ctx);
  else if (type.startsWith("customer_status_")) template = statusChangeEmail(ctx);
  else throw new Error("Unsupported notification type");

  const send = await sendViaAdapter({
    to: row.recipient,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  // Provider still not configured → block, do NOT record success, do NOT
  // increment attempt_count, do NOT invent a provider id.
  if (!send.configured) {
    await sb
      .from("notification_log")
      .update({
        status: "not_configured",
        error: "provider_not_configured",
        error_category: "config_missing",
      })
      .eq("id", logId);
    return { ok: false, alreadySent: false, providerConfigured: false, reason: "Email provider not configured" };
  }

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

  return { ok: send.ok, alreadySent: false, providerConfigured: true };
}

// ============ Non-booking enquiries (forms) ============

/**
 * Notify the team about a form submission and acknowledge the sender.
 * Best-effort: never throws, so a failed email cannot fail the form.
 */
export async function notifyEnquiry(ctx: EnquiryContext): Promise<void> {
  try {
    const adminEmail = await getAdminNotificationEmail();
    const adminTpl = adminEnquiryEmail(ctx);
    if (adminEmail) {
      await sendAndLog({
        bookingId: null,
        eventKey: null,
        notificationType: `admin_enquiry_${ctx.kind}`,
        recipientCategory: "admin",
        recipient: adminEmail,
        subject: adminTpl.subject,
        html: adminTpl.html,
        text: adminTpl.text,
      });
    } else {
      await upsertLog({
        booking_id: null,
        event_key: null,
        channel: "email",
        recipient: "(admin recipient not configured)",
        subject: adminTpl.subject,
        status: "not_configured",
        notification_type: `admin_enquiry_${ctx.kind}`,
        recipient_category: "admin",
        error_category: "config_missing",
        error: "admin_recipient_missing",
      });
    }

    const ackTpl = customerEnquiryAckEmail(ctx);
    await sendAndLog({
      bookingId: null,
      eventKey: null,
      notificationType: `customer_enquiry_ack_${ctx.kind}`,
      recipientCategory: "customer",
      recipient: ctx.email,
      subject: ackTpl.subject,
      html: ackTpl.html,
      text: ackTpl.text,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("notifyEnquiry failed", err);
  }
}

// ---------------------------------------------------------------------------
// Tour enquiries. These are bookings (service_type = "private_tour") priced by
// the team after the customer submits, so they get their own two emails:
// an acknowledgement on submission and a confirmation once a price is set.
// ---------------------------------------------------------------------------

const PUBLIC_SITE_URL = "https://cabslink.com";

function manageBookingUrl(bookingRef: string): string {
  return `${PUBLIC_SITE_URL}/manage-booking?ref=${encodeURIComponent(bookingRef)}`;
}

export type TourEnquiryNotification = {
  bookingRef: string;
  customerName: string;
  email: string;
  phone: string | null;
  tourName: string;
  pickupDate: string;
  pickupTime: string;
  passengers: number;
  stops: string[];
  notes: string | null;
};

/** Acknowledgement to the customer + heads-up to the tour desk. */
export async function notifyTourEnquiryReceived(ctx: TourEnquiryNotification): Promise<void> {
  try {
    const { tourEnquiryReceivedEmail } = await import("@/lib/email/tour.server");
    const tpl = tourEnquiryReceivedEmail({
      bookingRef: ctx.bookingRef,
      customerName: ctx.customerName,
      tourName: ctx.tourName,
      pickupDate: ctx.pickupDate,
      pickupTime: ctx.pickupTime,
      passengers: ctx.passengers,
      manageUrl: manageBookingUrl(ctx.bookingRef),
    });
    await sendAndLog({
      bookingId: null,
      eventKey: `tour_ack_${ctx.bookingRef}`,
      notificationType: "customer_tour_enquiry_ack",
      recipientCategory: "customer",
      recipient: ctx.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });

    const adminEmail = await getAdminNotificationEmail();
    if (adminEmail) {
      const lines = [
        `New tour enquiry — ${ctx.tourName}`,
        `Reference: ${ctx.bookingRef}`,
        `Customer: ${ctx.customerName} (${ctx.email}${ctx.phone ? `, ${ctx.phone}` : ""})`,
        `Date/time: ${ctx.pickupDate} ${ctx.pickupTime}`,
        `Passengers: ${ctx.passengers}`,
        ctx.stops.length ? `Stops: ${ctx.stops.join(", ")}` : null,
        ctx.notes ? `Notes: ${ctx.notes}` : null,
        "",
        "Add the agreed price in the admin panel to confirm it and email the customer.",
      ].filter(Boolean) as string[];
      await sendAndLog({
        bookingId: null,
        eventKey: `tour_ack_admin_${ctx.bookingRef}`,
        notificationType: "admin_tour_enquiry",
        recipientCategory: "admin",
        recipient: adminEmail,
        subject: `New tour enquiry ${ctx.bookingRef} — ${ctx.tourName}`,
        html: `<pre style="font:14px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;white-space:pre-wrap;">${lines
          .join("\n")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")}</pre>`,
        text: lines.join("\n"),
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("notifyTourEnquiryReceived failed", err);
  }
}

/** Sent when an admin sets the agreed price: tour confirmed, payment due. */
export async function notifyTourQuoted(ctx: {
  bookingId: string;
  bookingRef: string;
  customerName: string;
  email: string;
  tourName: string;
  pickupDate: string;
  pickupTime: string;
  passengers: number;
  price: number;
  adminNote?: string | null;
}): Promise<void> {
  try {
    const { tourQuoteConfirmedEmail } = await import("@/lib/email/tour.server");
    const manageUrl = manageBookingUrl(ctx.bookingRef);
    const tpl = tourQuoteConfirmedEmail({
      bookingRef: ctx.bookingRef,
      customerName: ctx.customerName,
      tourName: ctx.tourName,
      pickupDate: ctx.pickupDate,
      pickupTime: ctx.pickupTime,
      passengers: ctx.passengers,
      price: ctx.price,
      manageUrl,
      payUrl: manageUrl,
      adminNote: ctx.adminNote ?? null,
    });
    await sendAndLog({
      bookingId: ctx.bookingId,
      eventKey: `tour_quote_${ctx.bookingRef}_${ctx.price}`,
      notificationType: "customer_tour_quote",
      recipientCategory: "customer",
      recipient: ctx.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("notifyTourQuoted failed", err);
  }
}
