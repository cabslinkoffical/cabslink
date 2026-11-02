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
import { fetchAllPages } from "@/lib/fetch-all-pages";
import { SETTLED_PAYMENT_STATUSES, netRevenue, revenueByBucket, settlementWindowFilter } from "@/lib/revenue";
import { ukDate, ukDayStart, addDays } from "@/lib/uk-time";

const input = z.object({
  from: z.string().min(8),          // YYYY-MM-DD (inclusive)
  to: z.string().min(8),            // YYYY-MM-DD (inclusive)
  granularity: z.enum(["day", "week", "month"]).default("day"),
});

export type AnalyticsPoint = { date: string; bookings: number; quotes: number; revenue: number };
export type NameCount = { name: string; count: number; revenue: number };

// Whole UK calendar days (Europe/London, GMT/BST): from 00:00 on `from` to the end of `to`.
function dayStart(d: string) { return ukDayStart(d); }
function dayEnd(d: string) { return new Date(ukDayStart(addDays(d, 1)).getTime() - 1); }

/** Day / ISO-week (Monday) / month bucket of an instant, by its UK calendar date. */
export function bucketOf(iso: string, granularity: "day" | "week" | "month") {
  const day = ukDate(iso);
  if (granularity === "month") return day.slice(0, 7);
  if (granularity === "week") {
    const [y, m, d] = day.split("-").map(Number);
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return addDays(day, -((dow + 6) % 7));
  }
  return day;
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

    // Complete paginated reads with stable order: counts, totals and
    // breakdowns never silently use a capped subset.
    const page = <T,>(q: () => any) => fetchAllPages<T>((a, z) => q().order("id").range(a, z));
    const settledPayments = (from: Date, to: Date) => page<any>(() => supabase.from("payments")
      .select("id, amount, refunded_amount, status, paid_at, created_at")
      .in("status", SETTLED_PAYMENT_STATUSES as unknown as ("paid" | "partial" | "refunded")[])
      .or(settlementWindowFilter(iso(from), iso(to))));
    const [bookings, prevBookings, payments, prevPayments, quotes, prevQuotes, messages, prevMessages] = await Promise.all([
      page<any>(() => supabase.from("bookings")
        .select("id, status, payment_status, service_type, vehicle_type, vehicle_class_name_snapshot, pickup_address, dropoff_address, price, created_at, quote_id")
        .is("deleted_at", null).gte("created_at", iso(start)).lte("created_at", iso(end))),
      page<any>(() => supabase.from("bookings")
        .select("id, status, price, quote_id")
        .is("deleted_at", null).gte("created_at", iso(prevStart)).lte("created_at", iso(prevEnd))),
      // Revenue: selected, totalled and bucketed by settlement time (paid_at, else created_at).
      settledPayments(start, end),
      settledPayments(prevStart, prevEnd),
      page<any>(() => supabase.from("quote_calculations").select("id, final_price, created_at, final_service_type")
        .gte("created_at", iso(start)).lte("created_at", iso(end))),
      page<any>(() => supabase.from("quote_calculations").select("id")
        .gte("created_at", iso(prevStart)).lte("created_at", iso(prevEnd))),
      page<any>(() => supabase.from("contact_messages").select("id").gte("created_at", iso(start)).lte("created_at", iso(end))),
      page<any>(() => supabase.from("contact_messages").select("id").gte("created_at", iso(prevStart)).lte("created_at", iso(prevEnd))),
    ]);
    const mRes = { data: messages };
    const prevMRes = { data: prevMessages };

    const num = (v: unknown) => Number(v ?? 0) || 0;
    const revenue = Math.round(payments.reduce((s: number, p: any) => s + netRevenue(p), 0) * 100) / 100;
    const prevRevenue = Math.round(prevPayments.reduce((s: number, p: any) => s + netRevenue(p), 0) * 100) / 100;
    const completed = bookings.filter(b => b.status === "completed").length;
    const prevCompleted = prevBookings.filter(b => b.status === "completed").length;
    const cancelled = bookings.filter(b => b.status === "cancelled" || b.status === "rejected").length;
    const prevCancelled = prevBookings.filter(b => b.status === "cancelled" || b.status === "rejected").length;
    const avgFare = bookings.length ? bookings.reduce((s, b) => s + num(b.price), 0) / bookings.length : 0;
    const prevAvgFare = prevBookings.length ? prevBookings.reduce((s, b) => s + num(b.price), 0) / prevBookings.length : 0;

    // Quote → booking conversion (a booking carries the quote it was priced from).
    // Cohort: of the quotes created in the window, how many were booked (whenever the booking came in).
    const bookedQuoteIds = new Set(
      (await page<any>(() => supabase.from("bookings").select("id, quote_id").not("quote_id", "is", null).is("deleted_at", null)))
        .map((b: any) => b.quote_id as string),
    );
    const convertedCount = quotes.filter((q: any) => bookedQuoteIds.has(q.id)).length;
    const prevConvertedCount = prevQuotes.filter((q: any) => bookedQuoteIds.has(q.id)).length;
    const conversion = quotes.length ? (convertedCount / quotes.length) * 100 : 0;
    const prevConversion = prevQuotes.length ? (prevConvertedCount / prevQuotes.length) * 100 : 0;

    // Time series — every bucket present, even with no activity.
    const buckets = new Map<string, AnalyticsPoint>();
    for (let day = data.from; day <= data.to; day = addDays(day, 1)) {
      const k = bucketOf(ukDayStart(day).toISOString(), data.granularity);
      if (!buckets.has(k)) buckets.set(k, { date: k, bookings: 0, quotes: 0, revenue: 0 });
    }
    const touch = (k: string) => {
      let e = buckets.get(k);
      if (!e) { e = { date: k, bookings: 0, quotes: 0, revenue: 0 }; buckets.set(k, e); }
      return e;
    };
    for (const b of bookings) touch(bucketOf(b.created_at, data.granularity)).bookings += 1;
    for (const q of quotes) touch(bucketOf(q.created_at, data.granularity)).quotes += 1;
    for (const [k, v] of revenueByBucket(payments, (t) => bucketOf(t, data.granularity))) touch(k).revenue += v;
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
        completed, completedChange: pct(completed, prevCompleted),
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
