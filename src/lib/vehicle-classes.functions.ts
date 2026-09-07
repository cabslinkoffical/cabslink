import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PublicVehicleClass = {
  id: string;
  name: string;
  slug: string;
  hero_image: string | null;
  short_description: string | null;
  long_description: string | null;
  passengers: number;
  large_luggage: number;
  cabin_bags: number;
  hand_luggage: number;
  child_seats_supported: boolean;
  wheelchair_accessible: boolean;
  fuel_type: string;
  recommended_for: Record<string, boolean>;
  featured: boolean;
  badge: string | null;
  display_order: number;
  quote_on_request: boolean;
  pricing_vehicle_id: string | null;
  models: { id: string; name: string; manufacturer: string | null }[];
  seo_title: string | null;
  seo_description: string | null;
};

function serverPublicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const listPublicVehicleClasses = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicVehicleClass[]> => {
    const c = serverPublicClient();
    const [{ data: classes }, { data: models }, { data: vehicles }] = await Promise.all([
      c.from("vehicle_classes")
        .select(
          "id, name, slug, hero_image, short_description, long_description, passengers, large_luggage, cabin_bags, hand_luggage, child_seats_supported, wheelchair_accessible, fuel_type, recommended_for, featured, badge, display_order, quote_on_request, pricing_vehicle_id, seo_title, seo_description",
        )
        .eq("active", true)
        .order("display_order", { ascending: true }),
      c.from("vehicle_models")
        .select("id, vehicle_class_id, name, manufacturer, display_order")
        .eq("active", true)
        .order("display_order", { ascending: true }),
      c.from("vehicles").select("id, image_url").eq("active", true),
    ]);
    const modelsByClass = new Map<string, { id: string; name: string; manufacturer: string | null }[]>();
    for (const m of models ?? []) {
      const arr = modelsByClass.get(m.vehicle_class_id as string) ?? [];
      arr.push({ id: m.id, name: m.name, manufacturer: m.manufacturer });
      modelsByClass.set(m.vehicle_class_id as string, arr);
    }
    const vehImg = new Map<string, string | null>();
    for (const v of vehicles ?? []) vehImg.set(v.id, v.image_url ?? null);
    return (classes ?? []).map((k: any) => ({
      id: k.id,
      name: k.name,
      slug: k.slug,
      hero_image: k.hero_image ?? (k.pricing_vehicle_id ? vehImg.get(k.pricing_vehicle_id) ?? null : null),
      short_description: k.short_description,
      long_description: k.long_description,
      passengers: k.passengers,
      large_luggage: k.large_luggage,
      cabin_bags: k.cabin_bags,
      hand_luggage: k.hand_luggage,
      child_seats_supported: k.child_seats_supported,
      wheelchair_accessible: k.wheelchair_accessible,
      fuel_type: k.fuel_type,
      recommended_for: (k.recommended_for as Record<string, boolean>) ?? {},
      featured: k.featured,
      badge: k.badge,
      display_order: k.display_order,
      quote_on_request: k.quote_on_request,
      pricing_vehicle_id: k.pricing_vehicle_id,
      models: modelsByClass.get(k.id) ?? [],
      seo_title: k.seo_title,
      seo_description: k.seo_description,
    }));
  },
);

// -------- Admin CRUD --------
const classSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  hero_image: z.string().url().nullable().optional(),
  short_description: z.string().nullable().optional(),
  long_description: z.string().nullable().optional(),
  passengers: z.number().int().min(1),
  large_luggage: z.number().int().min(0),
  cabin_bags: z.number().int().min(0),
  hand_luggage: z.number().int().min(0),
  child_seats_supported: z.boolean(),
  wheelchair_accessible: z.boolean(),
  fuel_type: z.string(),
  recommended_for: z.record(z.string(), z.boolean()).optional().default({}),
  featured: z.boolean().default(false),
  badge: z.string().nullable().optional(),
  display_order: z.number().int().default(0),
  active: z.boolean().default(true),
  quote_on_request: z.boolean().default(false),
  pricing_vehicle_id: z.string().uuid().nullable().optional(),
  seo_title: z.string().nullable().optional(),
  seo_description: z.string().nullable().optional(),
  seo_keywords: z.string().nullable().optional(),
});

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const listVehicleClassesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: classes }, { data: models }] = await Promise.all([
      supabaseAdmin.from("vehicle_classes").select("*").order("display_order", { ascending: true }),
      supabaseAdmin.from("vehicle_models").select("*").order("display_order", { ascending: true }),
    ]);
    return { classes: classes ?? [], models: models ?? [] };
  });

export const upsertVehicleClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => classSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { id, ...patch } = data;
      const { error } = await supabaseAdmin.from("vehicle_classes").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: created, error } = await supabaseAdmin
      .from("vehicle_classes").insert(data).select("id").single();
    if (error) throw new Error(error.message);
    if (!created?.id) throw new Error("Vehicle class was saved but no id was returned.");
    return { id: created.id };
  });

export const setVehicleClassActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("vehicle_classes")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, active: data.active };
  });

export const setVehicleClassHeroImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), hero_image: z.string().url().nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("vehicle_classes")
      .update({ hero_image: data.hero_image })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Every vehicle class carries its pricing on an internal pricing record
 * (legacy `vehicles` row). Admins never manage these separately — this
 * ensures one exists for the class and returns its id.
 */
export const ensureClassPricingRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ classId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cls, error: clsErr } = await supabaseAdmin
      .from("vehicle_classes")
      .select("id, name, hero_image, passengers, large_luggage, hand_luggage, display_order, active, pricing_vehicle_id")
      .eq("id", data.classId)
      .maybeSingle();
    if (clsErr) throw new Error(clsErr.message);
    if (!cls) throw new Error("Vehicle class not found");
    const c = cls as any;
    if (c.pricing_vehicle_id) {
      await supabaseAdmin
        .from("vehicles")
        .update({
          name: c.name,
          image_url: c.hero_image ?? "",
          passengers: c.passengers ?? 3,
          luggage: c.large_luggage ?? 2,
          hand_luggage: c.hand_luggage ?? 0,
          active: c.active ?? true,
          display_order: c.display_order ?? 0,
        })
        .eq("id", c.pricing_vehicle_id);
      return { vehicleId: c.pricing_vehicle_id as string, created: false };
    }
    const { data: created, error } = await supabaseAdmin
      .from("vehicles")
      .insert({
        name: c.name,
        category: "Executive",
        image_url: c.hero_image ?? "",
        description: "",
        passengers: c.passengers ?? 3,
        luggage: c.large_luggage ?? 2,
        hand_luggage: c.hand_luggage ?? 0,
        display_order: c.display_order ?? 0,
        active: c.active ?? true,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const vehicleId = (created as any).id as string;
    const { error: linkErr } = await supabaseAdmin
      .from("vehicle_classes")
      .update({ pricing_vehicle_id: vehicleId })
      .eq("id", c.id);
    if (linkErr) throw new Error(linkErr.message);
    return { vehicleId, created: true };
  });

export const deleteVehicleClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("vehicle_classes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const modelSchema = z.object({
  id: z.string().uuid().optional(),
  vehicle_class_id: z.string().uuid(),
  name: z.string().min(1),
  manufacturer: z.string().nullable().optional(),
  active: z.boolean().default(true),
  notes: z.string().nullable().optional(),
  display_order: z.number().int().default(0),
});

export const upsertVehicleModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => modelSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { id, ...patch } = data;
      const { error } = await supabaseAdmin.from("vehicle_models").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: created, error } = await supabaseAdmin
      .from("vehicle_models").insert(data).select("id").single();
    if (error) throw new Error(error.message);
    if (!created?.id) throw new Error("Vehicle model was saved but no id was returned.");
    return { id: created.id };
  });

export const deleteVehicleModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("vehicle_models").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
