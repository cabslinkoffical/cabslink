/**
 * Staff tools for ready-made tours: categories, copying a tour into a new
 * draft, the step-by-step create/edit screen and the draft preview. Every
 * handler checks the admin role; multi-table saves run in one admin-checked
 * database routine so a failed step leaves the tour unchanged.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { placeIdSchema } from "@/lib/place-id";
import { tourDraftSchema } from "@/lib/tour-draft";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden: admin access required");
}

const friendly = (e: any): Error => {
  const msg = String(e?.message ?? "");
  if (e?.code === "23505" && /slug/.test(msg)) return new Error("That web address is already used by another tour.");
  if (e?.code === "23505" && /tour_categories/.test(msg)) return new Error("A category with that name already exists.");
  if (e?.code === "23503" && /theme_group/.test(msg)) return new Error("Choose a category from the list.");
  return new Error(msg || "Something went wrong. Please try again.");
};

// ---------------- Categories ----------------

export const listTourCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const sb = context.supabase as any;
    const [cats, tours] = await Promise.all([
      sb.from("tour_categories").select("id, name, description, sort_order, active").order("sort_order").order("name"),
      sb.from("scenic_route_templates").select("theme_group, published"),
    ]);
    if (cats.error) throw new Error(cats.error.message);
    if (tours.error) throw new Error(tours.error.message);
    const counts = new Map<string, { total: number; live: number }>();
    for (const t of (tours.data ?? []) as any[]) {
      if (!t.theme_group) continue;
      const c = counts.get(t.theme_group) ?? { total: 0, live: 0 };
      c.total += 1;
      if (t.published) c.live += 1;
      counts.set(t.theme_group, c);
    }
    return ((cats.data ?? []) as any[]).map((c) => ({ ...c, tours: counts.get(c.name) ?? { total: 0, live: 0 } }));
  });

export const saveTourCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid().nullable().optional(),
    name: z.string().trim().min(2, "Give the category a name.").max(60),
    description: z.string().trim().max(300).nullable().optional(),
    sort_order: z.coerce.number().int().min(0).max(1000).default(0),
    active: z.boolean().default(true),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const sb = context.supabase as any;
    const row = { name: data.name, description: data.description || null, sort_order: data.sort_order, active: data.active };
    // Renaming updates every tour in the category through the database link.
    const res = data.id
      ? await sb.from("tour_categories").update(row).eq("id", data.id)
      : await sb.from("tour_categories").insert(row);
    if (res.error) throw friendly(res.error);
    return { ok: true };
  });

export const deleteTourCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    // Tours in the category become uncategorised; they are never deleted.
    const res = await (context.supabase as any).from("tour_categories").delete().eq("id", data.id);
    if (res.error) throw friendly(res.error);
    return { ok: true };
  });

// ---------------- Copy a tour ----------------

export const duplicateTour = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const res = await (context.supabase as any).rpc("admin_duplicate_tour", { p_id: data.id });
    if (res.error || !res.data) throw friendly(res.error);
    return { id: String(res.data) };
  });

// ---------------- Step-by-step create / edit ----------------

export const getTourDraft = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const sb = context.supabase as any;
    const [tpl, stops, prices] = await Promise.all([
      sb.from("scenic_route_templates").select("*").eq("id", data.id).maybeSingle(),
      sb.from("scenic_route_template_pois")
        .select("poi_id, stop_order, mandatory, default_selected, recommended_visit_minutes, points_of_interest(id, name, active, place_id, recommended_visit_minutes)")
        .eq("route_template_id", data.id).order("stop_order"),
      sb.from("template_fixed_prices").select("vehicle_class_id, price").eq("route_template_id", data.id),
    ]);
    for (const r of [tpl, stops, prices]) if (r.error) throw new Error(r.error.message);
    if (!tpl.data) throw new Error("This tour no longer exists.");
    return { tour: tpl.data as any, stops: (stops.data ?? []) as any[], prices: (prices.data ?? []) as any[] };
  });

/** Everything the step-by-step screen picks from: stops library, vehicles, categories, hire lengths. */
export const getTourBuilderOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const sb = context.supabase as any;
    const [pois, classes, cats, tiers] = await Promise.all([
      sb.from("points_of_interest").select("id, name, category, active, place_id, recommended_visit_minutes, image_url").order("name"),
      sb.from("vehicle_classes").select("id, name, active, display_order").eq("active", true).order("display_order"),
      sb.from("tour_categories").select("name, active, sort_order").order("sort_order").order("name"),
      sb.from("tour_hour_tiers").select("hours, included_miles, is_bookable").order("hours"),
    ]);
    for (const r of [pois, classes, cats, tiers]) if (r.error) throw new Error(r.error.message);
    return {
      pois: (pois.data ?? []) as any[],
      classes: (classes.data ?? []) as any[],
      categories: ((cats.data ?? []) as any[]).filter((c) => c.active).map((c) => c.name as string),
      tiers: (tiers.data ?? []) as any[],
    };
  });

export const saveTourDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => tourDraftSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const res = await (context.supabase as any).rpc("admin_save_tour_draft", {
      p_id: data.id ?? null,
      p_tour: data.tour,
      p_stops: data.stops ?? null,
      p_prices: data.prices ?? null,
    });
    if (res.error || !res.data) throw friendly(res.error);
    return { id: String(res.data) };
  });

// ---------------- Draft preview ----------------

export const getTourPreview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { getTourDetailImpl } = await import("@/lib/tours.functions");
    const sb = context.supabase as any;
    const [detail, state] = await Promise.all([
      getTourDetailImpl(sb, { id: data.id }),
      sb.from("scenic_route_templates").select("published, active").eq("id", data.id).maybeSingle(),
    ]);
    if (!detail) throw new Error("This tour no longer exists.");
    return { detail, live: !!state.data?.published && !!state.data?.active };
  });

export { placeIdSchema as _tourPlaceIdSchema };
