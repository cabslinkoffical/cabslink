import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { pageInputSchema, runPaged } from "@/lib/admin-paging";
import { applyBookingFilters, BOOKING_TABS, todayIso } from "@/lib/admin-bookings";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden: admin access required");
}

const BOOKING_SELECT = "*, driver:drivers(id, full_name)";
const listInput = pageInputSchema.extend({
  tab: z.string().max(40).catch("all").default("all"),
  includeTours: z.boolean().catch(false).default(false),
});

/** One page of transfer bookings for the chosen tab and search, newest first. */
export const listBookingsPage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => listInput.parse(i ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const today = todayIso();
    return runPaged<any>((from, to) =>
      applyBookingFilters(
        context.supabase.from("bookings").select(BOOKING_SELECT, { count: "exact" }) as any,
        data.tab, data.q, today, data.includeTours,
      )
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to), data);
  });

/** Number of bookings in every tab (for the same search), counted in the database. */
export const countBookingTabs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ q: z.string().max(200).catch("").default("") }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const today = todayIso();
    const entries = await Promise.all(BOOKING_TABS.map(async (t) => {
      const { count, error } = await applyBookingFilters(
        context.supabase.from("bookings").select("id", { count: "exact", head: true }) as any,
        t.id, data.q, today,
      );
      if (error) throw new Error(error.message);
      return [t.id, count ?? 0] as const;
    }));
    return Object.fromEntries(entries) as Record<string, number>;
  });

/** Every booking matching a tab + search (or everything with tab "everything"), for CSV export only. */
export const exportBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    tab: z.string().max(40).catch("all").default("all"),
    q: z.string().max(200).catch("").default(""),
    everything: z.boolean().catch(false).default(false),
  }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { fetchAllPages } = await import("@/lib/fetch-all-pages");
    const today = todayIso();
    return fetchAllPages<any>((a, z) => {
      let q: any = context.supabase.from("bookings").select(BOOKING_SELECT);
      if (!data.everything) q = applyBookingFilters(q, data.tab, data.q, today);
      return q.order("created_at", { ascending: false }).order("id", { ascending: false }).range(a, z);
    });
  });
