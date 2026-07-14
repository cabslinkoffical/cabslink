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
import { getRequestIP, setResponseStatus } from "@tanstack/react-start/server";
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
    .from("site_settings")
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

export const calculateMultiStopQuote = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<MultiStopQuoteResult> => {
    const ip = (() => {
      try {
        return getRequestIP() ?? "0.0.0.0";
      } catch {
        return "0.0.0.0";
      }
    })();
    const rl = checkLimit(
      { name: "multi-stop-quote", windowMs: 60_000, max: 30 },
      ip,
    );
    if (!rl.ok) {
      setResponseStatus(429);
      throw new Error("Too many quote requests, please slow down.");
    }

    const thresholds = await loadThresholds();
    if (data.stops.length > thresholds.maxSelectedStops) {
      throw new Error(`Please select at most ${thresholds.maxSelectedStops} stops.`);
    }
    // Reject consecutive duplicates
    for (let i = 1; i < data.stops.length; i++) {
      if (data.stops[i].place_id === data.stops[i - 1].place_id) {
        throw new Error("The same stop cannot appear twice in a row.");
      }
    }

    const poiFees = await loadPoiFeesByPlaceId(data.stops.map((s) => s.place_id));

    // Compute direct route AND with-stops route in parallel.
    const [direct, withStops] = await Promise.all([
      realDistanceMiles(data.pickup_place_id, data.destination_place_id, []),
      data.stops.length === 0
        ? Promise.resolve({ miles: 0, minutes: 0 })
        : realDistanceMiles(
            data.pickup_place_id,
            data.destination_place_id,
            data.stops.map((s) => s.place_id),
          ),
    ]);
    const effective = data.stops.length === 0 ? direct : withStops;

    const drivingSeconds = Math.round(effective.minutes * 60);
    const plannedStopSeconds = data.stops.reduce(
      (sum, s) => sum + Math.max(0, s.minutes) * 60,
      0,
    );
    const totalJourneySeconds = drivingSeconds + plannedStopSeconds;
    const detourMiles = round2(Math.max(0, effective.miles - direct.miles));
    const detourSeconds = Math.max(0, drivingSeconds - Math.round(direct.minutes * 60));

    // Classification
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

    // Template lookup (optional; drives scenic/tour fee)
    const client = serverPublicClient();
    const template = await findMatchingTemplate(
      client,
      data.pickup_place_id,
      data.destination_place_id,
    );
    const scenicFeePence =
      classification.service_type === "sightseeing_transfer" ||
      classification.service_type === "private_tour"
        ? Number(template?.tour_fee_pence ?? 0)
        : 0;

    // Stop-charge lines (per vehicle they're identical — POI-driven only)
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

    // Per-vehicle authoritative pricing
    const [profiles, areaSurcharges, fixed, settings] = await Promise.all([
      loadActiveProfiles(publicClient()),
      loadAreaSurcharges(
        publicClient(),
        data.pickup_label,
        data.destination_label,
        { pickupPlaceId: data.pickup_place_id, dropoffPlaceId: data.destination_place_id },
      ),
      loadFixedPriceForRoute(publicClient(), data.pickup_place_id, data.destination_place_id),
      loadQuoteSettings(publicClient()),
    ]);

    const fixedByVehicle = new Map<string, number>();
    let fixedAny: number | null = null;
    for (const r of fixed) {
      if (r.vehicle_id) fixedByVehicle.set(r.vehicle_id, r.price);
      else if (fixedAny === null) fixedAny = r.price;
    }

    const targetProfiles = data.vehicle_id
      ? profiles.filter((p) => p.vehicle.id === data.vehicle_id)
      : profiles;

    const fingerprint = await stopsFingerprint({
      pickupPlaceId: data.pickup_place_id,
      destinationPlaceId: data.destination_place_id,
      routeMode: data.route_mode,
      stops: data.stops.map((s) => ({ place_id: s.place_id, minutes: s.minutes })),
    });

    const vehicles: MultiStopVehicleQuote[] = targetProfiles.map((p) => {
      const fixedPrice = fixedByVehicle.get(p.vehicle.id) ?? fixedAny;
      const q = computeVehicleQuote({
        profile: p,
        distanceMiles: effective.miles,
        viaStops: 0, // stop economics live in stop_charges, not via_price
        pickupTime: data.pickup_time,
        areaSurcharges,
        fixedPrice,
        settings,
      });
      // Add stop-charge lines on top of the engine's final_total.
      const perVehicle = round2(q.perVehicleTotal + stopCharges.addedTotal);
      const finalTotal = round2(perVehicle);
      const snap = {
        ...q.snapshot,
        engine_version: ENGINE_VERSION,
        route_mode: data.route_mode,
        service_type: classification.service_type,
        original_service_type: "direct_transfer",
        classification_reason: classification.reason,
        planned_stop_duration_seconds: plannedStopSeconds,
        driving_duration_seconds: drivingSeconds,
        total_journey_seconds: totalJourneySeconds,
        direct_distance_miles: direct.miles,
        direct_duration_seconds: Math.round(direct.minutes * 60),
        with_stops_distance_miles: effective.miles,
        detour_miles: detourMiles,
        detour_seconds: detourSeconds,
        selected_pois: data.stops,
        stops_fingerprint: fingerprint,
        scenic_template_id: template?.id ?? null,
        stop_fee_total: stopCharges.stopFeeTotal,
        stop_time_total: stopCharges.stopTimeTotal,
        parking_total: stopCharges.parkingTotal,
        scenic_fee: stopCharges.scenicFee,
        per_vehicle_total: perVehicle,
        final_total: finalTotal,
      };
      return {
        vehicle_id: p.vehicle.id,
        vehicle_name: p.vehicle.name,
        final_total: finalTotal,
        per_vehicle_total: perVehicle,
        currency: settings.currency,
        currency_symbol: settings.currencySymbol,
        breakdown: [...q.breakdown, ...stopCharges.breakdown],
        snapshot: snap,
      };
    });

    return {
      engine_version: ENGINE_VERSION,
      route_mode: data.route_mode,
      service_type: classification.service_type,
      original_service_type: "direct_transfer",
      classification_reason: classification.reason,
      attraction_stops: classification.attraction_stops,
      planned_attraction_minutes: classification.planned_attraction_minutes,
      direct_distance_miles: direct.miles,
      direct_duration_seconds: Math.round(direct.minutes * 60),
      with_stops_distance_miles: effective.miles,
      driving_duration_seconds: drivingSeconds,
      planned_stop_duration_seconds: plannedStopSeconds,
      total_journey_seconds: totalJourneySeconds,
      detour_miles: detourMiles,
      detour_seconds: detourSeconds,
      stops_fingerprint: fingerprint,
      template_id: template?.id ?? null,
      template_slug: template?.slug ?? null,
      tour_fee_pence: Number(template?.tour_fee_pence ?? 0),
      vehicles,
      errors: [],
    };
  });
