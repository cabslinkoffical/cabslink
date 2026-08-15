import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden: admin access required");
}

/** Resolve a Place ID to lat/lng so geo matching works without a second admin step. */
async function withCoords<T extends { place_id?: string | null; lat?: number | null; lng?: number | null }>(
  ctx: { supabase: any },
  row: T,
): Promise<T> {
  if (!row.place_id) return { ...row, lat: null, lng: null };
  if (row.lat != null && row.lng != null) return row;
  const { resolveCoords } = await import("@/lib/place-coords.server");
  const map = await resolveCoords(ctx.supabase as any, [row.place_id]);
  const c = map.get(row.place_id);
  return { ...row, lat: c?.lat ?? null, lng: c?.lng ?? null };
}

const geoScope = z.enum(["pickup", "destination", "either"]);
const serviceTypes = z.array(z.string().trim().min(1).max(60)).nullable().optional();
const dow = z.array(z.number().int().min(0).max(6)).nullable().optional();
const nullableStr = z.string().trim().max(2000).nullable().optional();

// =================================================================
// Location pricing rules
// =================================================================
const locationRuleSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(160),
  vehicle_class_id: z.string().uuid().nullable().optional(),
  price_type: z.enum(["fixed", "base"]).default("fixed"),
  price: z.number().min(0),
  included_distance_miles: z.number().min(0).default(0),
  extra_per_mile: z.number().min(0).default(0),
  place_id: z.string().trim().min(1).nullable().optional(),
  place_label: z.string().trim().max(300).nullable().optional(),
  radius_miles: z.number().min(0).max(200).default(5),
  scope: geoScope.default("either"),
  priority: z.number().int().min(0).max(1000).default(100),
  notes: nullableStr,
  active: z.boolean().default(true),
});

export const listLocationPricingRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("location_pricing_rules")
      .select("*, vehicle_class:vehicle_classes(id, name)")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertLocationPricingRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => locationRuleSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload: any = await withCoords(context, {
      ...data,
      place_id: data.place_id || null,
      place_label: data.place_label || null,
      vehicle_class_id: data.vehicle_class_id || null,
      notes: data.notes || null,
    });
    if (payload.id) {
      const { id, ...patch } = payload;
      const { error } = await context.supabase.from("location_pricing_rules").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: created, error } = await context.supabase
      .from("location_pricing_rules").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: created?.id };
  });

export const deleteLocationPricingRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("location_pricing_rules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =================================================================
// Pricing modifiers (surge / discount / event uplift)
// =================================================================
const modifierSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(160),
  modifier_type: z.enum(["percent", "fixed"]).default("percent"),
  value: z.number(),
  stackable: z.boolean().default(false),
  vehicle_class_id: z.string().uuid().nullable().optional(),
  service_types: serviceTypes,
  date_from: z.string().nullable().optional(),
  date_to: z.string().nullable().optional(),
  days_of_week: dow,
  time_from: z.string().nullable().optional(),
  time_to: z.string().nullable().optional(),
  place_id: z.string().trim().min(1).nullable().optional(),
  place_label: z.string().trim().max(300).nullable().optional(),
  radius_miles: z.number().min(0).max(200).nullable().optional(),
  scope: geoScope.default("either"),
  priority: z.number().int().min(0).max(1000).default(100),
  notes: nullableStr,
  active: z.boolean().default(true),
});

export const listPricingModifiers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("pricing_modifiers")
      .select("*, vehicle_class:vehicle_classes(id, name)")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertPricingModifier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => modifierSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload: any = await withCoords(context, {
      ...data,
      place_id: data.place_id || null,
      place_label: data.place_label || null,
      vehicle_class_id: data.vehicle_class_id || null,
      service_types: data.service_types?.length ? data.service_types : null,
      days_of_week: data.days_of_week?.length ? data.days_of_week : null,
      date_from: data.date_from || null,
      date_to: data.date_to || null,
      time_from: data.time_from || null,
      time_to: data.time_to || null,
      radius_miles: data.place_id ? (data.radius_miles ?? 10) : null,
      notes: data.notes || null,
    });
    if (payload.id) {
      const { id, ...patch } = payload;
      const { error } = await context.supabase.from("pricing_modifiers").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: created, error } = await context.supabase
      .from("pricing_modifiers").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: created?.id };
  });

export const deletePricingModifier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("pricing_modifiers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =================================================================
// Availability rules (block / allow)
// =================================================================
const availabilitySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(160),
  rule_scope: z.enum(["global", "service", "vehicle_class", "vehicle", "route", "location"]).default("global"),
  effect: z.enum(["block", "allow"]).default("block"),
  vehicle_id: z.string().uuid().nullable().optional(),
  vehicle_class_id: z.string().uuid().nullable().optional(),
  service_types: serviceTypes,
  date_from: z.string().nullable().optional(),
  date_to: z.string().nullable().optional(),
  days_of_week: dow,
  time_from: z.string().nullable().optional(),
  time_to: z.string().nullable().optional(),
  place_id: z.string().trim().min(1).nullable().optional(),
  place_label: z.string().trim().max(300).nullable().optional(),
  radius_miles: z.number().min(0).max(200).nullable().optional(),
  to_place_id: z.string().trim().min(1).nullable().optional(),
  to_place_label: z.string().trim().max(300).nullable().optional(),
  to_radius_miles: z.number().min(0).max(200).nullable().optional(),
  scope: geoScope.default("either"),
  priority: z.number().int().min(0).max(1000).default(100),
  reason: nullableStr,
  customer_message: z.string().trim().max(400).nullable().optional(),
  active: z.boolean().default(true),
});

export const listAvailabilityRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("availability_rules")
      .select("*, vehicle_class:vehicle_classes(id, name), vehicle:vehicles(id, name)")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertAvailabilityRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => availabilitySchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.rule_scope === "vehicle" && !data.vehicle_id) throw new Error("Pick a vehicle for a vehicle-scoped rule.");
    if (data.rule_scope === "vehicle_class" && !data.vehicle_class_id) throw new Error("Pick a vehicle class for a class-scoped rule.");
    if (data.rule_scope === "service" && !data.service_types?.length) throw new Error("Pick at least one service type for a service-scoped rule.");
    if (data.rule_scope === "location" && !data.place_id) throw new Error("Pick a location for a location-scoped rule.");
    if (data.rule_scope === "route" && (!data.place_id || !data.to_place_id)) throw new Error("Pick both a from and a to location for a route rule.");

    const payload: any = await withCoords(context, {
      ...data,
      place_id: data.place_id || null,
      place_label: data.place_label || null,
      vehicle_id: data.rule_scope === "vehicle" ? data.vehicle_id || null : null,
      vehicle_class_id: data.rule_scope === "vehicle_class" ? data.vehicle_class_id || null : null,
      service_types: data.service_types?.length ? data.service_types : null,
      days_of_week: data.days_of_week?.length ? data.days_of_week : null,
      date_from: data.date_from || null,
      date_to: data.date_to || null,
      time_from: data.time_from || null,
      time_to: data.time_to || null,
      radius_miles: data.place_id ? (data.radius_miles ?? 10) : null,
      to_place_id: data.rule_scope === "route" ? data.to_place_id || null : null,
      to_place_label: data.rule_scope === "route" ? data.to_place_label || null : null,
      to_radius_miles: data.rule_scope === "route" ? (data.to_radius_miles ?? 10) : null,
      reason: data.reason || null,
      customer_message: data.customer_message || null,
    });
    if (payload.to_place_id) {
      const { resolveCoords } = await import("@/lib/place-coords.server");
      const map = await resolveCoords(context.supabase as any, [payload.to_place_id]);
      const c = map.get(payload.to_place_id);
      payload.to_lat = c?.lat ?? null;
      payload.to_lng = c?.lng ?? null;
    } else {
      payload.to_lat = null;
      payload.to_lng = null;
    }
    if (payload.id) {
      const { id, ...patch } = payload;
      const { error } = await context.supabase.from("availability_rules").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: created, error } = await context.supabase
      .from("availability_rules").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: created?.id };
  });

export const deleteAvailabilityRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("availability_rules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
