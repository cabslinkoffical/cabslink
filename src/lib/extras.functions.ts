/**
 * Canonical Extras admin API.
 *
 * ONE `extras` row per bookable add-on (child seat, meet & greet, additional
 * pickup, waiting…). Applicability is either every vehicle class
 * (`applies_to_all_classes`) or an explicit set of `extra_vehicle_classes`
 * links, each of which may override the price for that class.
 *
 * Nothing else in the admin should define an extra: pricing schemes only
 * reference these rows.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden: admin access required");
}

const pence = z.coerce.number().int().min(0).max(10_000_000);

const ExtraInput = z.object({
  id: z.string().uuid().optional(),
  key: z.string().trim().min(2).max(60).regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers and underscores"),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(600).nullable().optional(),
  price_pence: pence,
  price_basis: z.enum(["per_unit", "per_booking", "per_hour", "per_minute"]),
  max_quantity: z.coerce.number().int().min(1).max(600),
  category: z.enum(["child_seat", "meet_greet", "waiting", "other"]).default("other"),
  applies_to_all_classes: z.boolean(),
  active: z.boolean(),
  sort_order: z.coerce.number().int().min(0).max(9999),
  class_ids: z.array(z.string().uuid()).max(50).optional(),
  /** classId → override price in pence (null = use the extra's own price). */
  class_prices: z.record(z.string().uuid(), pence.nullable()).optional(),
  /** classId → customer limit for that class (null = default; 0 = not offered). */
  class_max: z.record(z.string().uuid(), z.coerce.number().int().min(0).max(600).nullable()).optional(),
});

export const listExtrasAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [extras, links, classes] = await Promise.all([
      context.supabase.from("extras").select("*").order("sort_order", { ascending: true }),
      context.supabase.from("extra_vehicle_classes").select("id, extra_id, vehicle_class_id, price_pence, max_quantity"),
      context.supabase.from("vehicle_classes").select("id, name, active").order("display_order", { ascending: true }),
    ]);
    if (extras.error) throw new Error(extras.error.message);
    if (links.error) throw new Error(links.error.message);
    if (classes.error) throw new Error(classes.error.message);
    return {
      extras: (extras.data ?? []).map((e: any) => ({
        ...e,
        class_ids: (links.data ?? []).filter((l: any) => l.extra_id === e.id).map((l: any) => l.vehicle_class_id),
        class_prices: Object.fromEntries(
          (links.data ?? [])
            .filter((l: any) => l.extra_id === e.id)
            .map((l: any) => [l.vehicle_class_id, l.price_pence ?? null]),
        ),
        class_max: Object.fromEntries(
          (links.data ?? [])
            .filter((l: any) => l.extra_id === e.id)
            .map((l: any) => [l.vehicle_class_id, l.max_quantity ?? null]),
        ),
      })),
      links: links.data ?? [],
      classes: classes.data ?? [],
    };
  });

export const upsertExtra = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ExtraInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, class_ids, class_prices, class_max, ...row } = data;
    const res = id
      ? await context.supabase.from("extras").update(row).eq("id", id).select("id").single()
      : await context.supabase.from("extras").insert(row).select("id").single();
    if (res.error) throw new Error(res.error.message);
    const extraId = res.data.id as string;

    if (class_ids) {
      const del = await context.supabase.from("extra_vehicle_classes").delete().eq("extra_id", extraId);
      if (del.error) throw new Error(del.error.message);
      // "All classes" extras keep a link row only where a class has its own price or limit.
      const ids = row.applies_to_all_classes
        ? class_ids.filter((c) => class_prices?.[c] != null || class_max?.[c] != null)
        : class_ids;
      if (ids.length) {
        const ins = await context.supabase
          .from("extra_vehicle_classes")
          .insert(ids.map((c) => ({
            extra_id: extraId,
            vehicle_class_id: c,
            price_pence: class_prices?.[c] ?? null,
            max_quantity: class_max?.[c] ?? null,
          })));
        if (ins.error) throw new Error(ins.error.message);
      }
    }
    return { id: extraId };
  });

export const setExtraActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("extras").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteExtra = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("extras").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===================================================================
// Pricing Scheme → Extras tab
// ===================================================================

/** Extras as seen by one vehicle class, with the effective price for it. */
export const listExtrasForClass = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ classId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const [extras, links] = await Promise.all([
      context.supabase.from("extras").select("*").order("sort_order", { ascending: true }),
      context.supabase
        .from("extra_vehicle_classes")
        .select("extra_id, price_pence")
        .eq("vehicle_class_id", data.classId),
    ]);
    if (extras.error) throw new Error(extras.error.message);
    if (links.error) throw new Error(links.error.message);
    const byExtra = new Map<string, number | null>((links.data ?? []).map((l: any) => [l.extra_id, l.price_pence]));
    return (extras.data ?? []).map((e: any) => ({
      id: e.id,
      key: e.key,
      name: e.name,
      description: e.description,
      price_basis: e.price_basis,
      max_quantity: e.max_quantity,
      active: e.active,
      applies_to_all_classes: e.applies_to_all_classes,
      default_price_pence: e.price_pence,
      linked: e.applies_to_all_classes || byExtra.has(e.id),
      override_price_pence: byExtra.get(e.id) ?? null,
    }));
  });

/** Attach/detach one extra to a class, optionally with a class-specific price. */
export const setClassExtra = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        classId: z.string().uuid(),
        extraId: z.string().uuid(),
        linked: z.boolean(),
        override_price_pence: pence.nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!data.linked) {
      const { error } = await context.supabase
        .from("extra_vehicle_classes")
        .delete()
        .eq("extra_id", data.extraId)
        .eq("vehicle_class_id", data.classId);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const { error } = await context.supabase.from("extra_vehicle_classes").upsert(
      {
        extra_id: data.extraId,
        vehicle_class_id: data.classId,
        price_pence: data.override_price_pence ?? null,
      },
      { onConflict: "extra_id,vehicle_class_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===================================================================
// Tax and cancellation cover — managed on the Extras page with the add-ons
// ===================================================================

const ChargeSettings = z.object({
  tax_enabled: z.boolean(),
  tax_label: z.string().trim().min(1).max(40),
  tax_percentage: z.coerce.number().min(0).max(100),
  policy_non_refundable_percent: z.coerce.number().min(0).max(100),
  policy_non_refundable_min_pence: z.coerce.number().int().min(0).max(1_000_000),
  policy_flexible_percent: z.coerce.number().min(0).max(100),
  policy_flexible_min_pence: z.coerce.number().int().min(0).max(1_000_000),
});

export const getChargeSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("site_settings")
      .select("tax_enabled, tax_label, tax_percentage, policy_non_refundable_percent, policy_non_refundable_min_pence, policy_flexible_percent, policy_flexible_min_pence")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as z.infer<typeof ChargeSettings> | null;
  });

export const updateChargeSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChargeSettings.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("site_settings").update(data).eq("id", 1);
    if (error) throw new Error(error.message);
    const { logAdminAction } = await import("@/lib/admin.functions");
    await logAdminAction(context, "charge_settings_update", "site_settings", "1", { after: data });
    return { ok: true };
  });
