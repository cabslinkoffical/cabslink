/**
 * Custom tour requests: a customer-built day that the tour team prices by
 * hand (CL-CT references). The public side can submit a request and look up
 * its status with reference + email; the staff console lists, updates and
 * annotates requests. Server-only helpers are loaded inside handlers so this
 * module stays safe to import from routes.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { placeIdSchema } from "@/lib/place-id";
import { flightNumberError } from "@/lib/flight-number";
import { FACT_TEXT } from "@/lib/site-facts";
import { ukDate } from "@/lib/uk-time";
import { pageInputSchema, runPaged, ilikeAny } from "@/lib/admin-paging";
import {
  CUSTOM_TOUR_STATUSES,
  CUSTOM_TOUR_STATUS_LABEL,
  CUSTOM_TOUR_STATUS_CUSTOMER,
  PRICE_VISIBLE_STATUSES,
  customTourLookupSchema,
  type CustomTourStatus,
} from "@/lib/custom-tour-requests";

const PUBLIC_SITE_URL = "https://cabslink.com";
const statusUrl = (ref: string) => `${PUBLIC_SITE_URL}/custom-tour-status?ref=${encodeURIComponent(ref)}`;

const requestStop = z.object({
  poiId: z.string().uuid().nullable().optional(),
  placeId: placeIdSchema,
  name: z.string().trim().min(1).max(160),
  dwellMinutes: z.coerce.number().min(0).max(600).nullable().optional(),
  locked: z.boolean().optional(),
});

const requestSchema = z.object({
  startPlaceId: placeIdSchema,
  startLabel: z.string().trim().min(1).max(240),
  endPlaceId: placeIdSchema.nullable().optional(),
  endLabel: z.string().trim().max(240).nullable().optional(),
  hours: z.coerce.number().min(1).max(24),
  vehicleClassId: z.string().uuid().nullable().optional(),
  passengers: z.coerce.number().int().min(1).max(80),
  luggage: z.coerce.number().int().min(0).max(80),
  stops: z.array(requestStop).min(1, "Add at least one place to visit.").max(15),
  originalStops: z.array(requestStop).max(15).nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a tour date."),
  time: z.string().regex(/^\d{1,2}:\d{2}$/, "Choose a start time."),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(30),
  flight: z.string().trim().max(40).nullable().optional(),
  notes: z.string().trim().max(1500).nullable().optional(),
  website: z.string().trim().max(500).optional().default(""),
  captchaToken: z.string().trim().max(4096).optional().nullable(),
}).refine((v) => !flightNumberError(v.startLabel, v.flight), {
  message: FACT_TEXT.flightNumberRequired,
  path: ["flight"],
});

export type CustomTourRequestInput = z.input<typeof requestSchema>;
export type CustomTourRequestCreated = { reference: string };

type StoredStop = { name: string; placeId: string; poiId: string | null; dwellMinutes: number | null; locked: boolean };
const toStored = (s: z.infer<typeof requestStop>): StoredStop => ({
  name: s.name, placeId: s.placeId, poiId: s.poiId ?? null, dwellMinutes: s.dwellMinutes ?? null, locked: !!s.locked,
});

/** Pure handler — callable from tests with an injected IP. */
export async function createCustomTourRequestImpl(
  data: z.infer<typeof requestSchema>,
  opts: { ip?: string; skipChecks?: boolean } = {},
): Promise<CustomTourRequestCreated> {
  if (data.website && data.website.trim() !== "") return { reference: "" };
  if (data.date < ukDate()) throw new Error("Choose a tour date from today onwards.");

  const ip = opts.ip ?? "unknown";
  if (!opts.skipChecks) {
    const { enforceRateLimit, LIMITS } = await import("@/lib/db-rate-limit.server");
    await enforceRateLimit(LIMITS.customTourRequest, ip, "You've sent several tour requests already. Please try again shortly or call us.");
    const { assertCaptcha } = await import("@/lib/captcha.server");
    const { setResponseStatus } = await import("@tanstack/react-start/server");
    await assertCaptcha(data.captchaToken, ip, setResponseStatus);
  }

  const { loadTourConfig, quoteTourImpl, measureLoop } = await import("@/lib/tour-quote.server");
  const config = await loadTourConfig();
  const vehicle = data.vehicleClassId ? config.classes.find((c) => c.id === data.vehicleClassId) ?? null : null;
  const stops = data.stops.map(toStored);
  const minStop = config.rules.minimum_stop_minutes;
  let dwell = stops.reduce((sum, s) => sum + Math.max(minStop, Number(s.dwellMinutes ?? minStop)), 0);

  // Best-effort estimate: a reliable instant price is kept for the team, but a
  // failure never blocks the request — that is exactly when people ask us.
  let estimatedTotal: number | null = null;
  let snapshot: unknown = null;
  let priceNote: string | null = null;
  let routeMiles: number | null = null;
  let driveMinutes: number | null = null;
  if (vehicle) {
    try {
      const res = await quoteTourImpl({
        mode: "custom",
        startPlaceId: data.startPlaceId,
        startLabel: data.startLabel,
        endPlaceId: data.endPlaceId ?? null,
        endLabel: data.endLabel ?? null,
        hours: data.hours,
        vehicleClassId: vehicle.id,
        passengers: data.passengers,
        luggage: data.luggage,
        stops: data.stops,
      });
      routeMiles = res.quote.routeMiles;
      driveMinutes = Math.round(res.quote.driveMinutes);
      dwell = Math.round(res.quote.dwellTotalMinutes);
      if (res.quote.blockedReason) priceNote = res.quote.blockedReason;
      else if (res.quote.total > 0) { estimatedTotal = res.quote.total; snapshot = res.quote; }
      else priceNote = "No online tour price is set for this vehicle.";
    } catch (e) {
      priceNote = (e as Error)?.message?.slice(0, 300) || "Instant price unavailable.";
    }
  } else {
    priceNote = "No single vehicle chosen — the team needs to plan the vehicles.";
  }
  if (routeMiles == null) {
    try {
      const loop = await measureLoop({
        startPlaceId: data.startPlaceId,
        endPlaceId: data.endPlaceId || data.startPlaceId,
        stopPlaceIds: data.stops.map((s) => s.placeId),
      });
      routeMiles = loop.miles;
      driveMinutes = Math.round(loop.driveMinutes);
    } catch { /* route unavailable — the team will measure it */ }
  }

  const originalChanged = data.originalStops && data.originalStops.length
    && data.originalStops.map((s) => s.placeId).join("|") !== stops.map((s) => s.placeId).join("|");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const ins: any = await (supabaseAdmin as any)
    .from("custom_tour_requests")
    .insert({
      customer_name: data.name,
      email: data.email.trim().toLowerCase(),
      phone: data.phone,
      start_label: data.startLabel,
      start_place_id: data.startPlaceId,
      end_label: data.endLabel || null,
      end_place_id: data.endPlaceId || null,
      tour_date: data.date,
      start_time: data.time.padStart(5, "0"),
      hours: data.hours,
      passengers: data.passengers,
      luggage: data.luggage,
      vehicle_class_id: vehicle?.id ?? null,
      vehicle_name: vehicle?.name ?? null,
      stops,
      original_stops: originalChanged ? data.originalStops!.map(toStored) : null,
      flight_number: data.flight || null,
      customer_notes: data.notes || null,
      route_miles: routeMiles == null ? null : Math.round(routeMiles * 10) / 10,
      drive_minutes: driveMinutes,
      dwell_minutes: dwell,
      estimated_total: estimatedTotal,
      price_snapshot: snapshot,
      price_note: priceNote,
    })
    .select("id, reference_code")
    .single();
  if (ins.error || !ins.data) {
    console.error("custom tour request insert failed", ins.error);
    throw new Error("We couldn't send your tour request right now. Please try again or call us.");
  }
  const reference = String(ins.data.reference_code);

  try {
    const { sendAndLog, getAdminNotificationEmail } = await import("@/lib/notifications.server");
    const { customTourRequestReceivedEmail } = await import("@/lib/email/tour.server");
    const ctx = {
      reference, customerName: data.name, tourDate: data.date, startTime: data.time.padStart(5, "0"),
      passengers: data.passengers, stops: stops.map((s) => s.name), statusUrl: statusUrl(reference),
    };
    const tpl = customTourRequestReceivedEmail(ctx);
    await sendAndLog({
      bookingId: null, eventKey: `custom_tour_ack_${reference}`, notificationType: "customer_custom_tour_request",
      recipientCategory: "customer", recipient: data.email, subject: tpl.subject, html: tpl.html, text: tpl.text,
    });
    const adminEmail = await getAdminNotificationEmail();
    if (adminEmail) {
      const lines = [
        `New custom tour request ${reference}`,
        `Customer: ${data.name} (${data.email}, ${data.phone})`,
        `Date/time: ${data.date} ${data.time} · ${data.hours} hours`,
        `Passengers: ${data.passengers} · Suitcases: ${data.luggage}`,
        `Start: ${data.startLabel}${data.endLabel ? ` · Finish: ${data.endLabel}` : ""}`,
        `Stops: ${stops.map((s) => s.name).join(" → ")}`,
        vehicle ? `Vehicle: ${vehicle.name}` : "Vehicle: not chosen",
        estimatedTotal != null ? `Instant estimate: £${estimatedTotal.toFixed(2)}` : `No instant price: ${priceNote ?? "—"}`,
        data.notes ? `Notes: ${data.notes}` : null,
        "",
        "Open Custom tour requests in the staff console to review and quote.",
      ].filter(Boolean) as string[];
      const body = lines.join("\n");
      await sendAndLog({
        bookingId: null, eventKey: `custom_tour_admin_${reference}`, notificationType: "admin_custom_tour_request",
        recipientCategory: "admin", recipient: adminEmail, subject: `New custom tour request ${reference}`,
        html: `<pre style="font:14px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;white-space:pre-wrap;">${body.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>`,
        text: body,
      });
    }
  } catch (err) {
    console.error("custom tour request emails failed", err);
  }

  return { reference };
}

export const createCustomTourRequest = createServerFn({ method: "POST" })
  .inputValidator((d: CustomTourRequestInput) => requestSchema.parse(d))
  .handler(async ({ data }): Promise<CustomTourRequestCreated> => {
    const { getClientIp } = await import("@/lib/client-ip.server");
    let ip = "unknown";
    try { ip = (await getClientIp()) ?? "unknown"; } catch { /* no request ip */ }
    return createCustomTourRequestImpl(data, { ip });
  });

// ---------------------------------------------------------------------------
// Customer status lookup — reference AND email must match; no names, phone
// numbers or internal notes are returned.
// ---------------------------------------------------------------------------

export type CustomTourStatusView = {
  reference: string;
  status: CustomTourStatus;
  statusLabel: string;
  statusMessage: string;
  tourDate: string;
  startTime: string;
  hours: number;
  passengers: number;
  luggage: number;
  startLabel: string;
  endLabel: string | null;
  vehicleName: string | null;
  stops: Array<{ name: string; dwellMinutes: number | null }>;
  price: number | null;
  createdAt: string;
  updates: Array<{ at: string; body: string }>;
};

const NOT_FOUND = "We couldn't find a request with that reference and email. Please check both and try again.";

export async function lookupCustomTourRequestImpl(input: { reference: string; email: string }): Promise<CustomTourStatusView> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const res: any = await (supabaseAdmin as any)
    .from("custom_tour_requests")
    .select("id, reference_code, status, email, tour_date, start_time, hours, passengers, luggage, start_label, end_label, vehicle_name, stops, quoted_total, created_at")
    .eq("reference_code", input.reference)
    .maybeSingle();
  if (res.error) throw new Error("We couldn't check your request right now. Please try again.");
  const row = res.data;
  if (!row || String(row.email).toLowerCase() !== input.email) throw new Error(NOT_FOUND);
  const notes: any = await (supabaseAdmin as any)
    .from("custom_tour_request_notes")
    .select("body, created_at")
    .eq("request_id", row.id)
    .eq("visible_to_customer", true)
    .order("created_at", { ascending: false })
    .limit(20);
  if (notes.error) throw new Error("We couldn't check your request right now. Please try again.");
  const status = row.status as CustomTourStatus;
  return {
    reference: row.reference_code,
    status,
    statusLabel: CUSTOM_TOUR_STATUS_LABEL[status] ?? status,
    statusMessage: CUSTOM_TOUR_STATUS_CUSTOMER[status] ?? "",
    tourDate: row.tour_date,
    startTime: row.start_time,
    hours: Number(row.hours),
    passengers: row.passengers,
    luggage: row.luggage,
    startLabel: row.start_label,
    endLabel: row.end_label ?? null,
    vehicleName: row.vehicle_name ?? null,
    stops: ((row.stops ?? []) as StoredStop[]).map((s) => ({ name: s.name, dwellMinutes: s.dwellMinutes ?? null })),
    price: PRICE_VISIBLE_STATUSES.includes(status) && row.quoted_total != null ? Number(row.quoted_total) : null,
    createdAt: row.created_at,
    updates: ((notes.data ?? []) as any[]).map((n) => ({ at: n.created_at, body: n.body })),
  };
}

export const getCustomTourRequestStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { reference: string; email: string }) => customTourLookupSchema.parse(d))
  .handler(async ({ data }): Promise<CustomTourStatusView> => {
    const { getClientIp } = await import("@/lib/client-ip.server");
    const { enforceRateLimit, LIMITS } = await import("@/lib/db-rate-limit.server");
    let ip = "unknown";
    try { ip = (await getClientIp()) ?? "unknown"; } catch { /* no request ip */ }
    await enforceRateLimit(LIMITS.customTourLookup, ip, "Too many lookups. Please wait a few minutes and try again.");
    return lookupCustomTourRequestImpl(data);
  });

// ---------------------------------------------------------------------------
// Staff console
// ---------------------------------------------------------------------------

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden: admin access required");
}

const statusEnum = z.enum(CUSTOM_TOUR_STATUSES);

export const listCustomTourRequestsPage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => pageInputSchema.extend({ status: z.string().max(20).catch("all").default("all") }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const sb = context.supabase as any;
    const search = ilikeAny(["reference_code", "customer_name", "email", "phone", "start_label"], data.q);
    const status = (CUSTOM_TOUR_STATUSES as readonly string[]).includes(data.status) ? data.status : "all";
    const page = await runPaged<any>((from, to) => {
      let q = sb.from("custom_tour_requests")
        .select("id, reference_code, status, customer_name, email, tour_date, start_time, hours, passengers, start_label, stops, vehicle_name, estimated_total, quoted_total, created_at", { count: "exact" });
      if (status !== "all") q = q.eq("status", status);
      if (search) q = q.or(search);
      return q.order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to);
    }, data);
    const keys = ["all", ...CUSTOM_TOUR_STATUSES];
    const counted = await Promise.all(keys.map(async (k) => {
      let q = sb.from("custom_tour_requests").select("id", { count: "exact", head: true });
      if (k !== "all") q = q.eq("status", k);
      if (search) q = q.or(search);
      const { count, error } = await q;
      if (error) throw new Error(error.message);
      return [k, count ?? 0] as const;
    }));
    return { ...page, counts: Object.fromEntries(counted) as Record<string, number> };
  });

export const getCustomTourRequestDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const sb = context.supabase as any;
    const [req, notes] = await Promise.all([
      sb.from("custom_tour_requests").select("*").eq("id", data.id).maybeSingle(),
      sb.from("custom_tour_request_notes").select("*").eq("request_id", data.id).order("created_at", { ascending: false }),
    ]);
    if (req.error) throw new Error(req.error.message);
    if (notes.error) throw new Error(notes.error.message);
    if (!req.data) throw new Error("This request no longer exists.");
    return { request: req.data as any, notes: (notes.data ?? []) as any[] };
  });

async function emailCustomer(row: any, status: CustomTourStatus, message: string | null) {
  const { sendAndLog } = await import("@/lib/notifications.server");
  const { customTourRequestUpdateEmail } = await import("@/lib/email/tour.server");
  const price = PRICE_VISIBLE_STATUSES.includes(status) && row.quoted_total != null ? Number(row.quoted_total) : null;
  const tpl = customTourRequestUpdateEmail({
    reference: row.reference_code, customerName: row.customer_name, tourDate: row.tour_date, startTime: row.start_time,
    passengers: row.passengers, stops: ((row.stops ?? []) as StoredStop[]).map((s) => s.name), statusUrl: statusUrl(row.reference_code),
    statusLabel: CUSTOM_TOUR_STATUS_LABEL[status], statusMessage: CUSTOM_TOUR_STATUS_CUSTOMER[status], price, message,
  });
  const res = await sendAndLog({
    bookingId: null, eventKey: null, notificationType: "customer_custom_tour_update",
    recipientCategory: "customer", recipient: row.email, subject: tpl.subject, html: tpl.html, text: tpl.text,
  });
  if (!res.configured) return "Saved, but email sending isn't set up, so the customer wasn't emailed.";
  return res.ok ? null : "Saved, but the email to the customer failed.";
}

export const updateCustomTourRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid(),
    status: statusEnum.optional(),
    quotedTotal: z.number().min(0).max(100000).nullable().optional(),
    /** Optional message saved as a customer-visible update and included in the email. */
    message: z.string().trim().max(4000).nullable().optional(),
    emailCustomer: z.boolean().optional().default(false),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const sb = context.supabase as any;
    const cur = await sb.from("custom_tour_requests").select("*").eq("id", data.id).maybeSingle();
    if (cur.error) throw new Error(cur.error.message);
    if (!cur.data) throw new Error("This request no longer exists.");
    const nextStatus = (data.status ?? cur.data.status) as CustomTourStatus;
    const nextQuote = data.quotedTotal === undefined ? cur.data.quoted_total : data.quotedTotal;
    if (nextStatus === "quoted" && (nextQuote == null || !(Number(nextQuote) > 0))) {
      throw new Error("Add the price before marking this request as quoted.");
    }
    const patch: any = {};
    if (data.status && data.status !== cur.data.status) patch.status = data.status;
    if (data.quotedTotal !== undefined && Number(data.quotedTotal ?? -1) !== Number(cur.data.quoted_total ?? -1)) patch.quoted_total = data.quotedTotal;

    const author = { author_id: context.userId, author_email: (context as any).claims?.email ?? null };
    const notes: any[] = [];
    if (patch.status) notes.push({ request_id: data.id, kind: "status", body: `Status changed from ${CUSTOM_TOUR_STATUS_LABEL[cur.data.status as CustomTourStatus] ?? cur.data.status} to ${CUSTOM_TOUR_STATUS_LABEL[nextStatus]}.`, ...author });
    if ("quoted_total" in patch) notes.push({ request_id: data.id, kind: "quote", body: patch.quoted_total == null ? "Price removed." : `Price set to £${Number(patch.quoted_total).toFixed(2)}.`, ...author });
    if (data.message) notes.push({ request_id: data.id, kind: "note", body: data.message, visible_to_customer: true, ...author });

    if (Object.keys(patch).length) {
      const up = await sb.from("custom_tour_requests").update(patch).eq("id", data.id);
      if (up.error) throw new Error(up.error.message);
    }
    if (notes.length) {
      const ins = await sb.from("custom_tour_request_notes").insert(notes);
      if (ins.error) throw new Error(ins.error.message);
    }
    let warning: string | null = null;
    if (data.emailCustomer) {
      warning = await emailCustomer({ ...cur.data, ...patch }, nextStatus, data.message ?? null).catch(() => "Saved, but the email to the customer failed.");
    }
    return { ok: true, warning };
  });

export const addCustomTourRequestNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid(),
    body: z.string().trim().min(1, "Write a note first.").max(4000),
    visibleToCustomer: z.boolean().optional().default(false),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const ins = await (context.supabase as any).from("custom_tour_request_notes").insert({
      request_id: data.id, kind: "note", body: data.body, visible_to_customer: data.visibleToCustomer,
      author_id: context.userId, author_email: (context as any).claims?.email ?? null,
    });
    if (ins.error) throw new Error(ins.error.message);
    return { ok: true };
  });
