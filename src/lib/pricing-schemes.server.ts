/**
 * Server-only helpers for the Pricing Scheme admin API.
 *
 * The vehicle CLASS is the authoritative commercial/pricing entity. The
 * canonical engine tables still hang off a `vehicles` row, so we keep an
 * internal pricing record per class and create it on demand. That record is an
 * implementation detail and is never a requirement in the admin UI.
 */

export async function ensureClassPricingVehicle(classId: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: cls, error } = await supabaseAdmin
    .from("vehicle_classes")
    .select("id, name, hero_image, passengers, large_luggage, hand_luggage, display_order, active, pricing_vehicle_id")
    .eq("id", classId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!cls) throw new Error("Vehicle class not found");
  const c = cls as any;
  if (c.pricing_vehicle_id) return c.pricing_vehicle_id as string;

  const { data: created, error: insErr } = await supabaseAdmin
    .from("vehicles")
    .insert({
      name: c.name,
      category: "Executive",
      image_url: c.hero_image ?? "class",
      description: "",
      passengers: c.passengers ?? 3,
      luggage: c.large_luggage ?? 2,
      hand_luggage: c.hand_luggage ?? 0,
      display_order: c.display_order ?? 0,
      active: c.active ?? true,
    })
    .select("id")
    .single();
  if (insErr) throw new Error(insErr.message);
  const vehicleId = (created as any).id as string;
  const { error: linkErr } = await supabaseAdmin
    .from("vehicle_classes")
    .update({ pricing_vehicle_id: vehicleId })
    .eq("id", classId);
  if (linkErr) throw new Error(linkErr.message);
  return vehicleId;
}
