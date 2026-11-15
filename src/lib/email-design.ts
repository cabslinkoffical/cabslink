/**
 * Branded design for every offer/automatic email (campaigns, rules, tests).
 * Browser-safe so the admin page can preview exactly what customers receive.
 */
import { SITE } from "@/lib/site";

export type CouponInfo = { code: string; offer: string; expires: string | null } | null;

export const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function fill(text: string, name: string | null, coupon: CouponInfo): string {
  return text
    .replace(/\{\{\s*name\s*\}\}/gi, name?.split(" ")[0] || "there")
    .replace(/\{\{\s*coupon_code\s*\}\}/gi, coupon?.code ?? "")
    .replace(/\{\{\s*coupon_offer\s*\}\}/gi, coupon?.offer ?? "")
    .replace(/\{\{\s*coupon_expiry\s*\}\}/gi, coupon?.expires ?? "");
}

export function unsubscribeUrl(token: string) {
  return `${SITE.url}/unsubscribe?token=${encodeURIComponent(token)}`;
}

const NAVY = "#0e182c", GOLD = "#dfaf26", INK = "#855b00", MUTED = "#536078", CREAM = "#faf9f6";
const FONT = "'Epilogue',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
const HEAD = "'Urbanist',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

export function renderCampaign(c: { subject: string; body: string }, to: { name: string | null; token: string }, coupon: CouponInfo) {
  const subject = fill(c.subject, to.name, coupon).replace(/[\r\n]+/g, " ").slice(0, 150);
  const body = fill(c.body, to.name, coupon);
  const blocks = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const preheader = (blocks.find((b) => !/^hi\b/i.test(b)) ?? blocks[0] ?? "").replace(/\s+/g, " ").slice(0, 120);
  const paras = blocks.map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${NAVY};">${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  const unsub = unsubscribeUrl(to.token);
  const logo = `${SITE.url}/icons/icon-192.png`;
  const tel = SITE.phoneUK.replace(/[^\d+]/g, "");
  const couponHtml = coupon ? `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;background:${NAVY};border-radius:14px;"><tr><td style="padding:22px;text-align:center;">
  <div style="font-family:${HEAD};font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:${GOLD};font-weight:700;">${esc(coupon.offer)}</div>
  <div style="margin:12px auto 0;display:inline-block;border:2px dashed ${GOLD};border-radius:10px;padding:10px 22px;font-family:${HEAD};font-size:28px;font-weight:800;letter-spacing:.14em;color:#ffffff;">${esc(coupon.code)}</div>
  ${coupon.expires ? `<div style="font-size:13px;color:#ffffffcc;margin-top:12px;">Valid until ${esc(coupon.expires)}. Enter the code when you book.</div>` : `<div style="font-size:13px;color:#ffffffcc;margin-top:12px;">Enter the code when you book.</div>`}
</td></tr></table>` : "";
  const point = (title: string, text: string) => `<td width="33%" valign="top" style="padding:0 6px;"><div style="font-family:${HEAD};font-weight:700;font-size:14px;color:${NAVY};">${title}</div><div style="font-size:13px;line-height:1.5;color:${MUTED};margin-top:4px;">${text}</div></td>`;
  const social = Object.entries(SITE.social).map(([k, u]) => `<a href="${esc(u)}" style="color:${INK};text-decoration:none;font-weight:600;">${({ tiktok: "TikTok", youtube: "YouTube" } as Record<string, string>)[k] ?? k[0].toUpperCase() + k.slice(1)}</a>`).join(" &nbsp;·&nbsp; ");

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${CREAM};font-family:${FONT};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid rgba(14,24,44,.08);">
<tr><td style="background:${NAVY};padding:22px 28px;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="padding-right:12px;"><img src="${logo}" width="40" height="40" alt="" style="display:block;border-radius:8px;"></td>
    <td style="font-family:${HEAD};color:${GOLD};font-weight:800;letter-spacing:.2em;font-size:15px;text-transform:uppercase;">${esc(SITE.name)}</td>
  </tr></table>
</td></tr>
<tr><td style="height:4px;background:${GOLD};line-height:4px;font-size:0;">&nbsp;</td></tr>
<tr><td style="padding:32px 28px 8px;">
  <h1 style="margin:0 0 20px;font-family:${HEAD};font-size:24px;line-height:1.3;color:${NAVY};font-weight:800;">${esc(subject)}</h1>
  ${paras}${couponHtml}
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 28px;"><tr><td style="background:${GOLD};border-radius:10px;">
    <a href="${esc(SITE.url)}" style="display:inline-block;padding:14px 28px;font-family:${HEAD};font-weight:800;font-size:15px;color:${NAVY};text-decoration:none;">Book your journey</a>
  </td></tr></table>
</td></tr>
<tr><td style="padding:20px 22px;background:${CREAM};border-top:1px solid rgba(14,24,44,.06);">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    ${point("Fixed price", "You see the price before you book.")}
    ${point("Across Scotland", "Airport transfers, day tours and hourly hire.")}
    ${point("Easy changes", "Manage your booking online.")}
  </tr></table>
</td></tr>
<tr><td style="padding:22px 28px;text-align:center;">
  <div style="font-size:14px;color:${NAVY};">Questions? Call or WhatsApp <a href="tel:${tel}" style="color:${INK};font-weight:700;text-decoration:none;">${esc(SITE.phoneUK)}</a></div>
  <div style="font-size:13px;margin-top:10px;">${social}</div>
</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;"><tr><td style="padding:18px 28px;text-align:center;color:${MUTED};font-size:12px;line-height:1.6;">
  You are getting this because you booked with us or asked for offers from ${esc(SITE.name)}.<br>
  ${esc(SITE.name)}, ${esc(SITE.address)}<br>
  <a href="${esc(unsub)}" style="color:${MUTED};text-decoration:underline;">Unsubscribe from offer emails</a>
</td></tr></table>
</td></tr></table></body></html>`;
  const text = `${subject}\n\n${body}\n\n${coupon ? `Your code (${coupon.offer}): ${coupon.code}${coupon.expires ? `, valid until ${coupon.expires}` : ""}\n\n` : ""}Book: ${SITE.url}\nCall or WhatsApp: ${SITE.phoneUK}\n\n${SITE.name}, ${SITE.address}\nUnsubscribe: ${unsub}`;
  return { subject, html, text, unsub };
}
