// Server-only: loads customers, renders and sends offer emails through
// Resend, and runs scheduled campaigns. Offer emails only ever go to
// customers who ticked "send me offers" and have not unsubscribed.
import { SITE } from "@/lib/site";
import { esc, renderCampaign, unsubscribeUrl, type CouponInfo } from "@/lib/email-design";
export { renderCampaign, unsubscribeUrl, type CouponInfo };
import { buildCustomers, campaignAudience, normEmail, type MyCustomer } from "@/lib/my-customers";
import { nextRunAt, type CampaignFrequency } from "@/lib/campaign-schedule";
import { quietOk, ruleTriggerKey, queueSkipReason, afterFailure, QUEUE_BATCH_SIZE, type TriggerType } from "@/lib/email-automation";
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
  const [bookings, payments, messages, customTours, cancellations, amendments, contacts, drivers, contactTags] = await Promise.all([
    all(db, "bookings", "id, customer_name, email, phone, price, pickup_date, status, service_type, created_at, updated_at", (q) => q.is("deleted_at", null)),
    all(db, "payments", "id, booking_id, amount, refunded_amount, status"),
    all(db, "contact_messages", "id, name, email, phone, subject, source, created_at"),
    all(db, "custom_tour_requests", "id, customer_name, email, phone, created_at"),
    all(db, "cancellation_requests", "id, customer_name, email, phone, created_at"),
    all(db, "booking_amendments", "id, customer_name, email, phone, created_at"),
    all(db, "marketing_contacts", "id, email, opted_in, opted_in_at, unsubscribed_at, suppressed_reason, last_marketing_at"),
    all(db, "drivers", "id, email"),
    all(db, "contact_tags", "contact_id, tag"),
  ]);
  return buildCustomers({ bookings, payments, messages, customTours, cancellations, amendments, contacts, drivers, contactTags });
}



export async function loadCoupon(db: Db, id: string | null): Promise<CouponInfo> {
  if (!id) return null;
  const { data } = await db.from("coupons").select("code, discount_type, discount_value, expires_at, active").eq("id", id).maybeSingle();
  if (!data || !data.active) return null;
  const v = Number(data.discount_value);
  const offer = data.discount_type === "percentage" ? `${v}% off` : `£${v.toFixed(2)} off`;
  return { code: data.code, offer, expires: data.expires_at ?? null };
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

/** Make sure every audience member has a consent row (for their id and unsubscribe token). */
async function contactRows(db: Db, emails: string[]): Promise<Map<string, { id: string; token: string }>> {
  const map = new Map<string, { id: string; token: string }>();
  for (let i = 0; i < emails.length; i += 500) {
    // Past bookers (soft opt-in) may have no consent row yet; add one so they get an unsubscribe link.
    const ins = await db.from("marketing_contacts").upsert(emails.slice(i, i + 500).map((email) => ({ email, opted_in: false, opt_in_source: "past_booking", source: "booking" })), { onConflict: "email", ignoreDuplicates: true });
    if (ins.error) throw new Error(ins.error.message);
  }
  for (let i = 0; i < emails.length; i += 500) {
    const { data, error } = await db.from("marketing_contacts").select("id, email, unsubscribe_token").in("email", emails.slice(i, i + 500));
    if (error) throw new Error(error.message);
    for (const r of data ?? []) map.set(normEmail(r.email), { id: r.id, token: r.unsubscribe_token });
  }
  return map;
}

export type MarketingSettings = { paused: boolean; daily_cap: number; quiet_days: number };
export async function loadSettings(db: Db): Promise<MarketingSettings> {
  const { data, error } = await db.from("marketing_settings").select("paused, daily_cap, quiet_days").eq("id", true).maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? { paused: false, daily_cap: 500, quiet_days: 7 };
}

/** How many more offer emails may go out today (UK day) under the daily cap. */
export async function remainingToday(db: Db, cap: number): Promise<number> {
  const since = ukDayStart(ukDate()).toISOString();
  const [a, b, c] = await Promise.all([
    db.from("email_campaign_sends").select("id", { count: "exact", head: true }).eq("status", "sent").gte("created_at", since),
    db.from("automation_sends").select("id", { count: "exact", head: true }).eq("status", "sent").gte("created_at", since),
    db.from("email_queue").select("id", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", since),
  ]);
  const err = a.error ?? b.error ?? c.error;
  if (err) throw new Error(err.message);
  return Math.max(0, cap - (a.count ?? 0) - (b.count ?? 0) - (c.count ?? 0));
}

/** Add queue rows; the unique keys mean a person is never queued twice for the same campaign run or rule event. */
async function enqueue(db: Db, rows: Array<{ contact_id: string; email: string; campaign_id?: string; rule_id?: string; run_key: string }>): Promise<number> {
  let added = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const onConflict = chunk[0].campaign_id ? "campaign_id,run_key,contact_id" : "rule_id,run_key,contact_id";
    const { data, error } = await db.from("email_queue").upsert(chunk, { onConflict, ignoreDuplicates: true }).select("id");
    if (error) throw new Error(error.message);
    added += data?.length ?? 0;
  }
  return added;
}

/** A "once" campaign has a single run, so re-scheduling it can never email anyone a second time. */
export function campaignRunKey(c: { frequency: string; next_run_at: string | null }) {
  return c.frequency === "once" ? "once" : String(c.next_run_at ?? new Date().toISOString());
}

/** Queue one campaign's current run and move it to its next date. */
export async function runCampaign(db: Db, campaign: any, customers?: MyCustomer[]): Promise<{ queued: number; skipped: number }> {
  const settings = await loadSettings(db);
  if (settings.paused) throw new Error("All offer emails are paused. Switch sending back on first.");
  const runKey = campaignRunKey(campaign);
  const people = campaignAudience(customers ?? (await loadCustomers(db)), campaign.audience, campaign.audience_filter);
  // Never resend to anyone the older sender already reached in this run.
  const legacy = await all(db, "email_campaign_sends", "id, email", (q) => q.eq("campaign_id", campaign.id).eq("run_key", String(campaign.next_run_at ?? "")));
  const done = new Set(legacy.map((r) => normEmail(r.email)));
  const pending = people.filter((p) => !done.has(p.email));
  const todo = pending.filter((p) => quietOk(p.lastMarketingAt, settings.quiet_days));
  const skipped = pending.length - todo.length;
  const ids = await contactRows(db, todo.map((p) => p.email));
  const queued = await enqueue(db, todo.filter((p) => ids.has(p.email)).map((p) => ({ contact_id: ids.get(p.email)!.id, email: p.email, campaign_id: campaign.id, run_key: runKey })));
  const now = new Date();
  const patch: any = { last_run_at: now.toISOString(), last_run_sent: queued };
  if (campaign.frequency === "once") { patch.status = "completed"; patch.next_run_at = null; }
  else {
    const next = nextRunAt({ frequency: campaign.frequency as CampaignFrequency, sendHour: campaign.send_hour, weekday: campaign.weekday, monthDay: campaign.month_day, startsOn: campaign.starts_on }, now, now);
    patch.next_run_at = next?.toISOString() ?? null;
    if (!next) patch.status = "completed";
  }
  await db.from("email_campaigns").update(patch).eq("id", campaign.id);
  return { queued, skipped };
}

/** Queue every switched-on automatic rule: each person gets each rule's email once per event. */
export async function runRules(db: Db, customers?: MyCustomer[]) {
  const settings = await loadSettings(db);
  if (settings.paused) return [];
  const { data: rules, error } = await db.from("automation_rules").select("*").eq("active", true);
  if (error) throw new Error(error.message);
  if (!rules?.length) return [];
  const everyone = customers ?? (await loadCustomers(db));
  const today = ukDate();
  const results: any[] = [];
  const queuedNow = new Set<string>();
  for (const rule of rules) {
    const quiet = Number(rule.quiet_days ?? settings.quiet_days);
    const due = everyone
      .map((c) => ({ c, key: ruleTriggerKey(c, { trigger_type: rule.trigger_type as TriggerType, delay_days: rule.delay_days, audience_filter: rule.audience_filter as any }, today) }))
      .filter((x): x is { c: MyCustomer; key: string } => !!x.key && quietOk(x.c.lastMarketingAt, quiet) && !queuedNow.has(x.c.email));
    if (!due.length) { results.push({ id: rule.id, queued: 0 }); continue; }
    const doneRows = await all(db, "automation_sends", "id, email, trigger_key", (q) => q.eq("rule_id", rule.id).in("email", due.map((d) => d.c.email).slice(0, 1000)));
    const done = new Set(doneRows.map((r) => `${normEmail(r.email)}|${r.trigger_key}`));
    const todo = due.filter((d) => !done.has(`${d.c.email}|${d.key}`));
    const ids = await contactRows(db, todo.map((d) => d.c.email));
    const queued = await enqueue(db, todo.filter((d) => ids.has(d.c.email)).map((d) => ({ contact_id: ids.get(d.c.email)!.id, email: d.c.email, rule_id: rule.id, run_key: d.key })));
    todo.forEach((d) => queuedNow.add(d.c.email));
    await db.from("automation_rules").update({ last_run_at: new Date().toISOString() }).eq("id", rule.id);
    results.push({ id: rule.id, queued });
  }
  return results;
}

/**
 * Send due queue rows in batches of 50 with a short pause, re-checking consent,
 * suppression and quiet days just before each send. Failures retry up to 3 times.
 */
export async function processQueue(db: Db, opts: { maxBatches?: number; onlyCampaignId?: string } = {}): Promise<{ sent: number; failed: number; skipped: number; retrying: number }> {
  const totals = { sent: 0, failed: 0, skipped: 0, retrying: 0 };
  const settings = await loadSettings(db);
  if (settings.paused) return totals;
  const started = Date.now();
  const sources = new Map<string, any>();
  const coupons = new Map<string, CouponInfo>();
  for (let batch = 0; batch < (opts.maxBatches ?? 20) && Date.now() - started < 25_000; batch++) {
    const allowance = await remainingToday(db, settings.daily_cap);
    if (allowance <= 0) break;
    const { data: claimed, error } = await db.rpc("claim_email_queue", { _limit: Math.min(QUEUE_BATCH_SIZE, allowance) });
    if (error) throw new Error(error.message);
    const rows: any[] = claimed ?? [];
    if (!rows.length) break;
    const emails = [...new Set(rows.map((r) => r.email))];
    const [{ data: contacts, error: ce }, { data: mcs, error: me }] = await Promise.all([
      db.from("contacts").select("email, name, marketing_consent, unsubscribed_at, suppression_reason").in("email", emails),
      db.from("marketing_contacts").select("id, email, unsubscribe_token, last_marketing_at").in("email", emails),
    ]);
    if (ce || me) throw new Error((ce ?? me).message);
    const contactBy = new Map<string, any>((contacts ?? []).map((c: any) => [c.email, c]));
    const mcBy = new Map<string, any>((mcs ?? []).map((c: any) => [c.email, c]));
    const ready: Array<{ row: any; msg: Outgoing }> = [];
    const emailedThisBatch = new Set<string>();
    for (const row of rows) {
      const key = row.campaign_id ? `c:${row.campaign_id}` : `r:${row.rule_id}`;
      if (!sources.has(key)) {
        const { data } = row.campaign_id
          ? await db.from("email_campaigns").select("id, subject, body, coupon_id, status").eq("id", row.campaign_id).maybeSingle()
          : await db.from("automation_rules").select("id, subject, body, coupon_id, active, quiet_days").eq("id", row.rule_id).maybeSingle();
        sources.set(key, data ?? null);
      }
      const src = sources.get(key);
      const mc = mcBy.get(row.email);
      const active = !!src && (row.campaign_id ? src.status !== "draft" && src.status !== "paused" : src.active);
      const quiet = row.rule_id ? Number(src?.quiet_days ?? settings.quiet_days) : settings.quiet_days;
      const reason = emailedThisBatch.has(row.email) ? "quiet_days"
        : !mc ? "not_a_customer"
        : queueSkipReason(contactBy.get(row.email) ?? null, { lastMarketingAt: mc.last_marketing_at, quietDays: quiet, sourceActive: active });
      if (reason) {
        await db.from("email_queue").update({ status: "skipped", skip_reason: reason, locked_at: null }).eq("id", row.id);
        totals.skipped++;
        continue;
      }
      if (!coupons.has(key)) coupons.set(key, await loadCoupon(db, src.coupon_id));
      const name = contactBy.get(row.email)?.name ?? null;
      emailedThisBatch.add(row.email);
      ready.push({ row, msg: { to: row.email, ...renderCampaign(src, { name, token: mc.unsubscribe_token }, coupons.get(key)!) } });
    }
    if (ready.length) {
      const results = await sendBatch(ready.map((r) => r.msg));
      const now = new Date();
      const okEmails: string[] = [];
      const bySource = new Map<string, number>();
      await Promise.all(ready.map(async ({ row }, k) => {
        const res = results[k];
        if (res.ok) {
          okEmails.push(row.email);
          const key = row.campaign_id ? `c:${row.campaign_id}` : `r:${row.rule_id}`;
          bySource.set(key, (bySource.get(key) ?? 0) + 1);
          totals.sent++;
          return db.from("email_queue").update({ status: "sent", sent_at: now.toISOString(), provider_message_id: res.id, last_error: null, locked_at: null }).eq("id", row.id);
        }
        const next = afterFailure(row.attempts, now);
        next.status === "failed" ? totals.failed++ : totals.retrying++;
        return db.from("email_queue").update({ status: next.status, next_attempt_at: next.nextAttemptAt ?? now.toISOString(), last_error: res.error?.slice(0, 500) ?? "Send failed", locked_at: null }).eq("id", row.id);
      }));
      await markEmailed(db, okEmails);
      for (const [key, n] of bySource) {
        const [kind, id] = key.split(":");
        const table = kind === "c" ? "email_campaigns" : "automation_rules";
        const { data } = await db.from(table).select("total_sent").eq("id", id).maybeSingle();
        await db.from(table).update({ total_sent: Number(data?.total_sent ?? 0) + n }).eq("id", id);
      }
    }
    if (rows.length < QUEUE_BATCH_SIZE) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return totals;
}


async function markEmailed(db: Db, emails: string[]) {
  const now = new Date().toISOString();
  for (let i = 0; i < emails.length; i += 500) {
    await db.from("marketing_contacts").update({ last_marketing_at: now }).in("email", emails.slice(i, i + 500));
  }
}

/** Every 15 minutes: queue due campaigns and automatic emails, then send what is due. */
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
  try { results.push(...(await runRules(db, customers))); }
  catch (e) { console.error("automation rules failed", e); }
  try { results.push({ queue: await processQueue(db) }); }
  catch (e) { console.error("email queue failed", e); }
  return results;
}

/** Queue a campaign now and send its first batches straight away (the rest go out every 15 minutes). */
export async function sendCampaignImmediately(db: Db, campaign: any) {
  const customers = await loadCustomers(db);
  const { queued, skipped } = await runCampaign(db, campaign, customers);
  const r = await processQueue(db, { maxBatches: 4 });
  const { count } = await db.from("email_queue").select("id", { count: "exact", head: true }).eq("campaign_id", campaign.id).eq("status", "pending");
  return { queued, sent: r.sent, failed: r.failed, skipped: skipped + r.skipped, remaining: count ?? 0 };
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
  const { data } = await db.from("marketing_contacts").select("id, email, unsubscribed_at").eq("unsubscribe_token", token).maybeSingle();
  if (!data) return "invalid";
  await suppress(db, data.email, "unsubscribed");
  if (data.unsubscribed_at) return "already";
  const { error } = await db.from("marketing_contacts").update({ opted_in: false, unsubscribed_at: new Date().toISOString() }).eq("id", data.id);
  if (error) throw new Error(error.message);
  await db.from("email_events").insert({ email: data.email, type: "unsubscribed", payload: { via: "link" } });
  return "done";
}

/** Put an address on the suppression list and cancel anything still waiting in the queue for it. */
export async function suppress(db: Db, email: string, reason: "unsubscribed" | "bounced" | "complained" | "manual") {
  const e = normEmail(email);
  const ins = await db.from("suppression_list").upsert({ email: e, reason }, { onConflict: "email", ignoreDuplicates: true });
  if (ins.error) throw new Error(ins.error.message);
  await db.from("email_queue").update({ status: "skipped", skip_reason: `suppressed_${reason}` }).eq("email", e).eq("status", "pending");
}
