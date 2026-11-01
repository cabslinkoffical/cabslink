/**
 * Multi-stop quote server function.
 *
 * Given a pickup, destination, ordered stops (place_id + planned minutes)
 * and route mode, computes the authoritative quote per active vehicle
 * profile using the existing pricing engine, adds the stop-fee /
 * planned-time / parking / scenic-fee lines, classifies the resulting
 * service, and returns a snapshot including the stops_fingerprint. The
 * server re-verifies that fingerprint at booking creation time.
 *
 * Curated-only: the POIs used for pricing must already exist in
 * `points_of_interest` (active). Google Search Along Route is not called
 * here — this keeps per-quote cost bounded to at most 2 Routes calls
 * (direct + with-stops) and reuses the existing 10 min route cache.
 */

import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { placeIdSchema, placeLabelSchema } from "@/lib/place-id";
import {
  publicClient,
  loadActiveProfiles,
  loadAreaSurcharges,
  loadFixedPriceForRoute,
  loadQuoteSettings,
  computeVehicleQuote,
  realDistanceMiles,
} from "@/lib/pricing-helpers.server";
import { computeStopCharges, ENGINE_VERSION, type BreakdownLine } from "@/lib/pricing";
import { classifyService, type ClassificationStop } from "@/lib/classification";
import { stopsFingerprint } from "@/lib/stops-fingerprint";
import { checkLimit } from "@/lib/rate-limit.server";
import { findMatchingTemplate } from "@/lib/pois.functions";

const round2 = (n: number) => Math.round(n * 100) / 100;

const routeModeSchema = z.enum(["direct", "scenic", "optimised"]);

const stopSchema = z.object({
  place_id: placeIdSchema,
  label: placeLabelSchema,
  minutes: z.number().int().min(0).max(240),
  category: z.string().trim().max(64).optional().nullable(),
});

const inputSchema = z.object({
  pickup_place_id: placeIdSchema,
  pickup_label: placeLabelSchema,
  destination_place_id: placeIdSchema,
  destination_label: placeLabelSchema,
  pickup_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  pickup_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  stops: z.array(stopSchema).max(20),
  route_mode: routeModeSchema.default("scenic"),
  vehicle_id: z.string().uuid().optional().nullable(),
});

export type MultiStopVehicleQuote = {
  vehicle_id: string;
  vehicle_name: string;
  final_total: number;
  per_vehicle_total: number;
  currency: string;
  currency_symbol: string;
  breakdown: BreakdownLine[];
  snapshot: any;
};

export type MultiStopQuoteResult = {
  engine_version: string;
  route_mode: "direct" | "scenic" | "optimised";
  service_type: string;
  original_service_type: string;
  classification_reason: string;
  attraction_stops: number;
  planned_attraction_minutes: number;
  direct_distance_miles: number;
  direct_duration_seconds: number;
  with_stops_distance_miles: number;
  driving_duration_seconds: number;
  planned_stop_duration_seconds: number;
  total_journey_seconds: number;
  detour_miles: number;
  detour_seconds: number;
  stops_fingerprint: string;
  template_id: string | null;
  template_slug: string | null;
  tour_fee_pence: number;
  vehicles: MultiStopVehicleQuote[];
  errors: string[];
};

function serverPublicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export async function loadPoiFeesByPlaceId(placeIds: string[]) {
  if (placeIds.length === 0) return new Map<string, { stop_fee_pence: number; parking_fee_pence: number; category: string }>();
  const client = serverPublicClient();
  const { data } = await client
    .from("points_of_interest")
    .select("place_id, stop_fee_pence, parking_fee_pence, category, active")
    .in("place_id", placeIds);
  const out = new Map<string, { stop_fee_pence: number; parking_fee_pence: number; category: string }>();
  for (const row of (data ?? []) as any[]) {
    if (!row.active) continue;
    out.set(row.place_id, {
      stop_fee_pence: Number(row.stop_fee_pence ?? 0),
      parking_fee_pence: Number(row.parking_fee_pence ?? 0),
      category: String(row.category ?? "attraction"),
    });
  }
  return out;
}

export async function loadThresholds() {
  const client = serverPublicClient();
  const { data } = await client
    .from("site_settings_public" as any)
    .select(
      "sightseeing_threshold_minutes, tour_threshold_minutes, tour_threshold_stops, included_stop_minutes, price_per_extra_15min_pence, max_selected_stops",
    )
    .eq("id", 1)
    .maybeSingle();
  const r: any = data ?? {};
  return {
    sightseeingThresholdMinutes: Number(r.sightseeing_threshold_minutes ?? 30),
    tourThresholdMinutes: Number(r.tour_threshold_minutes ?? 120),
    tourThresholdStops: Number(r.tour_threshold_stops ?? 3),
    includedStopMinutes: Number(r.included_stop_minutes ?? 15),
    pricePerExtra15minPence: Number(r.price_per_extra_15min_pence ?? 500),
    maxSelectedStops: Number(r.max_selected_stops ?? 8),
  };
}

export type StopEconomicsInput = {
  pickup_place_id: string;
  destination_place_id: string;
  stops: Array<{ place_id: string; label: string; minutes: number; category?: string | null }>;
  route_mode: "direct" | "scenic" | "optimised";
};

/**
 * Stop economics shared by the customer quote and the booking re-check:
 * distances, classification, template fee and the stop/parking/time/scenic
 * charge lines. Pricing rules are applied separately by the shared
 * authoritative pipeline in pricing.functions (priceStoppedVehicle).
 */
export async function computeStopEconomics(data: StopEconomicsInput) {
  const thresholds = await loadThresholds();
  if (data.stops.length > thresholds.maxSelectedStops) {
    throw new Error(`Please select at most ${thresholds.maxSelectedStops} stops.`);
  }
  for (let i = 1; i < data.stops.length; i++) {
    if (data.stops[i].place_id === data.stops[i - 1].place_id) {
      throw new Error("The same stop cannot appear twice in a row.");
    }
  }
  const poiFees = await loadPoiFeesByPlaceId(data.stops.map((s) => s.place_id));
  const [direct, withStops] = await Promise.all([
    realDistanceMiles(data.pickup_place_id, data.destination_place_id, []),
    data.stops.length === 0
      ? Promise.resolve({ miles: 0, minutes: 0 })
      : realDistanceMiles(data.pickup_place_id, data.destination_place_id, data.stops.map((s) => s.place_id)),
  ]);
  const effective = data.stops.length === 0 ? direct : withStops;
  const drivingSeconds = Math.round(effective.minutes * 60);
  const plannedStopSeconds = data.stops.reduce((sum, s) => sum + Math.max(0, s.minutes) * 60, 0);
  const totalJourneySeconds = drivingSeconds + plannedStopSeconds;
  const detourMiles = round2(Math.max(0, effective.miles - direct.miles));
  const detourSeconds = Math.max(0, drivingSeconds - Math.round(direct.minutes * 60));

  const classificationStops: ClassificationStop[] = data.stops.map((s) => ({
    place_id: s.place_id,
    minutes: s.minutes,
    category: s.category ?? poiFees.get(s.place_id)?.category ?? null,
  }));
  const classification = classifyService(classificationStops, {
    sightseeingThresholdMinutes: thresholds.sightseeingThresholdMinutes,
    tourThresholdMinutes: thresholds.tourThresholdMinutes,
    tourThresholdStops: thresholds.tourThresholdStops,
  });

  const template = await findMatchingTemplate(serverPublicClient(), data.pickup_place_id, data.destination_place_id);
  const scenicFeePence =
    classification.service_type === "sightseeing_transfer" || classification.service_type === "private_tour"
      ? Number(template?.tour_fee_pence ?? 0)
      : 0;

  const stopCharges = computeStopCharges({
    stops: data.stops.map((s) => ({
      name: s.label,
      minutes: s.minutes,
      stop_fee_pence: poiFees.get(s.place_id)?.stop_fee_pence ?? 0,
      parking_fee_pence: poiFees.get(s.place_id)?.parking_fee_pence ?? 0,
    })),
    includedStopMinutes: thresholds.includedStopMinutes,
    pricePerExtra15minPence: thresholds.pricePerExtra15minPence,
    scenicFeePence,
  });

  const fingerprint = await stopsFingerprint({
    pickupPlaceId: data.pickup_place_id,
    destinationPlaceId: data.destination_place_id,
    routeMode: data.route_mode,
    stops: data.stops.map((s) => ({ place_id: s.place_id, minutes: s.minutes })),
  });

  return {
    thresholds, poiFees, direct, effective, drivingSeconds, plannedStopSeconds, totalJourneySeconds,
    detourMiles, detourSeconds, classification, template, stopCharges, fingerprint,
  };
}
export type StopEconomics = Awaited<ReturnType<typeof computeStopEconomics>>;

/** Stop fields merged into a pricing snapshot so it matches the saved total. */
export function stopSnapshotFields(econ: StopEconomics, routeMode: string, stops: unknown[]) {
  return {
    engine_version: ENGINE_VERSION,
    route_mode: routeMode,
    service_type: econ.classification.service_type,
    original_service_type: "direct_transfer",
    classification_reason: econ.classification.reason,
    planned_stop_duration_seconds: econ.plannedStopSeconds,
    driving_duration_seconds: econ.drivingSeconds,
    total_journey_seconds: econ.totalJourneySeconds,
    direct_distance_miles: econ.direct.miles,
    direct_duration_seconds: Math.round(econ.direct.minutes * 60),
    with_stops_distance_miles: econ.effective.miles,
    detour_miles: econ.detourMiles,
    detour_seconds: econ.detourSeconds,
    selected_pois: stops,
    stops_fingerprint: econ.fingerprint,
    scenic_template_id: econ.template?.id ?? null,
    stop_fee_total: econ.stopCharges.stopFeeTotal,
    stop_time_total: econ.stopCharges.stopTimeTotal,
    parking_total: econ.stopCharges.parkingTotal,
    scenic_fee: econ.stopCharges.scenicFee,
  };
}

export const calculateMultiStopQuote = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<MultiStopQuoteResult> => {
    const { getClientIp } = await import("@/lib/client-ip.server");
    const ip = await getClientIp();
    const { hitRateLimit, LIMITS } = await import("@/lib/db-rate-limit.server");
    if (!(await hitRateLimit(LIMITS.scenicQuote, ip))) {
      setResponseStatus(429);
      throw new Error("Too many quote requests, please slow down.");
    }

    const econ = await computeStopEconomics(data);
    // Same authoritative pipeline as the booking re-check: rule sets,
    // location/fixed pricing, surcharges, modifiers, discounts and
    // availability, plus stop economics added exactly once.
    const { computeAuthoritative, priceStoppedVehicle, PRICING_RETRY_MESSAGE } = await import("@/lib/pricing.functions");
    const { resolveAvailability } = await import("@/lib/pricing-rules");
    let auth;
    try {
      auth = await computeAuthoritative({
        pickupPlaceId: data.pickup_place_id,
        pickupLabel: data.pickup_label,
        destinationPlaceId: data.destination_place_id,
        destinationLabel: data.destination_label,
        stops: data.stops.map((s) => ({ placeId: s.place_id, label: s.label })),
        pickupDate: data.pickup_date ?? "",
        pickupTime: data.pickup_time ?? "",
        passengers: 1,
        luggage: 0,
        serviceType: undefined,
      });
    } catch (err) {
      console.error("multi-stop quote: authoritative pricing failed", err);
      throw new Error(PRICING_RETRY_MESSAGE);
    }

    const targetProfiles = data.vehicle_id
      ? auth.profiles.filter((p) => p.vehicle.id === data.vehicle_id)
      : auth.profiles;
    const snapFields = stopSnapshotFields(econ, data.route_mode, data.stops);

    const vehicles: MultiStopVehicleQuote[] = [];
    for (const p of targetProfiles) {
      const priced = priceStoppedVehicle({ auth, profile: p, stopAddedPerVehicle: econ.stopCharges.addedTotal, qty: 1 });
      if (!resolveAvailability(auth.ruleSets.availabilityRules, priced.ctx).available) continue;
      vehicles.push({
        vehicle_id: p.vehicle.id,
        vehicle_name: p.vehicle.name,
        final_total: priced.total,
        per_vehicle_total: priced.perVehicle,
        currency: auth.settings.currency,
        currency_symbol: auth.settings.currencySymbol,
        breakdown: [...priced.q.breakdown, ...econ.stopCharges.breakdown],
        snapshot: { ...priced.q.snapshot, ...snapFields, per_vehicle_total: priced.perVehicle, final_total: priced.total },
      });
    }

    return {
      engine_version: ENGINE_VERSION,
      route_mode: data.route_mode,
      service_type: econ.classification.service_type,
      original_service_type: "direct_transfer",
      classification_reason: econ.classification.reason,
      attraction_stops: econ.classification.attraction_stops,
      planned_attraction_minutes: econ.classification.planned_attraction_minutes,
      direct_distance_miles: econ.direct.miles,
      direct_duration_seconds: Math.round(econ.direct.minutes * 60),
      with_stops_distance_miles: econ.effective.miles,
      driving_duration_seconds: econ.drivingSeconds,
      planned_stop_duration_seconds: econ.plannedStopSeconds,
      total_journey_seconds: econ.totalJourneySeconds,
      detour_miles: econ.detourMiles,
      detour_seconds: econ.detourSeconds,
      stops_fingerprint: econ.fingerprint,
      template_id: econ.template?.id ?? null,
      template_slug: econ.template?.slug ?? null,
      tour_fee_pence: Number(econ.template?.tour_fee_pence ?? 0),
      vehicles,
      errors: [],
    };
  });
