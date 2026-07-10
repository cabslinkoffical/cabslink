// Server-only email templates. All customer-provided values are HTML-escaped
// before being interpolated. Templates return `{ subject, html, text }`.

import { SITE } from "@/lib/site";
import { statusLabel, paymentNextStepMessage, type BookingStatus, type PaymentMode } from "@/lib/booking-lifecycle";

function esc(v: unknown): string {
  if (v == null) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strip any characters that could inject additional headers into a subject line. */
export function safeSubject(v: string, max = 120): string {
  return v.replace(/[\r\n\t]+/g, " ").slice(0, max);
}

/** Normalise an email for sending — trim, lowercase, reject header-injection chars. */
export function normaliseEmail(input: string): string {
  const trimmed = String(input ?? "").trim().toLowerCase();
  if (!trimmed) throw new Error("Empty email");
  if (/[\r\n,;<>]/.test(trimmed)) throw new Error("Invalid email");
  if (trimmed.length > 254) throw new Error("Email too long");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) throw new Error("Invalid email format");
  return trimmed;
}

export type BookingEmailContext = {
  bookingRef: string;
  status: BookingStatus;
  paymentMode: PaymentMode;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupDate: string;
  pickupTime: string;
  vehicleType: string;
  passengers: number;
  luggage: number;
  flightNumber?: string | null;
  meetGreet: boolean;
  childSeat: boolean;
  returnJourney: boolean;
  distanceMiles?: number | null;
  price?: number | null;
  notes?: string | null;
  cancellationReason?: string | null;
  /** Full https URL to the customer confirmation page (unguessable token). */
  confirmationUrl?: string | null;
  /** Optional deep link to the admin booking detail (admin email only). */
  adminUrl?: string | null;
};

function money(n: number | null | undefined): string {
  if (n == null) return "—";
  return `£${Number(n).toFixed(2)}`;
}

function tableRow(label: string, value: string): string {
  return `<tr><td style="padding:6px 12px;color:#5a6478;font-size:12px;text-transform:uppercase;letter-spacing:.08em;">${esc(label)}</td><td style="padding:6px 12px;color:#0e182c;font-size:14px;font-weight:600;">${value || "—"}</td></tr>`;
}

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:24px 12px;background:#f3f1ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0e182c;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px -20px rgba(14,24,44,.25);">
    <tr><td style="padding:24px 28px;background:#0e182c;color:#dfaf26;font-weight:800;letter-spacing:.18em;font-size:14px;text-transform:uppercase;">${esc(SITE.name)}</td></tr>
    <tr><td style="padding:28px;">${bodyHtml}</td></tr>
    <tr><td style="padding:18px 28px;background:#f3f1ea;color:#5a6478;font-size:12px;line-height:1.5;">${esc(SITE.name)} · ${esc(SITE.address)}<br>${esc(SITE.phoneUK)} · ${esc(SITE.email)}</td></tr>
  </table>
</body></html>`;
}

function commonBookingRows(ctx: BookingEmailContext): string {
  const rows: string[] = [];
  rows.push(tableRow("Reference", esc(ctx.bookingRef)));
  rows.push(tableRow("Status", esc(statusLabel(ctx.status))));
  rows.push(tableRow("Pickup", esc(ctx.pickupAddress)));
  rows.push(tableRow("Destination", esc(ctx.dropoffAddress)));
  rows.push(tableRow("Date & time", `${esc(ctx.pickupDate)} · ${esc(ctx.pickupTime)}`));
  rows.push(tableRow("Vehicle", esc(ctx.vehicleType)));
  rows.push(tableRow("Passengers / Luggage", `${esc(ctx.passengers)} / ${esc(ctx.luggage)}`));
  if (ctx.distanceMiles != null) rows.push(tableRow("Estimated distance", `${Number(ctx.distanceMiles).toFixed(1)} mi`));
  if (ctx.flightNumber) rows.push(tableRow("Flight", esc(ctx.flightNumber)));
  const extras: string[] = [];
  if (ctx.meetGreet) extras.push("Meet &amp; greet");
  if (ctx.childSeat) extras.push("Child seat");
  if (ctx.returnJourney) extras.push("Return journey");
  if (extras.length) rows.push(tableRow("Extras", extras.join(" · ")));
  rows.push(tableRow("Estimated fare", esc(money(ctx.price))));
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(14,24,44,.1);border-radius:12px;overflow:hidden;">${rows.join("")}</table>`;
}

function textLines(ctx: BookingEmailContext, heading: string, intro: string, next: string): string {
  const lines: string[] = [heading, "", intro, "",
    `Reference: ${ctx.bookingRef}`,
    `Status: ${statusLabel(ctx.status)}`,
    `Pickup: ${ctx.pickupAddress}`,
    `Destination: ${ctx.dropoffAddress}`,
    `Date & time: ${ctx.pickupDate} · ${ctx.pickupTime}`,
    `Vehicle: ${ctx.vehicleType}`,
    `Passengers / Luggage: ${ctx.passengers} / ${ctx.luggage}`,
  ];
  if (ctx.distanceMiles != null) lines.push(`Estimated distance: ${Number(ctx.distanceMiles).toFixed(1)} mi`);
  if (ctx.flightNumber) lines.push(`Flight: ${ctx.flightNumber}`);
  lines.push(`Estimated fare: ${money(ctx.price)}`);
  if (ctx.confirmationUrl) lines.push("", `View your booking: ${ctx.confirmationUrl}`);
  lines.push("", next, "", `${SITE.name} — ${SITE.phoneUK} — ${SITE.email}`);
  return lines.join("\n");
}

// ---------------- Customer: booking received ----------------
export function customerReceivedEmail(ctx: BookingEmailContext) {
  const heading = ctx.status === "confirmed" ? "Booking confirmed" : "Booking request received";
  const intro = ctx.status === "confirmed"
    ? `Thank you ${esc(ctx.customerName)} — your booking is confirmed.`
    : `Thank you ${esc(ctx.customerName)} — we have received your booking request.`;
  const next = paymentNextStepMessage(ctx.paymentMode, ctx.status);
  const button = ctx.confirmationUrl
    ? `<p style="margin:24px 0 0;"><a href="${esc(ctx.confirmationUrl)}" style="display:inline-block;background:#dfaf26;color:#0e182c;padding:12px 22px;border-radius:8px;font-weight:700;text-decoration:none;">View booking</a></p>`
    : "";
  const html = shell(heading, `
    <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.2em;color:#dfaf26;font-weight:700;">${esc(heading)}</p>
    <h1 style="margin:0 0 12px;font-size:22px;">${intro}</h1>
    <p style="margin:0 0 20px;color:#5a6478;line-height:1.55;">${esc(next)}</p>
    ${commonBookingRows(ctx)}
    ${button}
    <p style="margin:24px 0 0;font-size:12px;color:#5a6478;">Reference this booking as <strong>${esc(ctx.bookingRef)}</strong> when contacting us.</p>
  `);
  return {
    subject: safeSubject(`${heading} — ${ctx.bookingRef}`),
    html,
    text: textLines(ctx, heading, `Hi ${ctx.customerName}, ${next}`, `Reference ${ctx.bookingRef} when contacting us.`),
  };
}

// ---------------- Admin: new booking ----------------
export function adminNewBookingEmail(ctx: BookingEmailContext) {
  const heading = "New booking received";
  const contactLine = `<p style="margin:0 0 20px;color:#5a6478;line-height:1.55;">${esc(ctx.customerName)} — ${esc(ctx.customerPhone)} · <a href="mailto:${esc(ctx.customerEmail)}" style="color:#0e182c;">${esc(ctx.customerEmail)}</a></p>`;
  const notesBlock = ctx.notes
    ? `<div style="margin-top:16px;padding:14px;background:#f3f1ea;border-radius:10px;font-size:13px;color:#0e182c;"><strong>Customer notes:</strong><br>${esc(ctx.notes)}</div>`
    : "";
  const adminLink = ctx.adminUrl
    ? `<p style="margin:20px 0 0;"><a href="${esc(ctx.adminUrl)}" style="display:inline-block;background:#0e182c;color:#dfaf26;padding:12px 22px;border-radius:8px;font-weight:700;text-decoration:none;">Open in dashboard</a></p>`
    : "";
  const html = shell(heading, `
    <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.2em;color:#dfaf26;font-weight:700;">${esc(heading)}</p>
    <h1 style="margin:0 0 12px;font-size:22px;">Booking ${esc(ctx.bookingRef)}</h1>
    ${contactLine}
    ${commonBookingRows(ctx)}
    ${notesBlock}
    ${adminLink}
  `);
  return {
    subject: safeSubject(`New booking ${ctx.bookingRef} — ${ctx.pickupDate}`),
    html,
    text: textLines(ctx, heading, `${ctx.customerName} · ${ctx.customerPhone} · ${ctx.customerEmail}`, ctx.adminUrl ? `Open: ${ctx.adminUrl}` : ""),
  };
}

// ---------------- Customer: status change ----------------
export function statusChangeEmail(ctx: BookingEmailContext) {
  const label = statusLabel(ctx.status);
  const messages: Partial<Record<BookingStatus, { intro: string; next: string }>> = {
    confirmed: {
      intro: `Great news ${esc(ctx.customerName)} — your booking is confirmed.`,
      next: "We will be in touch closer to your pickup time with driver details.",
    },
    assigned: {
      intro: `Your chauffeur has been assigned for booking ${esc(ctx.bookingRef)}.`,
      next: "You will receive driver contact details closer to your pickup time.",
    },
    driver_en_route: {
      intro: `Your driver is on the way for booking ${esc(ctx.bookingRef)}.`,
      next: "Please make your way to the pickup point.",
    },
    on_way: {
      intro: `Your driver is on the way for booking ${esc(ctx.bookingRef)}.`,
      next: "Please make your way to the pickup point.",
    },
    completed: {
      intro: `Journey complete — thank you for riding with ${esc(SITE.name)}.`,
      next: "We would love your feedback. Reply to this email any time.",
    },
    cancelled: {
      intro: `Your booking ${esc(ctx.bookingRef)} has been cancelled.`,
      next: ctx.cancellationReason ? `Reason provided: ${esc(ctx.cancellationReason)}` : "Please get in touch if you need to rebook.",
    },
    rejected: {
      intro: `We were unable to accept your booking ${esc(ctx.bookingRef)}.`,
      next: ctx.cancellationReason ? `Reason provided: ${esc(ctx.cancellationReason)}` : "Please get in touch and we will do our best to help.",
    },
  };
  const chosen = messages[ctx.status] ?? { intro: `Update for booking ${esc(ctx.bookingRef)}.`, next: `Current status: ${esc(label)}` };
  const html = shell(`Booking ${label}`, `
    <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.2em;color:#dfaf26;font-weight:700;">Booking update</p>
    <h1 style="margin:0 0 12px;font-size:22px;">${chosen.intro}</h1>
    <p style="margin:0 0 20px;color:#5a6478;line-height:1.55;">${chosen.next}</p>
    ${commonBookingRows(ctx)}
    ${ctx.confirmationUrl ? `<p style="margin:24px 0 0;"><a href="${esc(ctx.confirmationUrl)}" style="display:inline-block;background:#dfaf26;color:#0e182c;padding:12px 22px;border-radius:8px;font-weight:700;text-decoration:none;">View booking</a></p>` : ""}
  `);
  return {
    subject: safeSubject(`Booking ${label} — ${ctx.bookingRef}`),
    html,
    text: textLines(ctx, `Booking ${label}`, chosen.intro.replace(/<[^>]+>/g, ""), chosen.next.replace(/<[^>]+>/g, "")),
  };
}
