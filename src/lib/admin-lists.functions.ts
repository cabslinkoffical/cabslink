/**
 * Page-by-page list readers for the staff console (bookings live in
 * admin-bookings.functions.ts). Each returns one page plus the full total;
 * summaries shown above a list are counted in the database, never from the
 * loaded page.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { pageInputSchema, runPaged, ilikeAny, slicePage } from "@/lib/admin-paging";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden: admin access required");
}

const str = (max = 60, def = "all") => z.string().max(max).catch(def).default(def);

async function headCount(q: any): Promise<number> {
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// -----------------------------------------------------------------
// Messages (website contact inbox)
// -----------------------------------------------------------------
export const MESSAGE_SOURCES = ["contact", "corporate", "driver", "tour"] as const;
/** Legacy tour bookings and cancellation requests are handled elsewhere; null subjects stay. */
const INBOX_ONLY = 'subject.is.null,and(subject.not.ilike."Tour booking:*",subject.not.ilike."Cancellation request:*")';

function messagesBase(sb: any, select: string, opts: any) {
  return sb.from("contact_messages").select(select, opts).or(INBOX_ONLY);
}
function applySource(q: any, source: string) {
  if (source === "all") return q;
  if ((MESSAGE_SOURCES as readonly string[]).includes(source)) return q.eq("source", source);
  return q.or(`source.is.null,source.not.in.(${MESSAGE_SOURCES.join(",")})`);
}

export const listMessagesPage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => pageInputSchema.extend({ source: str() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const search = ilikeAny(["name", "email", "subject", "message", "phone"], data.q);
    const page = await runPaged<any>((from, to) => {
      let q = applySource(messagesBase(context.supabase, "*", { count: "exact" }), data.source);
      if (search) q = q.or(search);
      return q.order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to);
    }, data);

    const sources = ["all", ...MESSAGE_SOURCES, "other"];
    const counted = await Promise.all(sources.map(async (s) => {
      // Counts follow the same search as the list so tabs never advertise unrelated totals.
      const base = () => {
        const q = applySource(messagesBase(context.supabase, "id", { count: "exact", head: true }), s);
        return search ? q.or(search) : q;
      };
      const [total, unread] = await Promise.all([headCount(base()), headCount(base().eq("status", "new"))]);
      return [s, { total, unread }] as const;
    }));
    return { ...page, counts: Object.fromEntries(counted) as Record<string, { total: number; unread: number }> };
  });

// -----------------------------------------------------------------
// Driver applications
// -----------------------------------------------------------------
export const listDriverApplicationsPage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => pageInputSchema.parse(i ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const search = ilikeAny(["name", "email", "phone"], data.q);
    return runPaged<any>((from, to) => {
      let q = context.supabase.from("contact_messages")
        .select("id, name, email, phone, message, status, created_at", { count: "exact" })
        .ilike("subject", "%Driver%");
      if (search) q = q.or(search);
      return q.order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to);
    }, data);
  });

// -----------------------------------------------------------------
// Payments
// -----------------------------------------------------------------
export const PAYMENT_TABS = ["all", "unpaid", "paid", "partial", "refunded", "failed"] as const;

export const listPaymentsPage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => pageInputSchema.extend({ status: str() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    return runPaged<any>((from, to) => {
      let q = context.supabase.from("payments")
        .select("*, booking:bookings(id, booking_ref, customer_name, email, phone, pickup_address, dropoff_address, pickup_date, pickup_time, status, payment_status)", { count: "exact" });
      if (data.status !== "all" && (PAYMENT_TABS as readonly string[]).includes(data.status)) q = q.eq("status", data.status as any);
      return q.order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to);
    }, data);
  });

// -----------------------------------------------------------------
// Customers (aggregated from every booking, then paged)
// -----------------------------------------------------------------
/**
 * One row per customer email. `bookings` counts every non-deleted booking;
 * `spend` is money actually collected (settled payments net of refunds), so
 * unpaid or cancelled fares never count as spend.
 */
export function aggregateCustomers(rows: any[], payments: any[] = []) {
  const paidByBooking = new Map<string, number>();
  for (const p of payments) {
    if (!p.booking_id || !["paid", "partial", "refunded"].includes(p.status)) continue;
    const net = Number(p.amount || 0) - Number(p.refunded_amount || 0);
    paidByBooking.set(p.booking_id, (paidByBooking.get(p.booking_id) ?? 0) + net);
  }
  const map = new Map<string, any>();
  for (const b of rows) {
    const key = (b.email ?? "").toLowerCase();
    if (!key) continue;
    const existing = map.get(key) ?? { name: b.customer_name, email: b.email, phone: b.phone, bookings: 0, spend: 0, last: b.pickup_date, lastCreated: b.created_at };
    existing.bookings += 1;
    existing.spend = Math.round((existing.spend + (paidByBooking.get(b.id) ?? 0)) * 100) / 100;
    if (b.pickup_date > existing.last) existing.last = b.pickup_date;
    if (new Date(b.created_at) > new Date(existing.lastCreated)) existing.lastCreated = b.created_at;
    map.set(key, existing);
  }
  return Array.from(map.values()).sort((a, b) => new Date(b.lastCreated).getTime() - new Date(a.lastCreated).getTime());
}

export const listCustomersPage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => pageInputSchema.parse(i ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { fetchAllPages } = await import("@/lib/fetch-all-pages");
    const [rows, payments] = await Promise.all([
      fetchAllPages<any>((a, z) => context.supabase.from("bookings")
        .select("id, customer_name, email, phone, price, pickup_date, status, created_at")
        .is("deleted_at", null).order("id").range(a, z)),
      fetchAllPages<any>((a, z) => context.supabase.from("payments")
        .select("id, booking_id, amount, refunded_amount, status").order("id").range(a, z)),
    ]);
    // In-memory match: plain lowercase text (emails keep their dots and @).
    const term = String(data.q ?? "").trim().toLowerCase().slice(0, 100);
    const all = aggregateCustomers(rows, payments).filter((c) =>
      !term || [c.name, c.email, c.phone].some((v: string) => String(v ?? "").toLowerCase().includes(term)));
    return slicePage(all, data);
  });

// -----------------------------------------------------------------
// Activity logs
// -----------------------------------------------------------------
export const listActivityLogsPage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => pageInputSchema.extend({
    entity: z.string().max(80).optional(),
    from: z.string().max(40).optional(),
    to: z.string().max(40).optional(),
  }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const search = ilikeAny(["actor_email", "entity_id", "action"], data.q);
    return runPaged<any>((from, to) => {
      let q = context.supabase.from("activity_logs").select("*", { count: "exact" });
      if (data.entity) q = q.eq("entity", data.entity);
      if (data.from) q = q.gte("created_at", data.from);
      if (data.to) q = q.lte("created_at", data.to);
      if (search) q = q.or(search);
      return q.order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to);
    }, data);
  });

// -----------------------------------------------------------------
// Cancellation requests
// -----------------------------------------------------------------
const CANCEL_VIEWS: Record<string, string[] | null> = {
  open: ["pending", "in_review"], approved: ["approved"], refunded: ["refunded"], closed: ["declined", "completed"], all: null,
};

export const listCancellationRequestsPage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => pageInputSchema.extend({ view: str(20, "open") }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { fetchAllPages } = await import("@/lib/fetch-all-pages");
    const statuses = CANCEL_VIEWS[data.view] ?? null;
    const search = ilikeAny(["booking_ref", "customer_name", "email", "phone", "reason", "pickup_address", "dropoff_address"], data.q);
    const page = await runPaged<any>((from, to) => {
      let q = context.supabase.from("cancellation_requests").select("*", { count: "exact" });
      if (statuses) q = q.in("status", statuses as any);
      if (search) q = q.or(search);
      return q.order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to);
    }, data);
    // Summary over every request (status and amounts only).
    const all = await fetchAllPages<any>((a, z) => context.supabase.from("cancellation_requests")
      .select("id, status, refund_amount, price_at_request").order("id").range(a, z));
    const counts: Record<string, number> = { all: all.length, open: 0 };
    let refundDue = 0;
    for (const r of all) {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
      if (r.status === "pending" || r.status === "in_review") counts.open += 1;
      if (r.status === "approved") refundDue += Number(r.refund_amount ?? r.price_at_request ?? 0);
    }
    return { ...page, counts, refundDue };
  });

/** One cancellation request by id (for opening a request that isn't on the current page). */
export const getCancellationRequest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase.from("cancellation_requests").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

// -----------------------------------------------------------------
// Change (amendment) requests
// -----------------------------------------------------------------
export const listBookingAmendmentsPage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => pageInputSchema.extend({ view: str(20, "open") }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { fetchAllPages } = await import("@/lib/fetch-all-pages");
    const known = ["pending_payment", "awaiting_refund", "applied", "declined"];
    const statuses = data.view === "open" ? ["pending_payment", "awaiting_refund"]
      : known.includes(data.view) ? [data.view] : null;
    const search = ilikeAny(["booking_ref", "customer_name", "email", "phone", "customer_note"], data.q);
    const page = await runPaged<any>((from, to) => {
      let q = context.supabase.from("booking_amendments").select("*", { count: "exact" });
      if (statuses) q = q.in("status", statuses as any);
      if (search) q = q.or(search);
      return q.order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to);
    }, data);
    const all = await fetchAllPages<any>((a, z) => context.supabase.from("booking_amendments")
      .select("id, status, delta, refund_amount").order("id").range(a, z));
    const counts: Record<string, number> = { all: all.length, open: 0 };
    let topUpDue = 0;
    let refundDue = 0;
    for (const r of all) {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
      if (r.status === "pending_payment" || r.status === "awaiting_refund") counts.open += 1;
      if (r.status === "pending_payment") topUpDue += Number(r.delta ?? 0);
      if (r.status === "awaiting_refund") refundDue += Number(r.refund_amount ?? Math.abs(Number(r.delta ?? 0)));
    }
    return { ...page, counts, topUpDue, refundDue };
  });
