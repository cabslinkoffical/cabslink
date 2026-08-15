/**
 * Loads the canonical Extras catalogue (with class overrides) for the pricing
 * engine. Read-only, public-safe data.
 */
import type { ExtrasCatalogue } from "@/lib/extras-pricing";

export async function loadExtrasCatalogue(client: any): Promise<ExtrasCatalogue> {
  const [extras, links] = await Promise.all([
    client.from("extras").select("key, price_pence, active, applies_to_all_classes, id").eq("active", true),
    client.from("extra_vehicle_classes").select("extra_id, vehicle_class_id, price_pence"),
  ]);
  if (extras.error) throw new Error(extras.error.message);

  const byId = new Map<string, ExtrasCatalogue[number]>();
  for (const e of (extras.data ?? []) as any[]) {
    byId.set(String(e.id), {
      key: String(e.key),
      active: !!e.active,
      price_pence: Math.max(0, Number(e.price_pence) || 0),
      applies_to_all_classes: !!e.applies_to_all_classes,
      class_prices: {},
    });
  }
  for (const l of ((links.data ?? []) as any[])) {
    const entry = byId.get(String(l.extra_id));
    if (!entry) continue;
    entry.class_prices[String(l.vehicle_class_id)] =
      l.price_pence === null || l.price_pence === undefined ? null : Math.max(0, Number(l.price_pence) || 0);
  }
  return [...byId.values()];
}
