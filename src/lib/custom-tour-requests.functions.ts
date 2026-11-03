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

export const requestStop = z.object({
  poiId: z.string().uuid().nullable().optional(),
  placeId: placeIdSchema,
  name: z.string().trim().min(1).max(160),
  dwellMinutes: z.coerce.number().min(0).max(600).nullable().optional(),
  locked: z.boolean().optional(),
});

export const requestSchema = z.object({
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

export const createCustomTourRequest = createServerFn({ method: "POST" })
  .inputValidator((d: CustomTourRequestInput) => requestSchema.parse(d))
  .handler(async ({ data }): Promise<{ reference: string }> => {
    const { getClientIp } = await import("@/lib/client-ip.server");
    let ip = "unknown";
    try { ip = (await getClientIp()) ?? "unknown"; } catch { /* no request ip */ }
    const { createCustomTourRequestImpl } = await import("@/lib/custom-tour-requests.server");
    return createCustomTourRequestImpl(data, { ip });
  });

// ---------------------------------------------------------------------------
// Customer status lookup — reference AND email must match; no names, phone
// numbers or internal notes are returned.
// ---------------------------------------------------------------------------

export type { CustomTourStatusView } from "@/lib/custom-tour-requests.server";

export const getCustomTourRequestStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { reference: string; email: string }) => customTourLookupSchema.parse(d))
  .handler(async ({ data }) => {
    const { getClientIp } = await import("@/lib/client-ip.server");
    const { enforceRateLimit, LIMITS } = await import("@/lib/db-rate-limit.server");
    let ip = "unknown";
    try { ip = (await getClientIp()) ?? "unknown"; } catch { /* no request ip */ }
    await enforceRateLimit(LIMITS.customTourLookup, ip, "Too many lookups. Please wait a few minutes and try again.");
    const { lookupCustomTourRequestImpl } = await import("@/lib/custom-tour-requests.server");
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
      const { emailCustomer } = await import("@/lib/custom-tour-requests.server");
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
