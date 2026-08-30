/**
 * Admin analytics — real business performance computed from live data.
 *
 * Everything here is admin-only (bearer token + `has_role` check) and read
 * only: bookings, quotes, payments and enquiries in a chosen window, compared
 * against the immediately preceding window of the same length.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const input = z.object({
  from: z.string().min(8),          // YYYY-MM-DD (inclusive)
  to: z.string().min(8),            // YYYY-MM-DD (inclusive)
  granularity: z.enum(["day", "week", "month"]).default("day"),
});

export type AnalyticsPoint = { date: string; bookings: number; quotes: number; revenue: number };
export type NameCount = { name: string; count: number; revenue: number };

function dayStart(d: string) { return new Date(`${d}T00:00:00.000Z`); }
function dayEnd(d: string) { return new Date(`${d}T23:59:59.999Z`); }

function bucketOf(iso: string, granularity: "day" | "week" | "month") {
  const d = new Date(iso);
  if (granularity === "month") return d.toISOString().slice(0, 7);
  if (granularity === "week") {
    const t = new Date(d);
    t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7)); // ISO Monday
    return t.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

function pct(current: number, previous: number): number | null {
  if (!previous) return current ? null : 0;
  return ((current - previous) / previous) * 100;
}

export const getSiteAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => input.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: admin, error: roleErr } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (roleErr) throw new Error("Authorization check failed");
    if (!admin) throw new Error("Forbidden: admin access required");

    const start = dayStart(data.from);
    const end = dayEnd(data.to);
    if (end.getTime() < start.getTime()) throw new Error("End date must be after the start date");
    const spanMs = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - spanMs);

    const iso = (d: Date) => d.toISOString();

    const [bRes, pbRes, payRes, prevPayRes, qRes, prevQRes, mRes, prevMRes] = await Promise.all([
      supabase.from("bookings")
        .select("id, status, payment_status, service_type, vehicle_type, vehicle_class_name_snapshot, pickup_address, dropoff_address, price, created_at, quote_id")
        .is("deleted_at", null).gte("created_at", iso(start)).lte("created_at", iso(end)),
      supabase.from("bookings")
        .select("id, status, price, quote_id")
        .is("deleted_at", null).gte("created_at", iso(prevStart)).lte("created_at", iso(prevEnd)),
      supabase.from("payments").select("amount, status, paid_at, created_at")
        .eq("status", "paid").gte("created_at", iso(start)).lte("created_at", iso(end)),
      supabase.from("payments").select("amount, status, paid_at, created_at")
        .eq("status", "paid").gte("created_at", iso(prevStart)).lte("created_at", iso(prevEnd)),
      supabase.from("quote_calculations").select("id, final_price, created_at, final_service_type")
        .gte("created_at", iso(start)).lte("created_at", iso(end)),
      supabase.from("quote_calculations").select("id")
        .gte("created_at", iso(prevStart)).lte("created_at", iso(prevEnd)),
      supabase.from("contact_messages").select("id").gte("created_at", iso(start)).lte("created_at", iso(end)),
      supabase.from("contact_messages").select("id").gte("created_at", iso(prevStart)).lte("created_at", iso(prevEnd)),
    ]);

    const firstErr = [bRes, pbRes, payRes, prevPayRes, qRes, prevQRes, mRes, prevMRes].find(r => r.error)?.error;
    if (firstErr) throw new Error(firstErr.message);

    const bookings = bRes.data ?? [];
    const prevBookings = pbRes.data ?? [];
    const payments = payRes.data ?? [];
    const prevPayments = prevPayRes.data ?? [];
    const quotes = qRes.data ?? [];
    const prevQuotes = prevQRes.data ?? [];

    const num = (v: unknown) => Number(v ?? 0) || 0;
    const revenue = payments.reduce((s, p) => s + num(p.amount), 0);
    const prevRevenue = prevPayments.reduce((s, p) => s + num(p.amount), 0);
    const completed = bookings.filter(b => b.status === "completed").length;
    const cancelled = bookings.filter(b => b.status === "cancelled" || b.status === "rejected").length;
    const prevCancelled = prevBookings.filter(b => b.status === "cancelled" || b.status === "rejected").length;
    const avgFare = bookings.length ? bookings.reduce((s, b) => s + num(b.price), 0) / bookings.length : 0;
    const prevAvgFare = prevBookings.length ? prevBookings.reduce((s, b) => s + num(b.price), 0) / prevBookings.length : 0;

    // Quote → booking conversion (a booking carries the quote it was priced from).
    const convertedQuoteIds = new Set(bookings.map(b => b.quote_id).filter(Boolean) as string[]);
    const prevConvertedQuoteIds = new Set(prevBookings.map(b => b.quote_id).filter(Boolean) as string[]);
    const conversion = quotes.length ? (convertedQuoteIds.size / quotes.length) * 100 : 0;
    const prevConversion = prevQuotes.length ? (prevConvertedQuoteIds.size / prevQuotes.length) * 100 : 0;

    // Time series — every bucket present, even with no activity.
    const buckets = new Map<string, AnalyticsPoint>();
    const cursor = new Date(start);
    while (cursor.getTime() <= end.getTime()) {
      const k = bucketOf(cursor.toISOString(), data.granularity);
      if (!buckets.has(k)) buckets.set(k, { date: k, bookings: 0, quotes: 0, revenue: 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    const touch = (k: string) => {
      let e = buckets.get(k);
      if (!e) { e = { date: k, bookings: 0, quotes: 0, revenue: 0 }; buckets.set(k, e); }
      return e;
    };
    for (const b of bookings) touch(bucketOf(b.created_at, data.granularity)).bookings += 1;
    for (const q of quotes) touch(bucketOf(q.created_at, data.granularity)).quotes += 1;
    for (const p of payments) touch(bucketOf(p.paid_at ?? p.created_at, data.granularity)).revenue += num(p.amount);
    const series = Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Breakdowns
    const tally = (key: (b: typeof bookings[number]) => string) => {
      const m = new Map<string, NameCount>();
      for (const b of bookings) {
        const name = (key(b) || "Unspecified").trim() || "Unspecified";
        const e = m.get(name) ?? { name, count: 0, revenue: 0 };
        e.count += 1; e.revenue += num(b.price);
        m.set(name, e);
      }
      return Array.from(m.values()).sort((a, b) => b.count - a.count);
    };

    const byVehicle = tally(b => b.vehicle_class_name_snapshot || b.vehicle_type || "Unspecified").slice(0, 8);
    const byService = tally(b => b.service_type || "transfer").slice(0, 8);
    const byRoute = tally(b => `${b.pickup_address ?? "?"} → ${b.dropoff_address ?? "?"}`).slice(0, 10);

    const statusMap = new Map<string, number>();
    for (const b of bookings) statusMap.set(b.status as string, (statusMap.get(b.status as string) ?? 0) + 1);
    const byStatus = Array.from(statusMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

    const paidBookings = bookings.filter(b => b.payment_status === "paid").length;

    return {
      range: {
        from: data.from, to: data.to, granularity: data.granularity,
        previousFrom: prevStart.toISOString().slice(0, 10),
        previousTo: prevEnd.toISOString().slice(0, 10),
      },
      kpi: {
        revenue, revenueChange: pct(revenue, prevRevenue),
        bookings: bookings.length, bookingsChange: pct(bookings.length, prevBookings.length),
        quotes: quotes.length, quotesChange: pct(quotes.length, prevQuotes.length),
        conversion, conversionChange: pct(conversion, prevConversion),
        avgFare, avgFareChange: pct(avgFare, prevAvgFare),
        completed,
        cancelled, cancelledChange: pct(cancelled, prevCancelled),
        cancelRate: bookings.length ? (cancelled / bookings.length) * 100 : 0,
        paidBookings,
        enquiries: (mRes.data ?? []).length,
        enquiriesChange: pct((mRes.data ?? []).length, (prevMRes.data ?? []).length),
      },
      series,
      byStatus,
      byVehicle,
      byService,
      byRoute,
    };
  });

export type SiteAnalytics = Awaited<ReturnType<typeof getSiteAnalytics>>;
