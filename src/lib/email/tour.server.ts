// Server-only email templates for the tour enquiry lifecycle.
// Every customer-supplied value is HTML-escaped before interpolation.

import { SITE } from "@/lib/site";
import { safeSubject } from "@/lib/email/templates.server";

export type TourEmailContext = {
  bookingRef: string;
  customerName: string;
  tourName: string;
  pickupDate: string | null;
  pickupTime: string;
  passengers: number;
  /** Agreed total in GBP. Only present on the confirmation email. */
  price?: number | null;
  /** Absolute URL of the Manage Booking page. */
  manageUrl: string;
  /** Absolute URL of the payment page, when the booking can be paid online. */
  payUrl?: string | null;
  adminNote?: string | null;
};

function esc(v: unknown): string {
  if (v == null) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(n: number): string {
  return `£${n.toFixed(2)}`;
}

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:24px 12px;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0e182c;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px -20px rgba(14,24,44,.25);">
    <tr><td style="padding:24px 28px;background:#0e182c;color:#deae25;font-weight:800;letter-spacing:.18em;font-size:14px;text-transform:uppercase;">${esc(SITE.name)}</td></tr>
    <tr><td style="padding:28px;">${bodyHtml}</td></tr>
    <tr><td style="padding:18px 28px;background:#ffffff;color:#0e182c;font-size:12px;line-height:1.5;">${esc(SITE.name)} · ${esc(SITE.phoneUK)} · ${esc(SITE.email)}</td></tr>
  </table>
</body></html>`;
}

function dateTimeLabel(ctx: TourEmailContext): string {
  return ctx.pickupDate ? `${esc(ctx.pickupDate)} at ${esc(ctx.pickupTime)}` : esc(ctx.pickupTime);
}

function factRows(ctx: TourEmailContext): string {
  const rows: Array<[string, string]> = [
    ["Reference", esc(ctx.bookingRef)],
    ["Tour", esc(ctx.tourName)],
    ["Start time", dateTimeLabel(ctx)],
    ["Passengers", esc(String(ctx.passengers))],
  ];
  if (ctx.price != null) rows.push(["Agreed total", money(Number(ctx.price))]);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(14,24,44,.1);border-radius:12px;overflow:hidden;">${rows
    .map(
      ([l, v]) =>
        `<tr><td style="padding:8px 12px;font-size:12px;text-transform:uppercase;letter-spacing:.08em;">${esc(l)}</td><td style="padding:8px 12px;font-size:14px;font-weight:700;">${v}</td></tr>`,
    )
    .join("")}</table>`;
}

function factLines(ctx: TourEmailContext): string[] {
  const out = [
    `Reference: ${ctx.bookingRef}`,
    `Tour: ${ctx.tourName}`,
    ctx.pickupDate ? `Date & time: ${ctx.pickupDate} at ${ctx.pickupTime}` : `Start time: ${ctx.pickupTime}`,
    `Passengers: ${ctx.passengers}`,
  ];
  if (ctx.price != null) out.push(`Agreed total: £${Number(ctx.price).toFixed(2)}`);
  return out;
}

/** Sent the moment a customer submits a tour enquiry. */
export function tourEnquiryReceivedEmail(ctx: TourEmailContext) {
  const heading = "Tour enquiry received";
  const html = shell(heading, `
    <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.2em;color:#deae25;font-weight:700;">Tour enquiry</p>
    <h1 style="margin:0 0 12px;font-size:22px;">Thank you, ${esc(ctx.customerName)}</h1>
    <p style="margin:0 0 20px;line-height:1.55;">We have your tour enquiry and your reference is <strong>${esc(ctx.bookingRef)}</strong>. Our tour desk will confirm availability and send you a fixed price shortly — no payment is needed yet.</p>
    ${factRows(ctx)}
    <p style="margin:22px 0 0;line-height:1.55;font-size:13px;">Track this enquiry any time at <a href="${esc(ctx.manageUrl)}" style="color:#0e182c;font-weight:700;">${esc(ctx.manageUrl)}</a> using your reference and last name.</p>
  `);
  return {
    subject: safeSubject(`${heading} — ${ctx.bookingRef}`),
    html,
    text: [
      `Thank you, ${ctx.customerName}`,
      "",
      "We have your tour enquiry. Our tour desk will confirm availability and send you a fixed price shortly.",
      "",
      ...factLines(ctx),
      "",
      `Track it: ${ctx.manageUrl}`,
      "",
      `${SITE.name} — ${SITE.phoneUK} — ${SITE.email}`,
    ].join("\n"),
  };
}

/** Sent when an admin adds the agreed price — the enquiry is now confirmed. */
export function tourQuoteConfirmedEmail(ctx: TourEmailContext) {
  const heading = "Your tour is confirmed";
  const html = shell(heading, `
    <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.2em;color:#deae25;font-weight:700;">Tour confirmed — payment due</p>
    <h1 style="margin:0 0 12px;font-size:22px;">Good news, ${esc(ctx.customerName)}</h1>
    <p style="margin:0 0 20px;line-height:1.55;">Your tour is confirmed for the date below. The agreed total is <strong>${ctx.price != null ? money(Number(ctx.price)) : "—"}</strong>. To secure your driver, please complete payment.</p>
    ${factRows(ctx)}
    ${ctx.adminNote ? `<p style="margin:18px 0 0;line-height:1.55;font-size:13px;white-space:pre-wrap;">${esc(ctx.adminNote)}</p>` : ""}
    ${ctx.payUrl ? `<p style="margin:22px 0 0;"><a href="${esc(ctx.payUrl)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#deae25;color:#0e182c;font-weight:800;text-decoration:none;">Pay now</a></p>` : ""}
    <p style="margin:22px 0 0;line-height:1.55;font-size:13px;">Prefer to pay another way, or need a change? Call <strong>${esc(SITE.phoneUK)}</strong> or manage your booking at <a href="${esc(ctx.manageUrl)}" style="color:#0e182c;font-weight:700;">${esc(ctx.manageUrl)}</a>.</p>
  `);
  return {
    subject: safeSubject(`Tour confirmed — ${ctx.bookingRef}`),
    html,
    text: [
      `Good news, ${ctx.customerName}`,
      "",
      "Your tour is confirmed. Please complete payment to secure your driver.",
      "",
      ...factLines(ctx),
      ...(ctx.adminNote ? ["", ctx.adminNote] : []),
      ...(ctx.payUrl ? ["", `Pay now: ${ctx.payUrl}`] : []),
      "",
      `Manage your booking: ${ctx.manageUrl}`,
      `${SITE.name} — ${SITE.phoneUK} — ${SITE.email}`,
    ].join("\n"),
  };
}
