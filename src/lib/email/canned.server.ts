// Server-only renderer for admin-sent pre-written customer emails.
// Body text is plain text authored by staff; it is escaped and converted
// into simple branded HTML paragraphs.

import { SITE } from "@/lib/site";
import { safeSubject } from "@/lib/email/templates.server";

function esc(v: unknown): string {
  if (v == null) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function cannedEmail(input: { subject: string; body: string; heading?: string | null }) {
  const paragraphs = input.body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;color:#0e182c;line-height:1.6;font-size:15px;">${esc(p).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");

  const heading = input.heading?.trim() || input.subject;

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f4f5f7;font-family:Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;">
        <tr><td style="background:#0e182c;padding:20px 28px;">
          <span style="color:#deae25;font-weight:800;letter-spacing:.14em;text-transform:uppercase;font-size:13px;">${esc(SITE.name)}</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 18px;font-size:20px;color:#0e182c;">${esc(heading)}</h1>
          ${paragraphs}
        </td></tr>
        <tr><td style="background:#0e182c;padding:18px 28px;color:#ffffff;font-size:12px;line-height:1.6;">
          ${esc(SITE.name)} · ${esc(SITE.phoneUK)} · <a href="mailto:${esc(SITE.email)}" style="color:#deae25;">${esc(SITE.email)}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return {
    subject: safeSubject(input.subject),
    html,
    text: `${input.body}\n\n${SITE.name} — ${SITE.phoneUK} — ${SITE.email}`,
  };
}
