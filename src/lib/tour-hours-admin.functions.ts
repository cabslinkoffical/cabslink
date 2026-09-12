/**
 * Admin CRUD for the hourly tour model: hour/mileage tiers, tour rules,
 * per-class tour rate card, daily capacity and premade tour pricing.
 * Every handler requires the admin role.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden: admin access required");
}

export type TourHoursConfig = {
  tiers: Array<{
    id: string;
    hours: number;
    included_miles: number;
    is_bookable: boolean;
    sort_order: number;
  }>;
  rules: {
    id: string;
    earliest_start_time: string;
    latest_finish_time: string;
    max_bookable_hours: number;
    minimum_stop_minutes: number;
    pickup_buffer_minutes: number;
    mileage_tolerance_miles: number;
    minimum_notice_hours: number;
    checkout_hold_minutes: number;
  } | null;
  classes: Array<{
    id: string;
    name: string;
    hourly_rate: number | null;
    extra_hour_rate: number | null;
    extra_mile_rate: number | null;
    min_hours: number | null;
    max_hours: number | null;
    max_passengers: number | null;
    max_luggage: number | null;
    max_tours_per_day: number | null;
  }>;
  templates: Array<{
    id: string;
    name: string;
    is_bookable: boolean;
    default_duration_hours: number | null;
    min_duration_hours: number | null;
    max_duration_hours: number | null;
    included_miles: number | null;
    start_mode: string;
    fixed_start_address: string | null;
    prices: Array<{ vehicle_class_id: string; price: number }>;
  }>;
};

export const getTourHoursConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TourHoursConfig> => {
    await assertAdmin(context);
    const sb = context.supabase;
    const [tiers, rules, classes, caps, templates, prices] = await Promise.all([
      sb.from("tour_hour_tiers").select("*").order("sort_order"),
      sb.from("tour_rules").select("*").limit(1).maybeSingle(),
      sb
        .from("vehicle_classes")
        .select(
          "id, name, hourly_rate, extra_hour_rate, extra_mile_rate, min_hours, max_hours, max_passengers, max_luggage, display_order",
        )
        .order("display_order"),
      sb.from("vehicle_class_daily_capacity").select("vehicle_class_id, max_tours_per_day"),
      sb
        .from("scenic_route_templates")
        .select(
          "id, name, is_bookable, default_duration_hours, min_duration_hours, max_duration_hours, included_miles, start_mode, fixed_start_address, display_order",
        )
        .order("display_order"),
      sb.from("template_fixed_prices").select("route_template_id, vehicle_class_id, price"),
    ]);

    const capMap = new Map<string, number>(
      (caps.data ?? []).map((c: any) => [c.vehicle_class_id, Number(c.max_tours_per_day)]),
    );

    return {
      tiers: (tiers.data ?? []).map((t: any) => ({
        id: t.id,
        hours: Number(t.hours),
        included_miles: Number(t.included_miles),
        is_bookable: !!t.is_bookable,
        sort_order: Number(t.sort_order),
      })),
      rules: rules.data
        ? {
            id: rules.data.id,
            earliest_start_time: String(rules.data.earliest_start_time).slice(0, 5),
            latest_finish_time: String(rules.data.latest_finish_time).slice(0, 5),
            max_bookable_hours: Number(rules.data.max_bookable_hours),
            minimum_stop_minutes: Number(rules.data.minimum_stop_minutes),
            pickup_buffer_minutes: Number(rules.data.pickup_buffer_minutes),
            mileage_tolerance_miles: Number(rules.data.mileage_tolerance_miles),
            minimum_notice_hours: Number(rules.data.minimum_notice_hours),
            checkout_hold_minutes: Number(rules.data.checkout_hold_minutes),
          }
        : null,
      classes: (classes.data ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        hourly_rate: c.hourly_rate == null ? null : Number(c.hourly_rate),
        extra_hour_rate: c.extra_hour_rate == null ? null : Number(c.extra_hour_rate),
        extra_mile_rate: c.extra_mile_rate == null ? null : Number(c.extra_mile_rate),
        min_hours: c.min_hours == null ? null : Number(c.min_hours),
        max_hours: c.max_hours == null ? null : Number(c.max_hours),
        max_passengers: c.max_passengers == null ? null : Number(c.max_passengers),
        max_luggage: c.max_luggage == null ? null : Number(c.max_luggage),
        max_tours_per_day: capMap.get(c.id) ?? null,
      })),
      templates: (templates.data ?? []).map((t: any) => ({
        id: t.id,
        name: t.name,
        is_bookable: !!t.is_bookable,
        default_duration_hours: t.default_duration_hours == null ? null : Number(t.default_duration_hours),
        min_duration_hours: t.min_duration_hours == null ? null : Number(t.min_duration_hours),
        max_duration_hours: t.max_duration_hours == null ? null : Number(t.max_duration_hours),
        included_miles: t.included_miles == null ? null : Number(t.included_miles),
        start_mode: t.start_mode ?? "customer",
        fixed_start_address: t.fixed_start_address ?? null,
        prices: (prices.data ?? [])
          .filter((p: any) => p.route_template_id === t.id)
          .map((p: any) => ({ vehicle_class_id: p.vehicle_class_id, price: Number(p.price) })),
      })),
    };
  });

const tierSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  hours: z.coerce.number().min(1).max(24),
  included_miles: z.coerce.number().min(0).max(2000),
  is_bookable: z.boolean().default(true),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
});

export const saveTourTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tierSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const row = {
      hours: data.hours,
      included_miles: data.included_miles,
      is_bookable: data.is_bookable,
      sort_order: data.sort_order,
    };
    const q = data.id
      ? await context.supabase.from("tour_hour_tiers").update(row).eq("id", data.id)
      : await context.supabase.from("tour_hour_tiers").insert(row);
    if (q.error) throw new Error(q.error.message);
    return { ok: true };
  });

export const deleteTourTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("tour_hour_tiers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const rulesSchema = z.object({
  id: z.string().uuid(),
  earliest_start_time: z.string().regex(/^\d{2}:\d{2}$/),
  latest_finish_time: z.string().regex(/^\d{2}:\d{2}$/),
  max_bookable_hours: z.coerce.number().min(1).max(24),
  minimum_stop_minutes: z.coerce.number().int().min(1).max(240),
  pickup_buffer_minutes: z.coerce.number().int().min(0).max(240),
  mileage_tolerance_miles: z.coerce.number().min(0).max(200),
  minimum_notice_hours: z.coerce.number().int().min(0).max(720),
  checkout_hold_minutes: z.coerce.number().int().min(5).max(1440),
});

export const saveTourRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rulesSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...rest } = data;
    const { error } = await context.supabase.from("tour_rules").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const classSchema = z.object({
  id: z.string().uuid(),
  hourly_rate: z.coerce.number().min(0).max(5000).nullable(),
  extra_hour_rate: z.coerce.number().min(0).max(5000).nullable(),
  extra_mile_rate: z.coerce.number().min(0).max(100).nullable(),
  min_hours: z.coerce.number().min(0).max(24).nullable(),
  max_hours: z.coerce.number().min(0).max(24).nullable(),
  max_passengers: z.coerce.number().int().min(0).max(80).nullable(),
  max_luggage: z.coerce.number().int().min(0).max(80).nullable(),
  max_tours_per_day: z.coerce.number().int().min(0).max(50).nullable(),
});

export const saveClassTourRates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => classSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, max_tours_per_day, ...rates } = data;
    const up = await context.supabase.from("vehicle_classes").update(rates).eq("id", id);
    if (up.error) throw new Error(up.error.message);

    if (max_tours_per_day == null) {
      await context.supabase.from("vehicle_class_daily_capacity").delete().eq("vehicle_class_id", id);
    } else {
      const cap = await context.supabase
        .from("vehicle_class_daily_capacity")
        .upsert({ vehicle_class_id: id, max_tours_per_day }, { onConflict: "vehicle_class_id" });
      if (cap.error) throw new Error(cap.error.message);
    }
    return { ok: true };
  });

const templateSchema = z.object({
  id: z.string().uuid(),
  is_bookable: z.boolean(),
  default_duration_hours: z.coerce.number().min(0).max(24).nullable(),
  min_duration_hours: z.coerce.number().min(0).max(24).nullable(),
  max_duration_hours: z.coerce.number().min(0).max(24).nullable(),
  included_miles: z.coerce.number().min(0).max(2000).nullable(),
  start_mode: z.enum(["customer", "fixed"]),
  fixed_start_address: z.string().max(300).nullable(),
  prices: z
    .array(z.object({ vehicle_class_id: z.string().uuid(), price: z.coerce.number().min(0).max(100000) }))
    .max(60)
    .default([]),
});

export const saveTemplateTourSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => templateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, prices, ...rest } = data;
    const up = await context.supabase.from("scenic_route_templates").update(rest).eq("id", id);
    if (up.error) throw new Error(up.error.message);

    const del = await context.supabase.from("template_fixed_prices").delete().eq("route_template_id", id);
    if (del.error) throw new Error(del.error.message);
    if (prices.length) {
      const ins = await context.supabase
        .from("template_fixed_prices")
        .insert(prices.map((p) => ({ route_template_id: id, ...p })));
      if (ins.error) throw new Error(ins.error.message);
    }
    return { ok: true };
  });
