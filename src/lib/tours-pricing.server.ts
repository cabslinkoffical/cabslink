/**
 * Tours starting-price calculation.
 *
 * Reuses the same authoritative pricing helpers as calculateMultiStopQuote.
 * Never called from the client — imported dynamically inside a server fn
 * handler so it stays out of the client bundle.
 */

import {
  publicClient,
  loadActiveProfiles,
  loadAreaSurcharges,
  loadFixedPriceForRoute,
  loadQuoteSettings,
  computeVehicleQuote,
  realDistanceMiles,
} from "@/lib/pricing-helpers.server";
import { computeStopCharges } from "@/lib/pricing";

export type StartingPriceResult = {
  price_pence: number;
  currency: string;
  vehicle_id: string;
  vehicle_name: string;
  direct_distance_miles: number;
  direct_duration_seconds: number;
} | null;

export async function computeStartingPriceForTemplate(templateId: string): Promise<StartingPriceResult> {
  const client = publicClient();

  const { data: template } = await client
    .from("scenic_route_templates")
    .select(
      "id, origin_place_id, origin_label, destination_place_id, destination_label, recommended_vehicle_categories, tour_fee_pence, active, published",
    )
    .eq("id", templateId)
    .maybeSingle();
  if (!template || !template.origin_place_id || !template.destination_place_id) return null;

  const { data: joinRows } = await client
    .from("scenic_route_template_pois")
    .select(
      "stop_order, default_selected, recommended, recommended_visit_minutes, points_of_interest!inner(place_id, name, stop_fee_pence, parking_fee_pence, recommended_visit_minutes, active)",
    )
    .eq("route_template_id", templateId)
    .order("stop_order", { ascending: true });

  const defaultPois = (joinRows ?? [])
    .filter((r: any) => r.default_selected && r.points_of_interest?.active)
    .map((r: any) => ({
      place_id: r.points_of_interest.place_id as string,
      name: r.points_of_interest.name as string,
      minutes: Math.max(0, Number(r.recommended_visit_minutes ?? r.points_of_interest.recommended_visit_minutes ?? 0)),
      stop_fee_pence: Number(r.points_of_interest.stop_fee_pence ?? 0),
      parking_fee_pence: Number(r.points_of_interest.parking_fee_pence ?? 0),
    }));

  let route: { miles: number; minutes: number };
  try {
    route = defaultPois.length === 0
      ? await realDistanceMiles(template.origin_place_id, template.destination_place_id, [])
      : await realDistanceMiles(
          template.origin_place_id,
          template.destination_place_id,
          defaultPois.map((s) => s.place_id),
        );
  } catch {
    return null;
  }

  const [profiles, areaSurcharges, fixed, settings] = await Promise.all([
    loadActiveProfiles(client),
    loadAreaSurcharges(client, template.origin_label ?? "", template.destination_label ?? "", {
      pickupPlaceId: template.origin_place_id,
      dropoffPlaceId: template.destination_place_id,
    }),
    loadFixedPriceForRoute(client, template.origin_place_id, template.destination_place_id),
    loadQuoteSettings(client),
  ]);

  if (profiles.length === 0) return null;

  const fixedByVehicle = new Map<string, number>();
  let fixedAny: number | null = null;
  for (const r of fixed) {
    if (r.vehicle_id) fixedByVehicle.set(r.vehicle_id, r.price);
    else if (fixedAny === null) fixedAny = r.price;
  }

  const stopCharges = computeStopCharges({
    stops: defaultPois.map((p) => ({
      name: p.name,
      minutes: p.minutes,
      stop_fee_pence: p.stop_fee_pence,
      parking_fee_pence: p.parking_fee_pence,
    })),
    includedStopMinutes: Number((settings as any).includedStopMinutes ?? 15),
    pricePerExtra15minPence: Number((settings as any).pricePerExtra15minPence ?? 500),
    scenicFeePence: Number(template.tour_fee_pence ?? 0),
  });

  let best: { total: number; profile: (typeof profiles)[number] } | null = null;
  for (const p of profiles) {
    const fixedPrice = fixedByVehicle.get(p.vehicle.id) ?? fixedAny;
    const q = computeVehicleQuote({
      profile: p,
      distanceMiles: route.miles,
      viaStops: 0,
      areaSurcharges,
      fixedPrice,
      settings,
    });
    const total = q.perVehicleTotal + stopCharges.addedTotal;
    if (!best || total < best.total) best = { total, profile: p };
  }
  if (!best) return null;

  return {
    price_pence: Math.round(best.total * 100),
    currency: settings.currency,
    vehicle_id: best.profile.vehicle.id,
    vehicle_name: best.profile.vehicle.name,
    direct_distance_miles: route.miles,
    direct_duration_seconds: Math.round(route.minutes * 60),
  };
}
