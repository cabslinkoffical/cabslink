/**
 * My Customers + offer-email automation (staff console), plus the public
 * "send me offers" consent call made after a website form succeeds.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { filterCustomers, campaignAudience, normEmail, type CampaignAudienceFilter } from "@/lib/my-customers";
import { nextRunAt, CAMPAIGN_FREQUENCIES } from "@/lib/campaign-schedule";
import { slicePage } from "@/lib/admin-paging";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden: admin access required");
}

const filterSchema = z.object({
  q: z.string().max(100).optional().default(""),
  consent: z.enum(["all", "subscribed", "unsubscribed", "no_consent"]).catch("all").default("all"),
  kind: z.enum(["all", "booked", "enquiry_only"]).catch("all").default("all"),
});

export const listMyCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => filterSchema.extend({
    page: z.number().int().min(1).max(100000).default(1),
    pageSize: z.number().int().min(1).max(100).default(25),
  }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { loadCustomers } = await import("@/lib/marketing.server");
    const everyone = await loadCustomers(context.supabase);
    const rows = filterCustomers(everyone, data);
    const summary = {
      total: everyone.length,
      subscribed: everyone.filter((c) => c.basis !== null).length,
      unsubscribed: everyone.filter((c) => c.consent === "unsubscribed").length,
      booked: everyone.filter((c) => c.bookings > 0).length,
    };
    return { ...slicePage(rows, data), summary };
  });

/** Full filtered list for CSV export. */
export const exportMyCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => filterSchema.parse(i ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { loadCustomers } = await import("@/lib/marketing.server");
    return filterCustomers(await loadCustomers(context.supabase), data);
  });

/** Staff can stop offer emails for someone (never opt them in — only the customer can). */
export const optOutCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ email: z.string().email().max(254) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const email = normEmail(data.email);
    const db = context.supabase;
    const now = new Date().toISOString();
    const { data: row } = await db.from("marketing_contacts").select("id").eq("email", email).maybeSingle();
    const r = row
      ? await db.from("marketing_contacts").update({ opted_in: false, unsubscribed_at: now }).eq("id", row.id)
      : await db.from("marketing_contacts").insert({ email, opted_in: false, unsubscribed_at: now, opt_in_source: "staff" });
    if (r.error) throw new Error(r.error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { suppress } = await import("@/lib/marketing.server");
    await suppress(supabaseAdmin, email, "manual");
    return { ok: true };
  });

// ---------------- Campaigns ----------------
const audienceFilterSchema = z.object({
  booked: z.enum(["any", "yes", "no"]).optional(),
  source: z.enum(["booking", "tour", "contact", "corporate", "custom_tour", "cancellation", "change_request"]).nullable().optional(),
  min_trips: z.number().int().min(0).max(1000).nullable().optional(),
  max_trips: z.number().int().min(0).max(1000).nullable().optional(),
  min_spend: z.number().min(0).max(1_000_000).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(10).optional(),
  emails: z.array(z.string().trim().email().max(254)).max(500).optional(),
});

const campaignSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  subject: z.string().trim().min(3).max(150),
  body: z.string().trim().min(10).max(8000),
  coupon_id: z.string().uuid().nullable().optional(),
  audience: z.enum(["all", "booked", "not_booked", "custom"]),
  audience_filter: audienceFilterSchema.nullable().optional(),
  frequency: z.enum(CAMPAIGN_FREQUENCIES),
  send_hour: z.number().int().min(0).max(23),
  weekday: z.number().int().min(0).max(6).nullable().optional(),
  month_day: z.number().int().min(1).max(28).nullable().optional(),
  starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status: z.enum(["draft", "active", "paused"]),
});

function scheduleOf(c: any) {
  return { frequency: c.frequency, sendHour: c.send_hour, weekday: c.weekday, monthDay: c.month_day, startsOn: c.starts_on };
}

export const listCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = context.supabase;
    const [camps, coupons] = await Promise.all([
      db.from("email_campaigns").select("*").order("created_at", { ascending: false }),
      db.from("coupons").select("id, code, discount_type, discount_value, expires_at, active").order("created_at", { ascending: false }),
    ]);
    if (camps.error) throw new Error(camps.error.message);
    const { loadCustomers } = await import("@/lib/marketing.server");
    const everyone = await loadCustomers(db);
    const audienceSizes = {
      all: campaignAudience(everyone, "all").length,
      booked: campaignAudience(everyone, "booked").length,
      not_booked: campaignAudience(everyone, "not_booked").length,
    };
    const campaigns = (camps.data ?? []).map((c: any) => ({
      ...c,
      audience_size: campaignAudience(everyone, c.audience, c.audience_filter as CampaignAudienceFilter | null).length,
    }));
    const allTags = [...new Set(everyone.flatMap((c) => c.tags))].sort();
    const [rules, settings] = await Promise.all([
      db.from("automation_rules").select("*").order("created_at", { ascending: false }),
      db.from("marketing_settings").select("paused, daily_cap, quiet_days").eq("id", true).maybeSingle(),
    ]);
    if (rules.error) throw new Error(rules.error.message);
    const { remainingToday } = await import("@/lib/marketing.server");
    const cfg = settings.data ?? { paused: false, daily_cap: 500, quiet_days: 7 };
    const leftToday = await remainingToday(db, cfg.daily_cap).catch(() => null);
    return { campaigns, coupons: coupons.data ?? [], audienceSizes, allTags, rules: rules.data ?? [], settings: cfg, leftToday };
  });

export const saveCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => campaignSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = context.supabase;
    const { id, ...fields } = data;
    const row: any = {
      ...fields,
      audience_filter: fields.audience === "custom" ? fields.audience_filter ?? {} : {},
      coupon_id: fields.coupon_id ?? null,
      weekday: ["weekly", "fortnightly"].includes(fields.frequency) ? fields.weekday ?? 1 : null,
      month_day: fields.frequency === "monthly" ? fields.month_day ?? 1 : null,
      starts_on: fields.starts_on ?? null,
    };
    if (fields.status === "active") {
      const next = nextRunAt(scheduleOf(row), new Date());
      if (!next) throw new Error("That schedule has no upcoming send time. Check the date and time.");
      row.next_run_at = next.toISOString();
      row.approved_by = context.userId;
      row.approved_at = new Date().toISOString();
    } else row.next_run_at = null;
    if (id) {
      const { error } = await db.from("email_campaigns").update(row).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: created, error } = await db.from("email_campaigns").insert({ ...row, created_by: context.userId }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: created.id as string };
  });

export const deleteCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("email_campaigns").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** The only address a test may go to: the admin notification email from private settings. */
async function adminTestAddress(): Promise<string> {
  const { getAdminNotificationEmail } = await import("@/lib/notifications.server");
  const to = await getAdminNotificationEmail();
  if (!to) throw new Error("No admin email is set. Add one in Settings first.");
  return to;
}

/** Send a preview of a campaign to the admin email only (not recorded, not queued). */
export const sendCampaignTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: c, error } = await context.supabase.from("email_campaigns").select("*").eq("id", data.id).maybeSingle();
    if (error || !c) throw new Error("Campaign not found");
    const { renderCampaign, sendBatch, loadCoupon } = await import("@/lib/marketing.server");
    const coupon = await loadCoupon(context.supabase, c.coupon_id);
    const m = renderCampaign(c, { name: "Test", token: "00000000-0000-0000-0000-000000000000" }, coupon);
    const to = await adminTestAddress();
    const [r] = await sendBatch([{ to, ...m, subject: `[Test] ${m.subject}` }]);
    if (!r.ok) throw new Error(r.error ?? "Send failed");
    return { ok: true, to };
  });

/** Send an active campaign's due run right now instead of waiting for its time. */
export const sendCampaignNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: c, error } = await context.supabase.from("email_campaigns").select("*").eq("id", data.id).maybeSingle();
    if (error || !c) throw new Error("Campaign not found");
    if (c.status === "completed") throw new Error("This campaign has finished.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendCampaignImmediately } = await import("@/lib/marketing.server");
    const runAt = c.next_run_at && new Date(c.next_run_at) <= new Date() ? c.next_run_at : new Date().toISOString();
    if (runAt !== c.next_run_at) await supabaseAdmin.from("email_campaigns").update({ next_run_at: runAt, status: "active" }).eq("id", c.id);
    return sendCampaignImmediately(supabaseAdmin, { ...c, next_run_at: runAt, status: "active" });
  });

export const listCampaignSends = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const [old, queued] = await Promise.all([
      context.supabase.from("email_campaign_sends")
        .select("id, email, status, error, run_key, created_at").eq("campaign_id", data.id).order("created_at", { ascending: false }).limit(200),
      context.supabase.from("email_queue")
        .select("id, email, status, skip_reason, last_error, run_key, created_at, sent_at").eq("campaign_id", data.id).order("created_at", { ascending: false }).limit(200),
    ]);
    if (old.error || queued.error) throw new Error((old.error ?? queued.error)!.message);
    const fromQueue = (queued.data ?? []).map((r: any) => ({
      id: r.id, email: r.email, run_key: r.run_key, created_at: r.sent_at ?? r.created_at,
      status: r.status === "pending" ? "queued" : r.status,
      error: r.status === "skipped" ? `Skipped: ${String(r.skip_reason ?? "").replace(/_/g, " ")}` : r.last_error,
    }));
    return [...fromQueue, ...(old.data ?? [])].sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 200);
  });

// ---------------- Settings and automatic rules ----------------
export const saveMarketingSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    paused: z.boolean(), daily_cap: z.number().int().min(1).max(10000), quiet_days: z.number().int().min(0).max(90),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("marketing_settings").upsert({ id: true, ...data, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ruleSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  trigger_type: z.enum(["after_trip", "lapsed", "enquiry_no_booking", "before_trip", "anniversary", "abandoned_quote", "after_cancellation", "custom"]),
  delay_days: z.number().int().min(0).max(730),
  audience_filter: z.object({
    event: z.enum(["completed_trip", "last_trip", "next_trip", "first_booking", "last_enquiry", "last_contact", "cancelled", "unfinished"]).optional(),
    booked: z.enum(["any", "yes", "no"]).optional(),
    min_trips: z.number().int().min(0).max(1000).nullable().optional(),
    max_trips: z.number().int().min(0).max(1000).nullable().optional(),
    min_spend: z.number().min(0).max(1_000_000).nullable().optional(),
    source: z.enum(["booking", "tour", "custom_tour", "contact", "corporate"]).nullable().optional(),
  }).nullable().optional(),
  subject: z.string().trim().min(3).max(150),
  body: z.string().trim().min(10).max(8000),
  coupon_id: z.string().uuid().nullable().optional(),
  active: z.boolean(),
});

export const saveAutomationRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ruleSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...row } = data;
    const db = context.supabase;
    const r = id
      ? await db.from("automation_rules").update({ ...row, coupon_id: row.coupon_id ?? null, audience_filter: row.trigger_type === "custom" ? row.audience_filter ?? {} : {} }).eq("id", id).select("id").single()
      : await db.from("automation_rules").insert({ ...row, coupon_id: row.coupon_id ?? null, audience_filter: row.trigger_type === "custom" ? row.audience_filter ?? {} : {}, created_by: context.userId }).select("id").single();
    if (r.error) throw new Error(r.error.message);
    return { id: r.data.id as string };
  });

export const deleteAutomationRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("automation_rules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Send a preview of an automatic rule's email to the admin email only. */
export const sendRuleTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: r, error } = await context.supabase.from("automation_rules").select("*").eq("id", data.id).maybeSingle();
    if (error || !r) throw new Error("Rule not found");
    const { renderCampaign, sendBatch, loadCoupon } = await import("@/lib/marketing.server");
    const m = renderCampaign(r, { name: "Test", token: "00000000-0000-0000-0000-000000000000" }, await loadCoupon(context.supabase, r.coupon_id));
    const to = await adminTestAddress();
    const [res] = await sendBatch([{ to, ...m, subject: `[Test] ${m.subject}` }]);
    if (!res.ok) throw new Error(res.error ?? "Send failed");
    return { ok: true, to };
  });

// ---------------- Public: "send me offers" tickbox ----------------
const optInSchema = z.object({
  email: z.string().trim().email().max(254),
  name: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  source: z.enum(["booking", "tour_booking", "hourly_booking", "custom_tour", "contact", "corporate", "tour_enquiry"]),
});

/**
 * Saves consent only when a form from this email was really submitted in
 * the last 30 minutes, so nobody can sign someone else up from outside.
 */
export const recordMarketingOptIn = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => optInSchema.parse(i))
  .handler(async ({ data }) => {
    const { getClientIp } = await import("@/lib/client-ip.server");
    const { hitRateLimit, LIMITS } = await import("@/lib/db-rate-limit.server");
    let ip = "unknown";
    try { ip = (await getClientIp()) ?? "unknown"; } catch { /* ignore */ }
    if (!(await hitRateLimit(LIMITS.marketingOptIn, ip))) return { ok: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = normEmail(data.email);
    const pattern = email.replace(/[\\%_]/g, (m) => `\\${m}`);
    const since = new Date(Date.now() - 30 * 60_000).toISOString();
    const checks = await Promise.all([
      supabaseAdmin.from("bookings").select("id", { count: "exact", head: true }).ilike("email", pattern).gte("created_at", since),
      supabaseAdmin.from("contact_messages").select("id", { count: "exact", head: true }).ilike("email", pattern).gte("created_at", since).neq("source", "driver"),
      supabaseAdmin.from("custom_tour_requests").select("id", { count: "exact", head: true }).ilike("email", pattern).gte("created_at", since),
    ]);
    if (!checks.some((r: any) => (r.count ?? 0) > 0)) return { ok: false };
    const { saveOptIn } = await import("@/lib/marketing.server");
    await saveOptIn(supabaseAdmin, { email, name: data.name || null, phone: data.phone || null, source: data.source });
    return { ok: true };
  });

/** Public unsubscribe from the link in every offer email. */
export const unsubscribeMarketing = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ token: z.string().max(64) }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { unsubscribeToken } = await import("@/lib/marketing.server");
    return { result: await unsubscribeToken(supabaseAdmin, data.token) };
  });

/** Trips plus campaign/rule rows for one month of the Email automation calendar. */
export const getEmailCalendar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = context.supabase;
    const { monthRange } = await import("@/lib/email-calendar");
    const { addDays } = await import("@/lib/uk-time");
    const { from, to } = monthRange(data.month);
    const [rules, camps] = await Promise.all([
      db.from("automation_rules").select("id, name, trigger_type, delay_days, active"),
      db.from("email_campaigns").select("id, name, status, frequency, send_hour, weekday, month_day, starts_on, last_run_at"),
    ]);
    if (rules.error) throw new Error(rules.error.message);
    if (camps.error) throw new Error(camps.error.message);
    const maxDelay = Math.min(365, Math.max(0, ...(rules.data ?? []).filter((r: any) => r.active && r.trigger_type === "after_trip").map((r: any) => r.delay_days)));
    const trips = await db.from("bookings")
      .select("id, booking_ref, pickup_date, pickup_time, customer_name, service_type, tour_name, status")
      .is("deleted_at", null).gte("pickup_date", addDays(from, -maxDelay)).lte("pickup_date", to)
      .order("pickup_date").order("pickup_time").limit(2000);
    if (trips.error) throw new Error(trips.error.message);
    return {
      from, to,
      trips: (trips.data ?? []).map((b: any) => ({
        id: b.id, ref: b.booking_ref, date: b.pickup_date, time: b.pickup_time, name: b.customer_name ?? "",
        kind: b.tour_name ? `Tour: ${b.tour_name}` : String(b.service_type ?? "").replace(/_/g, " "), status: b.status,
      })),
      rules: rules.data ?? [],
      campaigns: (camps.data ?? []).map((c: any) => ({ id: c.id, name: c.name, status: c.status, frequency: c.frequency, sendHour: c.send_hour, weekday: c.weekday, monthDay: c.month_day, startsOn: c.starts_on, lastRunAt: c.last_run_at })),
    };
  });
