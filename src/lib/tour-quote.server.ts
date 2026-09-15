/**
 * Server-only tour quoting. The browser may show a price, but this file is the
 * only thing that decides one: config comes from the database, the loop is
 * measured with the real driving route, and money is computed by the shared
 * pure engine in `tour-quote.ts`.
 */
import { computeRoute } from "@/lib/route-distance.server";
import { resolveCoords } from "@/lib/place-coords.server";
import {
  buildQuote,
  addHoursOptions,
  bookableTiers,
  dwellFloor,
  type AddHoursOption,
  type ClassRates,
  type HourTier,
  type TourQuote,
  type TourRules,
} from "@/lib/tour-quote";

export type TourStopInput = {
  poiId?: string | null;
  placeId: string;
  name: string;
  dwellMinutes?: number | null;
};

export type TourQuoteInput = {
  mode: "premade" | "custom";
  templateId?: string | null;
  startPlaceId: string;
  startLabel: string;
  endPlaceId?: string | null;
  endLabel?: string | null;
  hours: number;
  vehicleClassId: string;
  passengers: number;
  luggage: number;
  stops: TourStopInput[];
};

export type TourQuoteResult = {
  quote: TourQuote;
  addHours: AddHoursOption[];
  currency: "GBP";
  tierHours: number[];
  vehicleName: string;
};

const DEFAULT_RULES: TourRules = {
  earliest_start_time: "07:00",
  latest_finish_time: "22:00",
  max_bookable_hours: 12,
  minimum_stop_minutes: 10,
  pickup_buffer_minutes: 30,
  mileage_tolerance_miles: 10,
  minimum_notice_hours: 12,
  checkout_hold_minutes: 30,
  allow_same_day: true,
  same_day_cutoff_time: "12:00",
  poi_radius_factor: 0.5,
};

export type TourConfig = {
  tiers: HourTier[];
  rules: TourRules;
  classes: ClassRates[];
};

export async function loadTourConfig(): Promise<TourConfig> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [tiers, rules, classes, hourly, profiles, mileage] = await Promise.all([
    supabaseAdmin.from("tour_hour_tiers").select("hours, included_miles, is_bookable").order("sort_order"),
    supabaseAdmin.from("tour_rules").select("*").limit(1).maybeSingle(),
    supabaseAdmin
      .from("vehicle_classes")
      .select(
        "id, name, hourly_rate, extra_hour_rate, extra_mile_rate, min_hours, max_hours, max_passengers, max_luggage, passengers, large_luggage, pricing_vehicle_id, active",
      ),
    // Tour rates are optional: when a class has none, fall back to the hourly
    // hire rate and mileage rate already configured for that vehicle, so a
    // tour is never priced at zero or shown as "price on request".
    supabaseAdmin
      .from("hourly_rates")
      .select("vehicle_class_id, price_per_hour, min_hours, max_hours, active")
      .eq("active", true),
    supabaseAdmin.from("vehicle_pricing_profiles").select("id, vehicle_id"),
    supabaseAdmin.from("vehicle_mileage_tiers").select("pricing_profile_id, cost_per_mile, sort_order"),
  ]);

  const hourlyByClass = new Map<string, any>();
  for (const h of (hourly.data ?? []) as any[]) {
    if (h.vehicle_class_id && !hourlyByClass.has(h.vehicle_class_id)) hourlyByClass.set(h.vehicle_class_id, h);
  }
  const profileByVehicle = new Map<string, string>();
  for (const p of (profiles.data ?? []) as any[]) {
    if (p.vehicle_id) profileByVehicle.set(p.vehicle_id, p.id);
  }
  const mileByProfile = new Map<string, number>();
  for (const t of ((mileage.data ?? []) as any[]).slice().sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))) {
    if (t.pricing_profile_id && t.cost_per_mile != null) mileByProfile.set(t.pricing_profile_id, Number(t.cost_per_mile));
  }

  const r: any = rules.data;
  return {
    tiers: ((tiers.data ?? []) as any[]).map((t) => ({
      hours: Number(t.hours),
      included_miles: Number(t.included_miles),
      is_bookable: !!t.is_bookable,
    })),
    rules: r
      ? {
          earliest_start_time: String(r.earliest_start_time).slice(0, 5),
          latest_finish_time: String(r.latest_finish_time).slice(0, 5),
          max_bookable_hours: Number(r.max_bookable_hours),
          minimum_stop_minutes: Number(r.minimum_stop_minutes),
          pickup_buffer_minutes: Number(r.pickup_buffer_minutes),
          mileage_tolerance_miles: Number(r.mileage_tolerance_miles),
          minimum_notice_hours: Number(r.minimum_notice_hours),
          checkout_hold_minutes: Number(r.checkout_hold_minutes),
          allow_same_day: r.allow_same_day !== false,
          same_day_cutoff_time: String(r.same_day_cutoff_time ?? "12:00").slice(0, 5),
          poi_radius_factor: Number(r.poi_radius_factor ?? 0.5) || 0.5,
        }
      : DEFAULT_RULES,
    classes: ((classes.data ?? []) as any[])
      .filter((c) => c.active !== false)
      .map((c) => {
        const h = hourlyByClass.get(c.id);
        const profileId = c.pricing_vehicle_id ? profileByVehicle.get(c.pricing_vehicle_id) : undefined;
        const mile = profileId ? mileByProfile.get(profileId) : undefined;
        const num = (v: unknown) => (v == null ? null : Number(v));
        const hourlyRate = num(c.hourly_rate) ?? num(h?.price_per_hour);
        return {
          id: c.id,
          name: c.name,
          hourly_rate: hourlyRate,
          extra_hour_rate: num(c.extra_hour_rate) ?? hourlyRate,
          extra_mile_rate: num(c.extra_mile_rate) ?? (mile ?? null),
          min_hours: num(c.min_hours) ?? num(h?.min_hours),
          max_hours: num(c.max_hours) ?? num(h?.max_hours),
          max_passengers: num(c.max_passengers) ?? num(c.passengers),
          max_luggage: num(c.max_luggage) ?? num(c.large_luggage),
        };
      }),
  };
}

/** Straight-line miles, used only for estimated stop-insertion costs. */
export function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Road miles are longer than the crow flies; this is the usual Scottish factor. */
const ROAD_FACTOR = 1.28;
const AVG_MPH = 34;

/**
 * Measure the loop: start → stops in order → finish. Cached driving data is
 * reused; if the routing service is unavailable we fall back to a straight-line
 * estimate so the customer still sees a figure, flagged as estimated.
 */
export async function measureLoop(input: {
  startPlaceId: string;
  endPlaceId: string;
  stopPlaceIds: string[];
}): Promise<{ miles: number; driveMinutes: number; estimated: boolean }> {
  const { startPlaceId, endPlaceId, stopPlaceIds } = input;
  try {
    if (stopPlaceIds.length === 0 && startPlaceId === endPlaceId) {
      return { miles: 0, driveMinutes: 0, estimated: false };
    }
    // A loop back to the same place: pickup → every stop in order → back to the
    // pickup, measured in ONE Routes call so the miles equal the drawn route.
    const sameStart = startPlaceId === endPlaceId;
    if (sameStart && stopPlaceIds.length > 0) {
      const res = await computeRoute({
        originPlaceId: startPlaceId,
        destinationPlaceId: startPlaceId,
        waypointPlaceIds: stopPlaceIds,
        allowLoop: true,
      });
      return {
        miles: res.distanceMiles,
        driveMinutes: res.durationSeconds / 60,
        estimated: false,
      };
    }
    const res = await computeRoute({
      originPlaceId: startPlaceId,
      destinationPlaceId: endPlaceId,
      waypointPlaceIds: stopPlaceIds,
    });
    return { miles: res.distanceMiles, driveMinutes: res.durationSeconds / 60, estimated: false };
  } catch {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ids = [startPlaceId, ...stopPlaceIds, endPlaceId];
    const coords = await resolveCoords(supabaseAdmin as any, ids);
    let miles = 0;
    for (let i = 1; i < ids.length; i++) {
      const a = coords.get(ids[i - 1]!);
      const b = coords.get(ids[i]!);
      if (a && b) miles += haversineMiles(a, b) * ROAD_FACTOR;
    }
    return { miles, driveMinutes: (miles / AVG_MPH) * 60, estimated: true };
  }
}

async function templateSettings(templateId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [tpl, prices, pois] = await Promise.all([
    supabaseAdmin
      .from("scenic_route_templates")
      .select(
        "id, name, slug, is_bookable, default_duration_hours, min_duration_hours, max_duration_hours, included_miles, start_mode, fixed_start_address, origin_place_id, destination_place_id",
      )
      .eq("id", templateId)
      .maybeSingle(),
    supabaseAdmin.from("template_fixed_prices").select("vehicle_class_id, price").eq("route_template_id", templateId),
    supabaseAdmin
      .from("scenic_route_template_pois")
      .select("poi_id, stop_order, mandatory, default_selected")
      .eq("route_template_id", templateId)
      .order("stop_order"),
  ]);
  return { tpl: tpl.data as any, prices: (prices.data ?? []) as any[], pois: (pois.data ?? []) as any[] };
}

/** Dwell minutes for the chosen stops, defaulting to the rules floor. */
async function dwellFor(stops: TourStopInput[], rules: TourRules): Promise<number[]> {
  const poiIds = stops.map((s) => s.poiId).filter((v): v is string => !!v);
  let map = new Map<string, number>();
  if (poiIds.length) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const res: any = await supabaseAdmin
      .from("points_of_interest")
      .select("id, recommended_visit_minutes, minimum_visit_minutes")
      .in("id", poiIds);
    map = new Map(
      ((res.data ?? []) as any[]).map((p) => [
        p.id as string,
        Number(p.recommended_visit_minutes ?? p.minimum_visit_minutes ?? rules.minimum_stop_minutes),
      ]),
    );
  }
  // Never below the admin minimum: the customer may stay longer, never shorter.
  return stops.map((s) =>
    dwellFloor(s.dwellMinutes ?? (s.poiId ? map.get(s.poiId) : null), rules),
  );
}

export async function quoteTourImpl(input: TourQuoteInput): Promise<TourQuoteResult> {
  const config = await loadTourConfig();
  const rates = config.classes.find((c) => c.id === input.vehicleClassId);
  if (!rates) throw new Error("Choose a vehicle for your tour.");

  const tiers = bookableTiers(config.tiers, config.rules);
  const endPlaceId = input.endPlaceId || input.startPlaceId;

  let fixedPrice: number | null = null;
  let baseHours = input.hours;
  let templateIncludedMiles: number | null = null;
  let startPlaceId = input.startPlaceId;

  if (input.mode === "premade" && input.templateId) {
    const { tpl, prices } = await templateSettings(input.templateId);
    if (!tpl) throw new Error("That tour is not available to book online.");
    const price = prices.find((p) => p.vehicle_class_id === input.vehicleClassId);
    fixedPrice = price ? Number(price.price) : null;
    baseHours = Number(tpl.default_duration_hours ?? input.hours);
    templateIncludedMiles = tpl.included_miles == null ? null : Number(tpl.included_miles);
    if (tpl.start_mode === "fixed" && tpl.origin_place_id) startPlaceId = tpl.origin_place_id;
    // No fixed price set for this vehicle yet: price the day on the hourly
    // model instead of blocking the booking.

  }

  const loop = await measureLoop({
    startPlaceId,
    endPlaceId,
    stopPlaceIds: input.stops.map((s) => s.placeId),
  });
  const dwellMinutes = await dwellFor(input.stops, config.rules);

  const quote = buildQuote({
    mode: input.mode,
    hours: input.hours,
    baseHours,
    fixedPrice,
    rates,
    tiers,
    rules: config.rules,
    templateIncludedMiles,
    routeMiles: loop.miles,
    driveMinutes: loop.driveMinutes,
    dwellMinutes,
    vehicleLabel: rates.name,
  });

  return {
    quote,
    addHours: addHoursOptions({
      current: quote,
      tiers,
      rules: config.rules,
      rates,
      mode: input.mode,
      dwellMinutes,
    }),
    currency: "GBP",
    tierHours: tiers.map((t) => t.hours),
    vehicleName: rates.name,
  };
}

export type TourPoiSuggestion = {
  id: string;
  name: string;
  placeId: string;
  category: string | null;
  shortDescription: string | null;
  imageUrl: string | null;
  recommendedMinutes: number;
  /** Estimated road miles from the pickup point. */
  milesFromStart: number;
  /** Estimated miles for the loop out and back to the pickup point. */
  roundTripMiles: number;
  /** True when the loop to this stop alone sits inside the mileage allowance. */
  withinAllowance: boolean;
  /** Where the suggestion came from: our own tour list, or found live on the map. */
  source: "curated" | "map";
  lat?: number;
  lng?: number;
};

/**
 * Curated stops the customer can reach inside the mileage that comes with the
 * hours they chose. Anything further out is still offered, flagged as extra
 * mileage, because customers may happily pay for the longer run.
 */
export async function tourPoiSuggestionsImpl(args: {
  startPlaceId: string;
  includedMiles: number;
  limit: number;
  /** Admin-set share of the allowance used as the search radius (default half). */
  radiusFactor?: number;
}): Promise<{ suggestions: TourPoiSuggestion[]; includedMiles: number; measured: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const rows: any = await supabaseAdmin
    .from("points_of_interest")
    .select(
      "id, name, place_id, category, short_description, image_url, recommended_visit_minutes, minimum_visit_minutes, latitude, longitude, featured, active",
    )
    .eq("active", true)
    .limit(500);

  const pois = ((rows.data ?? []) as any[]).filter((p) => p.place_id);
  const coords = await resolveCoords(supabaseAdmin as any, [args.startPlaceId]);
  const from = coords.get(args.startPlaceId);

  const mapped: any[] = pois.map((p) => {
    const lat = p.latitude == null ? null : Number(p.latitude);
    const lng = p.longitude == null ? null : Number(p.longitude);
    const legMiles =
      from && lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
        ? haversineMiles(from, { lat, lng }) * ROAD_FACTOR
        : null;
    const round = legMiles == null ? null : legMiles * 2;
    return {
      id: p.id as string,
      name: p.name as string,
      placeId: p.place_id as string,
      category: p.category ?? null,
      shortDescription: p.short_description ?? null,
      imageUrl: p.image_url ?? null,
      recommendedMinutes: Number(p.recommended_visit_minutes ?? p.minimum_visit_minutes ?? 30),
      milesFromStart: legMiles == null ? 0 : Math.round(legMiles),
      roundTripMiles: round == null ? 0 : Math.round(round),
      withinAllowance: round == null ? true : round <= args.includedMiles,
      source: "curated" as const,
      lat: lat ?? undefined,
      lng: lng ?? undefined,
      _sort: round ?? Number.POSITIVE_INFINITY,
      _featured: !!p.featured,
    };
  });

  // Live map discovery: attractions inside the driving radius the hours pay for.
  // The allowance is a round trip, so the furthest a stop can sit is half of it.
  if (from) {
    const { discoverNearbyPlaces } = await import("@/lib/tour-discovery.server");
    const factor = args.radiusFactor && args.radiusFactor > 0 ? args.radiusFactor : 0.5;
    const radiusMiles = Math.max(3, (args.includedMiles * factor) / ROAD_FACTOR);
    const found = await discoverNearbyPlaces({ centre: from, radiusMiles, limit: 20 });
    const seen = new Set(mapped.map((m) => m.placeId));
    for (const place of found) {
      if (seen.has(place.placeId)) continue;
      if (place.reviewCount < 25) continue;
      seen.add(place.placeId);
      const legMiles = haversineMiles(from, { lat: place.lat, lng: place.lng }) * ROAD_FACTOR;
      const round = legMiles * 2;
      mapped.push({
        id: `map:${place.placeId}`,
        name: place.name,
        placeId: place.placeId,
        category: place.category,
        shortDescription:
          place.rating != null
            ? `${place.rating.toFixed(1)}★ from ${place.reviewCount.toLocaleString("en-GB")} visitor reviews`
            : null,
        imageUrl: null,
        recommendedMinutes: 45,
        milesFromStart: Math.round(legMiles),
        roundTripMiles: Math.round(round),
        withinAllowance: round <= args.includedMiles,
        source: "map" as const,
        lat: place.lat,
        lng: place.lng,
        _sort: round,
        _featured: false,
      });
    }
  }

  mapped.sort((a, b) => {
    if (a.withinAllowance !== b.withinAllowance) return a.withinAllowance ? -1 : 1;
    if (a._featured !== b._featured) return a._featured ? -1 : 1;
    if (a.source !== b.source) return a.source === "curated" ? -1 : 1;
    return a._sort - b._sort;
  });

  // Keep room for map finds, otherwise a well-curated city fills every slot and
  // the customer never sees the places we found live around their pickup.
  const mapShare = Math.max(4, Math.round(args.limit / 3));
  const curated = mapped.filter((m) => m.source === "curated");
  const fromMap = mapped.filter((m) => m.source === "map");
  const chosen = fromMap.length
    ? [...curated.slice(0, Math.max(0, args.limit - Math.min(mapShare, fromMap.length))), ...fromMap.slice(0, mapShare)]
    : curated;

  return {
    suggestions: chosen
      .slice(0, args.limit)
      .sort((a, b) => {
        if (a.withinAllowance !== b.withinAllowance) return a.withinAllowance ? -1 : 1;
        return a._sort - b._sort;
      })
      .map(({ _sort, _featured, ...rest }) => rest as TourPoiSuggestion),
    includedMiles: args.includedMiles,
    measured: !!from,
  };
}

/** Remaining tours for a vehicle class on a date, honouring the daily cap. */
export async function capacityLeft(vehicleClassId: string, date: string): Promise<number | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const cap: any = await supabaseAdmin
    .from("vehicle_class_daily_capacity")
    .select("max_tours_per_day")
    .eq("vehicle_class_id", vehicleClassId)
    .maybeSingle();
  if (!cap.data) return null;
  const max = Number(cap.data.max_tours_per_day);
  const used: any = await supabaseAdmin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("service_type", "private_tour")
    .eq("vehicle_class_id", vehicleClassId)
    .eq("pickup_date", date)
    .in("status", ["new", "awaiting_payment", "pending_payment", "confirmed", "assigned", "in_progress"]);
  return Math.max(0, max - Number(used.count ?? 0));
}
