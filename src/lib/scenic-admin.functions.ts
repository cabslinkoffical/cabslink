/**
 * Admin CRUD for scenic tours: POIs, route templates, and tour settings.
 * All handlers require admin role. Additive; no destructive schema changes.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { placeIdSchema } from "@/lib/place-id";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden: admin access required");
}

// ---------------- POIs ----------------

export const listPois = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("points_of_interest")
      .select("*")
      .order("admin_priority", { ascending: false })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return { pois: data ?? [] };
  });

const poiSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).max(120),
  name: z.string().min(1).max(200),
  category: z.enum([
    "attraction",
    "viewpoint",
    "castle",
    "landmark",
    "comfort_stop",
    "fuel_stop",
    "toilet_stop",
    "passenger_pickup",
  ]),
  place_id: z.string().max(300).optional().nullable(),
  short_description: z.string().max(500).optional().nullable(),
  address_label: z.string().max(300).optional().nullable(),
  image_url: z.string().max(500).optional().nullable(),
  scenic_score: z.coerce.number().min(0).max(10).default(0),
  admin_priority: z.coerce.number().int().min(0).max(100).default(0),
  featured: z.boolean().default(false),
  active: z.boolean().default(false),
  recommended_visit_minutes: z.coerce.number().int().min(15).max(240).default(30),
  minimum_visit_minutes: z.coerce.number().int().min(15).max(240).default(15),
  maximum_visit_minutes: z.coerce.number().int().min(15).max(240).default(120),
  stop_fee_pence: z.coerce.number().int().min(0).default(0),
  parking_fee_pence: z.coerce.number().int().min(0).default(0),
});

export const upsertPoi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => poiSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.active && !data.place_id) {
      throw new Error("Active POIs must have a Google Place ID.");
    }
    const payload: any = { ...data, place_id: data.place_id?.trim() || null };
    if (payload.id) {
      const { error } = await context.supabase
        .from("points_of_interest")
        .update(payload)
        .eq("id", payload.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: payload.id };
    }
    const { data: row, error } = await context.supabase
      .from("points_of_interest")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const deletePoi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("points_of_interest")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- Scenic route templates ----------------

export const listScenicTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [tpl, tplPois] = await Promise.all([
      context.supabase
        .from("scenic_route_templates")
        .select("*")
        .order("display_order", { ascending: true }),
      context.supabase
        .from("scenic_route_template_pois")
        .select("route_template_id, stop_order, default_selected, points_of_interest(id, name, active, place_id)")
        .order("stop_order", { ascending: true }),
    ]);
    if (tpl.error) throw new Error(tpl.error.message);
    if (tplPois.error) throw new Error(tplPois.error.message);
    return { templates: tpl.data ?? [], template_pois: tplPois.data ?? [] };
  });

export const setScenicTemplateActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.active) {
      // Guard: refuse to activate a template with inactive/place-less POIs.
      const { data: rows, error } = await context.supabase
        .from("scenic_route_template_pois")
        .select("points_of_interest(active, place_id, name)")
        .eq("route_template_id", data.id);
      if (error) throw new Error(error.message);
      const bad = (rows ?? [])
        .map((r: any) => r.points_of_interest)
        .filter((p: any) => !p || !p.active || !p.place_id);
      if (bad.length) {
        throw new Error(
          `Cannot activate: ${bad.length} POI(s) missing a Place ID or not active.`,
        );
      }
    }
    const { error } = await context.supabase
      .from("scenic_route_templates")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- Tour settings ----------------

const TOUR_SETTINGS_KEYS = [
  "sightseeing_threshold_minutes",
  "tour_threshold_minutes",
  "tour_threshold_stops",
  "max_selected_stops",
  "included_stop_minutes",
  "price_per_extra_15min_pence",
  "max_detour_miles",
  "max_detour_minutes",
  "poi_discovery_enabled",
] as const;

export const getTourSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("site_settings")
      .select(TOUR_SETTINGS_KEYS.join(","))
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? {};
  });

const tourSettingsSchema = z.object({
  sightseeing_threshold_minutes: z.coerce.number().int().min(10).max(240),
  tour_threshold_minutes: z.coerce.number().int().min(30).max(480),
  tour_threshold_stops: z.coerce.number().int().min(1).max(20),
  max_selected_stops: z.coerce.number().int().min(1).max(20),
  included_stop_minutes: z.coerce.number().int().min(0).max(120),
  price_per_extra_15min_pence: z.coerce.number().int().min(0).max(100000),
  max_detour_miles: z.coerce.number().min(0).max(500),
  max_detour_minutes: z.coerce.number().int().min(0).max(600),
  poi_discovery_enabled: z.boolean(),
});

export const updateTourSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => tourSettingsSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("site_settings").update(data).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Re-export for tests / typing convenience
export const _placeIdSchema = placeIdSchema;
