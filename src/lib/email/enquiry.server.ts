// Server-only templates for non-booking enquiries (contact form, corporate
// account requests, driver/partner applications, tour enquiries).
// All customer-supplied values are HTML-escaped before interpolation.

import { SITE } from "@/lib/site";
import { safeSubject } from "@/lib/email/templates.server";

export type EnquiryKind = "contact" | "corporate" | "driver" | "tour";

export type EnquiryContext = {
  kind: EnquiryKind;
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  /** Extra labelled rows (company, fleet size, tour name, …). */
  extra?: Array<{ label: string; value: string }>;
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

const KIND_LABEL: Record<EnquiryKind, string> = {
  contact: "Website enquiry",
  corporate: "Corporate account enquiry",
  driver: "Driver / partner application",
  tour: "Tour enquiry",
};

const CUSTOMER_INTRO: Record<EnquiryKind, string> = {
  contact: "Thanks for getting in touch — we have your message and a member of the team will reply shortly.",
  corporate: "Thanks for your interest in a Cabslink corporate account. Our team will review your requirements and come back with account options.",
  driver: "Thanks for applying to drive with Cabslink. Our operations team reviews every application and will be in touch about next steps.",
  tour: "Thanks for your tour enquiry. We will confirm availability and send you a tailored itinerary and quote.",
};

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

function row(label: string, value: string): string {
  return `<tr><td style="padding:6px 12px;color:#0e182c;font-size:12px;text-transform:uppercase;letter-spacing:.08em;">${esc(label)}</td><td style="padding:6px 12px;color:#0e182c;font-size:14px;font-weight:600;">${value || "—"}</td></tr>`;
}

function rows(ctx: EnquiryContext): string {
  const out: string[] = [
    row("Name", esc(ctx.name)),
    row("Email", `<a href="mailto:${esc(ctx.email)}" style="color:#0e182c;">${esc(ctx.email)}</a>`),
  ];
  if (ctx.phone) out.push(row("Phone", esc(ctx.phone)));
  if (ctx.subject) out.push(row("Subject", esc(ctx.subject)));
  for (const e of ctx.extra ?? []) out.push(row(e.label, esc(e.value)));
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(14,24,44,.1);border-radius:12px;overflow:hidden;">${out.join("")}</table>`;
}

function plainRows(ctx: EnquiryContext): string[] {
  const out = [`Name: ${ctx.name}`, `Email: ${ctx.email}`];
  if (ctx.phone) out.push(`Phone: ${ctx.phone}`);
  if (ctx.subject) out.push(`Subject: ${ctx.subject}`);
  for (const e of ctx.extra ?? []) out.push(`${e.label}: ${e.value}`);
  return out;
}

/** Internal alert sent to the Cabslink team. */
export function adminEnquiryEmail(ctx: EnquiryContext) {
  const heading = KIND_LABEL[ctx.kind];
  const html = shell(heading, `
    <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.2em;color:#deae25;font-weight:700;">${esc(heading)}</p>
    <h1 style="margin:0 0 16px;font-size:22px;">${esc(ctx.name)}</h1>
    ${rows(ctx)}
    <div style="margin-top:16px;padding:14px;background:#ffffff;border:1px solid rgba(14,24,44,.1);border-radius:10px;font-size:13px;line-height:1.55;color:#0e182c;white-space:pre-wrap;">${esc(ctx.message)}</div>
  `);
  return {
    subject: safeSubject(`${heading} — ${ctx.name}`),
    html,
    text: [heading, "", ...plainRows(ctx), "", ctx.message].join("\n"),
  };
}

/** Acknowledgement sent to the person who submitted the form. */
export function customerEnquiryAckEmail(ctx: EnquiryContext) {
  const heading = "We've received your message";
  const intro = CUSTOMER_INTRO[ctx.kind];
  const html = shell(heading, `
    <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.2em;color:#deae25;font-weight:700;">${esc(KIND_LABEL[ctx.kind])}</p>
    <h1 style="margin:0 0 12px;font-size:22px;">Thank you, ${esc(ctx.name)}</h1>
    <p style="margin:0 0 20px;line-height:1.55;">${esc(intro)}</p>
    <p style="margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#0e182c;">Your message</p>
    <div style="padding:14px;background:#ffffff;border:1px solid rgba(14,24,44,.1);border-radius:10px;font-size:13px;line-height:1.55;white-space:pre-wrap;">${esc(ctx.message)}</div>
    <p style="margin:24px 0 0;font-size:13px;line-height:1.55;">Need us sooner? Call <strong>${esc(SITE.phoneUK)}</strong> or reply to this email.</p>
  `);
  return {
    subject: safeSubject(`${heading} — ${SITE.name}`),
    html,
    text: [`Thank you, ${ctx.name}`, "", intro, "", "Your message:", ctx.message, "", `${SITE.name} — ${SITE.phoneUK} — ${SITE.email}`].join("\n"),
  };
}
