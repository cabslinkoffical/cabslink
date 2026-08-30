/**
 * Public Extras catalogue for the booking flow.
 *
 * The admin Extras section is the single source of truth: every active extra
 * that applies to the chosen vehicle class is offered on the booking Extras
 * step, priced with the class override when one exists.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { resolveExtra, type ExtrasCatalogue } from "@/lib/extras-pricing";

export type PublicExtra = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  price_pence: number;
  price_basis: "per_unit" | "per_booking" | "per_hour";
  max_quantity: number;
};

export const listPublicExtras = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ classId: z.string().uuid().nullable().optional() }).parse(d ?? {}))
  .handler(async ({ data }): Promise<PublicExtra[]> => {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const [extras, links] = await Promise.all([
      client
        .from("extras")
        .select("id, key, name, description, price_pence, price_basis, max_quantity, applies_to_all_classes, active, sort_order")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      client.from("extra_vehicle_classes").select("extra_id, vehicle_class_id, price_pence"),
    ]);
    if (extras.error) return [];

    const rows = (extras.data ?? []) as any[];
    const catalogue: ExtrasCatalogue = rows.map((e) => ({
      key: String(e.key),
      active: true,
      price_pence: Math.max(0, Number(e.price_pence) || 0),
      applies_to_all_classes: !!e.applies_to_all_classes,
      class_prices: Object.fromEntries(
        ((links.data ?? []) as any[])
          .filter((l) => String(l.extra_id) === String(e.id))
          .map((l) => [String(l.vehicle_class_id), l.price_pence == null ? null : Number(l.price_pence)]),
      ),
    }));

    return rows.flatMap((e) => {
      const resolved = resolveExtra(catalogue, String(e.key), data.classId ?? null, 0);
      if (!resolved.available) return [];
      return [{
        id: String(e.id),
        key: String(e.key),
        name: String(e.name),
        description: e.description ?? null,
        price_pence: resolved.pence,
        price_basis: (e.price_basis ?? "per_unit") as PublicExtra["price_basis"],
        max_quantity: Math.max(1, Number(e.max_quantity) || 1),
      }];
    });
  });
