// Server-only: loads customers, renders and sends offer emails through
// Resend, and runs scheduled campaigns. Offer emails only ever go to
// customers who ticked "send me offers" and have not unsubscribed.
import { SITE } from "@/lib/site";
import { buildCustomers, campaignAudience, normEmail, type MyCustomer } from "@/lib/my-customers";
import { nextRunAt, type CampaignFrequency } from "@/lib/campaign-schedule";
import { quietOk, ruleTriggerKey, type TriggerType } from "@/lib/email-automation";
import { ukDate, ukDayStart } from "@/lib/uk-time";

type Db = any;

async function all(db: Db, table: string, cols: string, extra?: (q: any) => any): Promise<any[]> {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    let q = db.from(table).select(cols).order("id").range(from, from + 999);
    if (extra) q = extra(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

/** Every customer (drivers excluded), with marketing consent attached. */
export async function loadCustomers(db: Db): Promise<MyCustomer[]> {
  const [bookings, payments, messages, customTours, cancellations, amendments, contacts, drivers] = await Promise.all([
    all(db, "bookings", "id, customer_name, email, phone, price, pickup_date, status, service_type, created_at", (q) => q.is("deleted_at", null)),
    all(db, "payments", "id, booking_id, amount, refunded_amount, status"),
    all(db, "contact_messages", "id, name, email, phone, subject, source, created_at"),
    all(db, "custom_tour_requests", "id, customer_name, email, phone, created_at"),
    all(db, "cancellation_requests", "id, customer_name, email, phone, created_at"),
    all(db, "booking_amendments", "id, customer_name, email, phone, created_at"),
    all(db, "marketing_contacts", "id, email, opted_in, opted_in_at, unsubscribed_at, suppressed_reason, last_marketing_at"),
    all(db, "drivers", "id, email"),
  ]);
  return buildCustomers({ bookings, payments, messages, customTours, cancellations, amendments, contacts, drivers });
}

const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export type CouponInfo = { code: string; offer: string; expires: string | null } | null;

export async function loadCoupon(db: Db, id: string | null): Promise<CouponInfo> {
  if (!id) return null;
  const { data } = await db.from("coupons").select("code, discount_type, discount_value, expires_at, active").eq("id", id).maybeSingle();
  if (!data || !data.active) return null;
  const v = Number(data.discount_value);
  const offer = data.discount_type === "percentage" ? `${v}% off` : `£${v.toFixed(2)} off`;
  return { code: data.code, offer, expires: data.expires_at ?? null };
}

function fill(text: string, name: string | null, coupon: CouponInfo): string {
  return text
    .replace(/\{\{\s*name\s*\}\}/gi, name?.split(" ")[0] || "there")
    .replace(/\{\{\s*coupon_code\s*\}\}/gi, coupon?.code ?? "")
    .replace(/\{\{\s*coupon_offer\s*\}\}/gi, coupon?.offer ?? "")
    .replace(/\{\{\s*coupon_expiry\s*\}\}/gi, coupon?.expires ?? "");
}

export function unsubscribeUrl(token: string) {
  return `${SITE.url}/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function renderCampaign(c: { subject: string; body: string }, to: { name: string | null; token: string }, coupon: CouponInfo) {
  const subject = fill(c.subject, to.name, coupon).replace(/[\r\n]+/g, " ").slice(0, 150);
  const body = fill(c.body, to.name, coupon);
  const paras = body.split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;line-height:1.6;color:#0e182c;">${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  const unsub = unsubscribeUrl(to.token);
  const couponHtml = coupon ? `<table role="presentation" width="100%" style="margin:8px 0 20px;border:2px dashed #dfaf26;border-radius:12px;"><tr><td style="padding:16px;text-align:center;">
    <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#855b00;font-weight:700;">Your code — ${esc(coupon.offer)}</div>
    <div style="font-size:26px;font-weight:800;letter-spacing:.12em;color:#0e182c;margin-top:6px;">${esc(coupon.code)}</div>
    ${coupon.expires ? `<div style="font-size:12px;color:#536078;margin-top:6px;">Valid until ${esc(coupon.expires)}</div>` : ""}</td></tr></table>` : "";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:24px 12px;background:#ffffff;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" style="max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(14,24,44,.1);">
<tr><td style="padding:22px 28px;background:#0e182c;color:#dfaf26;font-weight:800;letter-spacing:.18em;font-size:14px;text-transform:uppercase;">${esc(SITE.name)}</td></tr>
<tr><td style="padding:28px;">${paras}${couponHtml}
<p style="margin:8px 0 0;"><a href="${esc(SITE.url)}" style="display:inline-block;background:#dfaf26;color:#0e182c;padding:12px 22px;border-radius:8px;font-weight:700;text-decoration:none;">Book your journey</a></p></td></tr>
<tr><td style="padding:18px 28px;color:#536078;font-size:12px;line-height:1.6;">You're receiving this because you asked ${esc(SITE.name)} to send you offers.<br>
${esc(SITE.name)} · ${esc(SITE.address)} · ${esc(SITE.phoneUK)}<br>
<a href="${esc(unsub)}" style="color:#536078;">Unsubscribe from offer emails</a></td></tr></table></body></html>`;
  const text = `${body}\n\n${coupon ? `Your code (${coupon.offer}): ${coupon.code}${coupon.expires ? ` — valid until ${coupon.expires}` : ""}\n\n` : ""}Book: ${SITE.url}\n\n${SITE.name} · ${SITE.address} · ${SITE.phoneUK}\nUnsubscribe: ${unsub}`;
  return { subject, html, text, unsub };
}

function sender() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const resendKey = process.env["RESEND_API_KEY"];
  const address = process.env["MARKETING_FROM_ADDRESS"] || process.env["EMAIL_FROM_ADDRESS"];
  const name = process.env["MARKETING_FROM_NAME"] || process.env["EMAIL_FROM_NAME"] || SITE.name;
  if (!lovableKey || !resendKey || !address) throw new Error("Email sending is not configured (Resend sender address missing).");
  return { lovableKey, resendKey, from: `${name} <${address}>` };
}

type Outgoing = { to: string; subject: string; html: string; text: string; unsub: string };

/** Send up to 100 emails in one Resend batch call; returns one result per email in order. */
export async function sendBatch(items: Outgoing[]): Promise<Array<{ ok: boolean; id: string | null; error: string | null }>> {
  if (!items.length) return [];
  const s = sender();
  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.lovableKey}`, "X-Connection-Api-Key": s.resendKey },
    body: JSON.stringify(items.map((m) => ({
      from: s.from, to: [m.to], subject: m.subject, html: m.html, text: m.text,
      headers: { "List-Unsubscribe": `<${m.unsub.replace("/unsubscribe?", "/api/public/unsubscribe?")}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    }))),
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 400);
    console.error(`campaign batch failed [${res.status}]: ${body}`);
    return items.map(() => ({ ok: false, id: null, error: `Resend ${res.status}: ${body}` }));
  }
  const json: any = await res.json().catch(() => ({}));
  const ids: any[] = Array.isArray(json?.data) ? json.data : [];
  return items.map((_, i) => ({ ok: true, id: typeof ids[i]?.id === "string" ? ids[i].id : null, error: null }));
}

/** Make sure every audience member has a consent row (for their unsubscribe token). */
async function tokensFor(db: Db, emails: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (let i = 0; i < emails.length; i += 500) {
    // Past bookers (soft opt-in) may have no consent row yet; add one so they get an unsubscribe link.
    const ins = await db.from("marketing_contacts").upsert(emails.slice(i, i + 500).map((email) => ({ email, opted_in: false, opt_in_source: "past_booking" })), { onConflict: "email", ignoreDuplicates: true });
    if (ins.error) throw new Error(ins.error.message);
  }
  for (let i = 0; i < emails.length; i += 500) {
    const { data, error } = await db.from("marketing_contacts").select("email, unsubscribe_token").in("email", emails.slice(i, i + 500));
    if (error) throw new Error(error.message);
    for (const r of data ?? []) map.set(normEmail(r.email), r.unsubscribe_token);
  }
  return map;
}

const MAX_PER_RUN = 400;

export type MarketingSettings = { paused: boolean; daily_cap: number; quiet_days: number };
export async function loadSettings(db: Db): Promise<MarketingSettings> {
  const { data, error } = await db.from("marketing_settings").select("paused, daily_cap, quiet_days").eq("id", true).maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? { paused: false, daily_cap: 500, quiet_days: 7 };
}

/** How many more offer emails may go out today (UK day) under the daily cap. */
export async function remainingToday(db: Db, cap: number): Promise<number> {
  const since = ukDayStart(ukDate()).toISOString();
  const [a, b] = await Promise.all([
    db.from("email_campaign_sends").select("id", { count: "exact", head: true }).eq("status", "sent").gte("created_at", since),
    db.from("automation_sends").select("id", { count: "exact", head: true }).eq("status", "sent").gte("created_at", since),
  ]);
  if (a.error || b.error) throw new Error((a.error ?? b.error).message);
  return Math.max(0, cap - (a.count ?? 0) - (b.count ?? 0));
}

async function markEmailed(db: Db, emails: string[]) {
  const now = new Date().toISOString();
  for (let i = 0; i < emails.length; i += 500) {
    await db.from("marketing_contacts").update({ last_marketing_at: now }).in("email", emails.slice(i, i + 500));
  }
}

/** Send one campaign's current run. Returns how many went out now and whether recipients remain. */
export async function runCampaign(db: Db, campaign: any, customers?: MyCustomer[]): Promise<{ sent: number; failed: number; remaining: number; skipped: number }> {
  const settings = await loadSettings(db);
  if (settings.paused) throw new Error("All offer emails are paused. Switch sending back on first.");
  const runKey = String(campaign.next_run_at ?? new Date().toISOString());
  const people = campaignAudience(customers ?? (await loadCustomers(db)), campaign.audience);
  const doneRows = await all(db, "email_campaign_sends", "id, email", (q) => q.eq("campaign_id", campaign.id).eq("run_key", runKey));
  const done = new Set(doneRows.map((r) => normEmail(r.email)));
  const pending = people.filter((p) => !done.has(p.email));
  // Quiet days: people emailed recently are skipped for this run (not queued for later).
  const todo = pending.filter((p) => quietOk(p.lastMarketingAt, settings.quiet_days));
  const skipped = pending.length - todo.length;
  const allowance = await remainingToday(db, settings.daily_cap);
  const slice = todo.slice(0, Math.min(MAX_PER_RUN, allowance));
  const tokens = await tokensFor(db, slice.map((p) => p.email));
  const coupon = await loadCoupon(db, campaign.coupon_id);
  let sent = 0, failed = 0;
  for (let i = 0; i < slice.length; i += 100) {
    const chunk = slice.slice(i, i + 100).filter((p) => tokens.has(p.email));
    // Claim first so an overlapping run can never email the same person twice.
    const claim = await db.from("email_campaign_sends")
      .upsert(chunk.map((p) => ({ campaign_id: campaign.id, run_key: runKey, email: p.email, status: "sending" })), { onConflict: "campaign_id,run_key,email", ignoreDuplicates: true })
      .select("id, email");
    if (claim.error) throw new Error(claim.error.message);
    const claimed = new Map<string, string>((claim.data ?? []).map((r: any) => [normEmail(r.email), r.id]));
    const mine = chunk.filter((p) => claimed.has(p.email));
    const out = mine.map((p) => ({ to: p.email, ...renderCampaign(campaign, { name: p.name, token: tokens.get(p.email)! }, coupon) }));
    const results = await sendBatch(out);
    await Promise.all(mine.map((p, k) => db.from("email_campaign_sends").update({
      status: results[k].ok ? "sent" : "failed", provider_message_id: results[k].id, error: results[k].error,
    }).eq("id", claimed.get(p.email))));
    for (const r of results) r.ok ? sent++ : failed++;
    await markEmailed(db, mine.filter((_, k) => results[k].ok).map((p) => p.email));
    if (i + 100 < slice.length) await new Promise((r) => setTimeout(r, 600));
  }
  const remaining = Math.max(0, todo.length - slice.length);
  const now = new Date();
  const patch: any = { total_sent: Number(campaign.total_sent ?? 0) + sent };
  if (remaining === 0) {
    const runSent = (doneRows.length) + sent;
    patch.last_run_at = now.toISOString();
    patch.last_run_sent = runSent;
    if (campaign.frequency === "once") { patch.status = "completed"; patch.next_run_at = null; }
    else {
      const next = nextRunAt({ frequency: campaign.frequency as CampaignFrequency, sendHour: campaign.send_hour, weekday: campaign.weekday, monthDay: campaign.month_day, startsOn: campaign.starts_on }, now, now);
      patch.next_run_at = next?.toISOString() ?? null;
      if (!next) patch.status = "completed";
    }
  }
  await db.from("email_campaigns").update(patch).eq("id", campaign.id);
  return { sent, failed, remaining, skipped };
}

/** Run every switched-on automatic rule once: each person gets each rule's email once per event. */
export async function runRules(db: Db, customers?: MyCustomer[]) {
  const settings = await loadSettings(db);
  if (settings.paused) return [];
  const { data: rules, error } = await db.from("automation_rules").select("*").eq("active", true);
  if (error) throw new Error(error.message);
  if (!rules?.length) return [];
  const everyone = customers ?? (await loadCustomers(db));
  const today = ukDate();
  const results: any[] = [];
  const emailedNow = new Set<string>();
  for (const rule of rules) {
    let allowance = await remainingToday(db, settings.daily_cap);
    if (allowance <= 0) break;
    const due = everyone
      .map((c) => ({ c, key: ruleTriggerKey(c, { trigger_type: rule.trigger_type as TriggerType, delay_days: rule.delay_days }, today) }))
      .filter((x): x is { c: MyCustomer; key: string } => !!x.key && quietOk(x.c.lastMarketingAt, settings.quiet_days) && !emailedNow.has(x.c.email));
    if (!due.length) { results.push({ id: rule.id, sent: 0 }); continue; }
    const doneRows = await all(db, "automation_sends", "id, email, trigger_key", (q) => q.eq("rule_id", rule.id).in("email", due.map((d) => d.c.email).slice(0, 1000)));
    const done = new Set(doneRows.map((r) => `${normEmail(r.email)}|${r.trigger_key}`));
    const todo = due.filter((d) => !done.has(`${d.c.email}|${d.key}`)).slice(0, Math.min(MAX_PER_RUN, allowance));
    const tokens = await tokensFor(db, todo.map((d) => d.c.email));
    const coupon = await loadCoupon(db, rule.coupon_id);
    let sent = 0;
    for (let i = 0; i < todo.length; i += 100) {
      const chunk = todo.slice(i, i + 100).filter((d) => tokens.has(d.c.email));
      const claim = await db.from("automation_sends")
        .upsert(chunk.map((d) => ({ rule_id: rule.id, email: d.c.email, trigger_key: d.key, status: "sending" })), { onConflict: "rule_id,email,trigger_key", ignoreDuplicates: true })
        .select("id, email");
      if (claim.error) throw new Error(claim.error.message);
      const claimed = new Map<string, string>((claim.data ?? []).map((r: any) => [normEmail(r.email), r.id]));
      const mine = chunk.filter((d) => claimed.has(d.c.email));
      const res = await sendBatch(mine.map((d) => ({ to: d.c.email, ...renderCampaign(rule, { name: d.c.name, token: tokens.get(d.c.email)! }, coupon) })));
      await Promise.all(mine.map((d, k) => db.from("automation_sends").update({ status: res[k].ok ? "sent" : "failed", provider_message_id: res[k].id, error: res[k].error }).eq("id", claimed.get(d.c.email))));
      const ok = mine.filter((_, k) => res[k].ok).map((d) => d.c.email);
      ok.forEach((e) => emailedNow.add(e));
      await markEmailed(db, ok);
      sent += ok.length;
      allowance -= ok.length;
    }
    await db.from("automation_rules").update({ total_sent: Number(rule.total_sent ?? 0) + sent, last_run_at: new Date().toISOString() }).eq("id", rule.id);
    results.push({ id: rule.id, sent });
  }
  return results;
}

/** Run every active campaign whose time has come. */
export async function runDueCampaigns(db: Db) {
  if ((await loadSettings(db)).paused) return [];
  const { data, error } = await db.from("email_campaigns").select("*").eq("status", "active").lte("next_run_at", new Date().toISOString()).order("next_run_at");
  if (error) throw new Error(error.message);
  const customers = await loadCustomers(db);
  const results: any[] = [];
  for (const c of data ?? []) {
    try { results.push({ id: c.id, ...(await runCampaign(db, c, customers)) }); }
    catch (e) { console.error("campaign run failed", c.id, e); results.push({ id: c.id, error: String(e) }); }
  }
  try { results.push(...(await runRules(db, await loadCustomers(db)))); }
  catch (e) { console.error("automation rules failed", e); }
  return results;
}

/** Record that someone ticked "send me offers". */
export async function saveOptIn(db: Db, p: { email: string; name?: string | null; phone?: string | null; source: string }) {
  const email = normEmail(p.email);
  const now = new Date().toISOString();
  const { data: existing } = await db.from("marketing_contacts").select("id").eq("email", email).maybeSingle();
  const row = { name: p.name || null, phone: p.phone || null, opted_in: true, opted_in_at: now, opt_in_source: p.source, unsubscribed_at: null };
  const r = existing
    ? await db.from("marketing_contacts").update(row).eq("id", existing.id)
    : await db.from("marketing_contacts").insert({ email, ...row });
  if (r.error) throw new Error(r.error.message);
}

export async function unsubscribeToken(db: Db, token: string): Promise<"done" | "already" | "invalid"> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return "invalid";
  const { data } = await db.from("marketing_contacts").select("id, unsubscribed_at").eq("unsubscribe_token", token).maybeSingle();
  if (!data) return "invalid";
  if (data.unsubscribed_at) return "already";
  const { error } = await db.from("marketing_contacts").update({ opted_in: false, unsubscribed_at: new Date().toISOString() }).eq("id", data.id);
  if (error) throw new Error(error.message);
  return "done";
}
