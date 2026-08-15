/**
 * Pricing Scheme admin API.
 *
 * A "Pricing Scheme" is the pricing scope of ONE vehicle class. It is not a new
 * pricing system: it is a UI/API projection over the canonical rows the
 * authoritative engine already reads —
 *
 *   vehicle_pricing_profiles + vehicle_mileage_tiers  → base + mileage bands
 *   hourly_rates                                      → time pricing
 *   pricing_rules            (vehicle_class_id)        → fixed routes
 *   location_pricing_rules   (vehicle_class_id)        → location/zone pricing
 *   discount_rules           (vehicle_class_ids)       → radius discounts
 *   pricing_modifiers        (vehicle_class_id)        → date/day/time modifiers
 *
 * Every mutation here writes those same rows, so admin preview, public quote,
 * checkout and booking all keep resolving through `computeVehicleQuote`.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden: admin access required");
}

async function coordsFor(ctx: { supabase: any }, placeIds: Array<string | null | undefined>) {
  const ids = placeIds.filter((p): p is string => !!p);
  if (ids.length === 0) return new Map<string, { lat: number; lng: number }>();
  const { resolveCoords } = await import("@/lib/place-coords.server");
  return await resolveCoords(ctx.supabase as any, ids);
}

const uuid = z.string().uuid();
const money = z.coerce.number().min(0).max(1_000_000);
const miles = z.coerce.number().min(0).max(500);

// ===================================================================
// Scheme list + single scheme aggregate
// ===================================================================

export const listPricingSchemes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [classes, profiles, routes, locations, modifiers, discounts] = await Promise.all([
      context.supabase
        .from("vehicle_classes")
        .select("id, name, slug, active, display_order, pricing_vehicle_id, quote_on_request")
        .order("display_order", { ascending: true }),
      context.supabase.from("vehicle_pricing_profiles").select("id, vehicle_id, base_price, status"),
      context.supabase.from("pricing_rules").select("id, vehicle_class_id, active"),
      context.supabase.from("location_pricing_rules").select("id, vehicle_class_id, active"),
      context.supabase.from("pricing_modifiers").select("id, vehicle_class_id, active"),
      context.supabase.from("discount_rules").select("id, vehicle_class_ids, active"),
    ]);
    if (classes.error) throw new Error(classes.error.message);

    const profileByVehicle = new Map(((profiles.data ?? []) as any[]).map((p) => [p.vehicle_id, p]));
    const count = (rows: any[] | null, classId: string) =>
      (rows ?? []).filter((r) => r.vehicle_class_id === classId).length;

    return ((classes.data ?? []) as any[]).map((c) => {
      const profile = c.pricing_vehicle_id ? profileByVehicle.get(c.pricing_vehicle_id) : null;
      return {
        id: c.id as string,
        name: c.name as string,
        slug: c.slug as string,
        active: !!c.active,
        quoteOnRequest: !!c.quote_on_request,
        pricingVehicleId: (c.pricing_vehicle_id as string) ?? null,
        basePrice: profile ? Number(profile.base_price) : null,
        pricingLive: profile ? !!profile.status : false,
        counts: {
          routes: count(routes.data as any[], c.id),
          locations: count(locations.data as any[], c.id),
          modifiers: count(modifiers.data as any[], c.id),
          discounts: ((discounts.data ?? []) as any[]).filter((d) =>
            Array.isArray(d.vehicle_class_ids) && d.vehicle_class_ids.includes(c.id)).length,
        },
      };
    });
  });

export const getPricingScheme = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ classId: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: cls, error: cErr } = await context.supabase
      .from("vehicle_classes")
      .select("id, name, slug, active, pricing_vehicle_id, quote_on_request")
      .eq("id", data.classId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!cls) throw new Error("That pricing scheme no longer exists.");

    const vehicleId = (cls as any).pricing_vehicle_id as string | null;

    const [profileRes, routesRes, locationsRes, modifiersRes, discountsRes, hourlyRes] = await Promise.all([
      vehicleId
        ? context.supabase.from("vehicle_pricing_profiles").select("*").eq("vehicle_id", vehicleId).maybeSingle()
        : Promise.resolve({ data: null, error: null } as any),
      context.supabase.from("pricing_rules").select("*").eq("vehicle_class_id", data.classId).order("priority", { ascending: false }),
      context.supabase.from("location_pricing_rules").select("*").eq("vehicle_class_id", data.classId).order("priority", { ascending: false }),
      context.supabase.from("pricing_modifiers").select("*").eq("vehicle_class_id", data.classId).order("priority", { ascending: false }),
      context.supabase.from("discount_rules").select("*").contains("vehicle_class_ids", [data.classId]).order("priority", { ascending: false }),
      vehicleId
        ? context.supabase.from("hourly_rates").select("*").eq("vehicle_id", vehicleId).maybeSingle()
        : Promise.resolve({ data: null, error: null } as any),
    ]);

    const profile: any = profileRes?.data ?? null;
    let tiers: any[] = [];
    if (profile?.id) {
      const t = await context.supabase
        .from("vehicle_mileage_tiers")
        .select("*")
        .eq("pricing_profile_id", profile.id)
        .order("sort_order", { ascending: true });
      tiers = (t.data ?? []) as any[];
    }

    return {
      scheme: {
        classId: (cls as any).id as string,
        name: (cls as any).name as string,
        slug: (cls as any).slug as string,
        active: !!(cls as any).active,
        quoteOnRequest: !!(cls as any).quote_on_request,
        pricingVehicleId: vehicleId,
      },
      base: {
        profileId: (profile?.id as string) ?? null,
        cityFixedPrice: Number(profile?.base_price ?? 0),
        cityIncludedMiles: Number(profile?.city_included_miles ?? 0),
        additionalPickupFee: Number(profile?.via_price ?? 0),
        waitingFeePerMinute: Number(profile?.waiting_fee_per_minute ?? 0),
        airportPickupFee: Number(profile?.airport_pickup_fee ?? 0),
        connectingJobDiscountPercent: Number(profile?.connecting_job_discount_percent ?? 0),
        live: profile ? !!profile.status : false,
        finalTierOpenEnded: !!profile?.final_tier_open_ended,
        tiers: tiers.map((t) => ({
          tierName: t.tier_name as string,
          miles: Number(t.miles),
          costPerMile: Number(t.cost_per_mile),
          sortOrder: Number(t.sort_order),
        })),
      },
      time: {
        pricePerHour: Number((hourlyRes?.data as any)?.price_per_hour ?? 0),
        minHours: Number((hourlyRes?.data as any)?.min_hours ?? 3),
        maxHours: Number((hourlyRes?.data as any)?.max_hours ?? 12),
        dailyPrice: Number((hourlyRes?.data as any)?.daily_price ?? 0),
        includedHoursPerDay: Number((hourlyRes?.data as any)?.included_hours_per_day ?? 0),
        includedMilesPerDay: Number((hourlyRes?.data as any)?.included_miles_per_day ?? 0),
        extraMileRate: Number((hourlyRes?.data as any)?.extra_mile_rate ?? 0),
        active: !!(hourlyRes?.data as any)?.active,
      },
      routes: (routesRes.data ?? []) as any[],
      locations: (locationsRes.data ?? []) as any[],
      modifiers: (modifiersRes.data ?? []) as any[],
      discounts: (discountsRes.data ?? []) as any[],
    };
  });

// ===================================================================
// Overview / base
// ===================================================================

const overviewSchema = z.object({
  /** The vehicle class is the only pricing identity accepted here. */
  classId: uuid,
  finalTierOpenEnded: z.boolean().default(false),
  cityFixedPrice: money,
  cityIncludedMiles: miles,
  bands: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        miles: miles,
        perMile: money,
      }),
    )
    .max(30)
    .default([]),
  additionalPickupFee: money,
  waitingFeePerMinute: money,
  airportPickupFee: money,
  connectingJobDiscountPercent: z.coerce.number().min(0).max(100),
  pricePerHour: money,
  minHours: z.coerce.number().int().min(1).max(24),
  maxHours: z.coerce.number().int().min(1).max(48),
  dailyPrice: money.default(0),
  includedHoursPerDay: z.coerce.number().min(0).max(24).default(0),
  includedMilesPerDay: miles.default(0),
  extraMileRate: money.default(0),
  hourlyActive: z.boolean().default(false),
  live: z.boolean().default(true),
});

/**
 * Writes the Overview tab into the canonical rows.
 *
 * City fixed price → `base_price`, with a leading zero-rate mileage tier of
 * `cityIncludedMiles` so the first N miles cost nothing extra. Short / medium /
 * long become the following consecutive mileage bands — exactly the bands the
 * existing engine already consumes, so no second formula is introduced.
 */
export const saveSchemeOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => overviewSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.maxHours < data.minHours) throw new Error("Maximum hours must be at least the minimum hours.");

    // The vehicle class is authoritative and is the only identity sent. One
    // all-or-nothing database routine resolves/creates the internal
    // compatibility pricing record, links it to the class, and writes the
    // profile, mileage bands and hourly/day rates in a single transaction, so a
    // failure anywhere leaves the previous pricing (and link) untouched.
    const { data: profileId, error } = await (context.supabase as any).rpc("save_pricing_scheme_base", {
      _payload: {
        class_id: data.classId,
        base_price: data.cityFixedPrice,
        city_included_miles: data.cityIncludedMiles,
        via_price: data.additionalPickupFee,
        waiting_fee_per_minute: data.waitingFeePerMinute,
        airport_pickup_fee: data.airportPickupFee,
        connecting_job_discount_percent: data.connectingJobDiscountPercent,
        final_tier_open_ended: data.finalTierOpenEnded,
        status: data.live,
        bands: data.bands.map((b) => ({ name: b.name, miles: b.miles, per_mile: b.perMile })),
        price_per_hour: data.pricePerHour,
        min_hours: data.minHours,
        max_hours: data.maxHours,
        daily_price: data.dailyPrice > 0 ? data.dailyPrice : null,
        included_hours_per_day: data.includedHoursPerDay > 0 ? data.includedHoursPerDay : null,
        included_miles_per_day: data.includedMilesPerDay > 0 ? data.includedMilesPerDay : null,
        extra_mile_rate: data.extraMileRate > 0 ? data.extraMileRate : null,
        hourly_active: data.hourlyActive,
      },
    });
    if (error) throw new Error(error.message);

    return { ok: true, profileId: profileId as string };
  });

// ===================================================================
// Routes (fixed route rules scoped to the scheme)
// ===================================================================

const routeSchema = z.object({
  id: uuid.optional(),
  classId: uuid,
  from_place_id: z.string().trim().min(1).max(300),
  from_place_label: z.string().trim().min(1).max(500),
  from_radius_miles: miles.default(0),
  to_place_id: z.string().trim().min(1).max(300),
  to_place_label: z.string().trim().min(1).max(500),
  to_radius_miles: miles.default(0),
  price: money,
  bidirectional: z.boolean().default(true),
  priority: z.coerce.number().int().min(0).max(1000).default(100),
  notes: z.string().trim().max(1000).nullable().optional(),
  active: z.boolean().default(true),
});

export const upsertSchemeRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => routeSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.from_place_id === data.to_place_id) throw new Error("Start and end must be different locations.");

    const coords = await coordsFor(context, [data.from_place_id, data.to_place_id]);
    const from = coords.get(data.from_place_id);
    const to = coords.get(data.to_place_id);
    if (!from || !to) throw new Error("Could not resolve coordinates for both locations. Re-select them and try again.");

    const { data: cls } = await context.supabase
      .from("vehicle_classes").select("pricing_vehicle_id").eq("id", data.classId).maybeSingle();

    const payload: any = {
      vehicle_class_id: data.classId,
      vehicle_id: (cls as any)?.pricing_vehicle_id ?? null,
      from_address: data.from_place_label,
      to_address: data.to_place_label,
      from_place_id: data.from_place_id,
      to_place_id: data.to_place_id,
      from_place_label: data.from_place_label,
      to_place_label: data.to_place_label,
      from_lat: from.lat,
      from_lng: from.lng,
      to_lat: to.lat,
      to_lng: to.lng,
      from_radius_miles: data.from_radius_miles,
      to_radius_miles: data.to_radius_miles,
      price: data.price,
      currency: "GBP",
      // One bidirectional record — never a duplicated reverse row.
      // `bidirectional` is canonical; `valid_for_return` kept in sync for legacy readers.
      bidirectional: data.bidirectional,
      valid_for_return: data.bidirectional,
      priority: data.priority,
      notes: data.notes || null,
      active: data.active,
    };

    if (data.id) {
      const { error } = await context.supabase.from("pricing_rules").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: created, error } = await context.supabase.from("pricing_rules").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: (created as any)?.id as string };
  });

export const deleteSchemeRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("pricing_rules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Deterministic pre-save conflict report: which other rules in this scheme
 * would also match the same pickup/destination pair, and which one wins.
 */
export const previewRouteConflicts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      classId: uuid,
      excludeId: uuid.optional(),
      from_place_id: z.string().trim().min(1),
      to_place_id: z.string().trim().min(1),
      from_radius_miles: miles.default(0),
      to_radius_miles: miles.default(0),
      price: money,
      priority: z.coerce.number().int().min(0).max(1000).default(100),
      bidirectional: z.boolean().default(true),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const coords = await coordsFor(context, [data.from_place_id, data.to_place_id]);
    const from = coords.get(data.from_place_id);
    const to = coords.get(data.to_place_id);
    if (!from || !to) return { winner: null as any, conflicts: [] as any[], resolved: false };

    const { data: rows } = await context.supabase
      .from("pricing_rules")
      .select("*")
      .eq("vehicle_class_id", data.classId)
      .eq("active", true);

    const { matchFixedRoute, detectFixedRouteConflicts } = await import("@/lib/pricing-rules");

    const candidate: any = {
      id: data.excludeId ?? "__candidate__",
      vehicle_id: null,
      vehicle_class_id: data.classId,
      price: data.price,
      from_place_id: data.from_place_id,
      to_place_id: data.to_place_id,
      from_lat: from.lat, from_lng: from.lng, to_lat: to.lat, to_lng: to.lng,
      from_radius_miles: data.from_radius_miles,
      to_radius_miles: data.to_radius_miles,
      // `bidirectional` is canonical; `valid_for_return` kept in sync for legacy readers.
      bidirectional: data.bidirectional,
      valid_for_return: data.bidirectional,
      priority: data.priority,
      valid_from: null, valid_to: null, active: true,
    };

    const others = ((rows ?? []) as any[])
      .filter((r) => r.id !== data.excludeId)
      .map((r) => ({
        id: r.id,
        vehicle_id: r.vehicle_id,
        vehicle_class_id: r.vehicle_class_id,
        price: Number(r.price),
        from_place_id: r.from_place_id,
        to_place_id: r.to_place_id,
        from_lat: r.from_lat, from_lng: r.from_lng, to_lat: r.to_lat, to_lng: r.to_lng,
        from_radius_miles: Number(r.from_radius_miles ?? 0),
        to_radius_miles: Number(r.to_radius_miles ?? 0),
        bidirectional: !!r.bidirectional,
        priority: Number(r.priority ?? 100),
        valid_from: r.valid_from, valid_to: r.valid_to, active: !!r.active,
        _label: `${r.from_place_label ?? r.from_address} → ${r.to_place_label ?? r.to_address}`,
      }));

    const result = matchFixedRoute([candidate, ...others] as any, {
      pickupPlaceId: data.from_place_id,
      destinationPlaceId: data.to_place_id,
      pickupCoord: from,
      destinationCoord: to,
      vehicleClassId: data.classId,
      distanceMiles: 0,
    } as any);

    const label = (id: string) =>
      id === candidate.id ? "This rule" : (others.find((o) => o.id === id) as any)?._label ?? id;

    return {
      resolved: true,
      winner: result.match
        ? { id: result.match.rule.id, label: label(result.match.rule.id), kind: result.match.kind, price: result.match.price, isCandidate: result.match.rule.id === candidate.id }
        : null,
      overlapping: result.candidates
        .filter((c) => c.rule.id !== candidate.id)
        .map((c) => ({ id: c.rule.id, label: label(c.rule.id), kind: c.kind, price: c.price, priority: Number(c.rule.priority ?? 100) })),
      ties: detectFixedRouteConflicts(result.candidates).map((c) => ({ id: c.rule.id, label: label(c.rule.id), price: c.price })),
    };
  });

// ===================================================================
// Discounts (radius discounts scoped to the scheme)
// ===================================================================

const discountSchema = z.object({
  id: uuid.optional(),
  classId: uuid,
  name: z.string().trim().min(2).max(160),
  place_id: z.string().trim().min(1).max(300),
  place_label: z.string().trim().min(1).max(500),
  radius_miles: z.coerce.number().min(0.1).max(200),
  value: z.coerce.number().min(0).max(100),
  priority: z.coerce.number().int().min(0).max(1000).default(100),
  stackable: z.boolean().default(false),
  notes: z.string().trim().max(1000).nullable().optional(),
  active: z.boolean().default(true),
});

export const upsertSchemeDiscount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => discountSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const coords = await coordsFor(context, [data.place_id]);
    const c = coords.get(data.place_id);
    if (!c) throw new Error("Could not resolve coordinates for that location. Re-select it and try again.");

    const payload: any = {
      name: data.name,
      basis: "radius",
      discount_type: "percent",
      value: data.value,
      place_id: data.place_id,
      place_label: data.place_label,
      lat: c.lat,
      lng: c.lng,
      radius_miles: data.radius_miles,
      // Discounts apply to journeys STARTING inside the radius.
      scope: "pickup",
      vehicle_class_ids: [data.classId],
      priority: data.priority,
      stackable: data.stackable,
      notes: data.notes || null,
      active: data.active,
    };

    if (data.id) {
      const { error } = await context.supabase.from("discount_rules").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: created, error } = await context.supabase.from("discount_rules").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: (created as any)?.id as string };
  });

export const deleteSchemeDiscount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("discount_rules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===================================================================
// Modifiers (date / day / time uplifts scoped to the scheme)
// ===================================================================

const modifierSchema = z.object({
  id: uuid.optional(),
  classId: uuid,
  name: z.string().trim().min(2).max(160),
  modifier_type: z.enum(["percent", "fixed"]).default("percent"),
  value: z.coerce.number().min(-100_000).max(100_000),
  date_from: z.string().trim().min(1).nullable().optional(),
  date_to: z.string().trim().min(1).nullable().optional(),
  days_of_week: z.array(z.coerce.number().int().min(0).max(6)).default([]),
  time_from: z.string().trim().min(1).nullable().optional(),
  time_to: z.string().trim().min(1).nullable().optional(),
  service_types: z.array(z.string().trim().min(1).max(60)).default([]),
  priority: z.coerce.number().int().min(0).max(1000).default(100),
  stackable: z.boolean().default(true),
  notes: z.string().trim().max(1000).nullable().optional(),
  active: z.boolean().default(true),
});

export const upsertSchemeModifier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => modifierSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.date_from && data.date_to && data.date_to < data.date_from) {
      throw new Error("The end date must be on or after the start date.");
    }
    const payload: any = {
      vehicle_class_id: data.classId,
      name: data.name,
      modifier_type: data.modifier_type,
      value: data.value,
      scope: "journey",
      date_from: data.date_from || null,
      date_to: data.date_to || null,
      days_of_week: data.days_of_week.length ? data.days_of_week : null,
      time_from: data.time_from || null,
      time_to: data.time_to || null,
      service_types: data.service_types.length ? data.service_types : null,
      priority: data.priority,
      stackable: data.stackable,
      notes: data.notes || null,
      active: data.active,
    };
    if (data.id) {
      const { error } = await context.supabase.from("pricing_modifiers").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: created, error } = await context.supabase.from("pricing_modifiers").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: (created as any)?.id as string };
  });

export const deleteSchemeModifier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("pricing_modifiers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===================================================================
// Locations (zone pricing scoped to the scheme)
// ===================================================================

const locationSchema = z.object({
  id: uuid.optional(),
  classId: uuid,
  name: z.string().trim().min(2).max(160),
  place_id: z.string().trim().min(1).max(300),
  place_label: z.string().trim().min(1).max(500),
  radius_miles: z.coerce.number().min(0.1).max(200),
  scope: z.enum(["pickup", "dropoff", "either"]).default("either"),
  price: money,
  included_distance_miles: miles.default(0),
  extra_per_mile: money.default(0),
  priority: z.coerce.number().int().min(0).max(1000).default(100),
  notes: z.string().trim().max(1000).nullable().optional(),
  active: z.boolean().default(true),
});

export const upsertSchemeLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => locationSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const coords = await coordsFor(context, [data.place_id]);
    const c = coords.get(data.place_id);
    if (!c) throw new Error("Could not resolve coordinates for that location. Re-select it and try again.");

    const payload: any = {
      vehicle_class_id: data.classId,
      name: data.name,
      place_id: data.place_id,
      place_label: data.place_label,
      lat: c.lat,
      lng: c.lng,
      radius_miles: data.radius_miles,
      scope: data.scope,
      price_type: "fixed",
      price: data.price,
      included_distance_miles: data.included_distance_miles,
      extra_per_mile: data.extra_per_mile,
      priority: data.priority,
      notes: data.notes || null,
      active: data.active,
    };
    if (data.id) {
      const { error } = await context.supabase.from("location_pricing_rules").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: created, error } = await context.supabase.from("location_pricing_rules").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: (created as any)?.id as string };
  });

export const deleteSchemeLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("location_pricing_rules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
