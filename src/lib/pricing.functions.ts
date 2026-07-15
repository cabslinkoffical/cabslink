import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, setResponseStatus } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  runPricingEngine,
  ENGINE_VERSION,
  type PricingProfile,
  type QuoteResult,
} from "@/lib/pricing";
import {
  publicClient,
  assertAdmin,
  realDistanceMiles,
  loadActiveProfiles,
  loadAreaSurcharges,
  loadFixedPriceForRoute,
  loadQuoteSettings,
  computeVehicleQuote,
  type LoadedProfile,
  type AreaSurcharge,
  type QuoteSettings,
  type PricingSnapshot,
} from "@/lib/pricing-helpers.server";
import { placeIdSchema, placeLabelSchema } from "@/lib/place-id";
import { checkLimit } from "@/lib/rate-limit.server";
import { RouteTimeoutError, RouteNotFoundError, RouteUnavailableError } from "@/lib/route-distance.server";

// -------------------------------------------------------------------
// Shared: authoritative quote computation (server-only, Place-ID input)
// -------------------------------------------------------------------
type AuthoritativeInput = {
  pickupPlaceId: string;
  pickupLabel: string;
  destinationPlaceId: string;
  destinationLabel: string;
  stops: Array<{ placeId: string; label: string }>;
  pickupTime: string;
  passengers: number;
  luggage: number;
};

type AuthoritativeQuote = {
  distanceMiles: number;
  durationMinutes: number;
  areaSurcharges: AreaSurcharge[];
  profiles: LoadedProfile[];
  fixedByVehicle: Map<string, number>;
  fixedAny: number | null;
  settings: QuoteSettings;
};

async function computeAuthoritative(inp: AuthoritativeInput): Promise<AuthoritativeQuote> {
  const client = publicClient();
  const [distance, profiles, areaSurcharges, fixed, settings] = await Promise.all([
    realDistanceMiles(inp.pickupPlaceId, inp.destinationPlaceId, inp.stops.map((s) => s.placeId)),
    loadActiveProfiles(client),
    loadAreaSurcharges(client, inp.pickupLabel, inp.destinationLabel, {
      pickupPlaceId: inp.pickupPlaceId,
      dropoffPlaceId: inp.destinationPlaceId,
    }),
    loadFixedPriceForRoute(client, inp.pickupPlaceId, inp.destinationPlaceId),
    loadQuoteSettings(client),
  ]);

  const fixedByVehicle = new Map<string, number>();
  let fixedAny: number | null = null;
  for (const r of fixed) {
    if (r.vehicle_id) fixedByVehicle.set(r.vehicle_id, r.price);
    else if (fixedAny === null) fixedAny = r.price;
  }
  return {
    distanceMiles: distance.miles,
    durationMinutes: distance.minutes,
    areaSurcharges,
    profiles,
    fixedByVehicle,
    fixedAny,
    settings,
  };
}

function mapRouteError(err: unknown): Error {
  if (err instanceof RouteTimeoutError) return new Error(err.message);
  if (err instanceof RouteNotFoundError) return new Error(err.message);
  if (err instanceof RouteUnavailableError) return new Error(err.message);
  return err instanceof Error ? err : new Error("Something went wrong. Please try again.");
}

// -------------------------------------------------------------------
// Public: calculate quotes for all vehicles (Place-ID required)
// -------------------------------------------------------------------
const stopSchema = z.object({ placeId: placeIdSchema, label: placeLabelSchema });
const bookingStopSchema = z.object({
  placeId: placeIdSchema,
  label: placeLabelSchema,
  minutes: z.number().int().min(0).max(240).optional().default(0),
  category: z.string().trim().max(64).optional().nullable(),
});

const quoteInput = z
  .object({
    pickupPlaceId: placeIdSchema,
    pickupLabel: placeLabelSchema,
    destinationPlaceId: placeIdSchema,
    destinationLabel: placeLabelSchema,
    stops: z.array(stopSchema).max(10).optional().default([]),
    pickupDate: z.string().optional().default(""),
    pickupTime: z.string().optional().default(""),
    passengers: z.number().int().min(1).max(60).optional().default(1),
    luggage: z.number().int().min(0).max(60).optional().default(0),
  })
  .refine((v) => v.pickupPlaceId !== v.destinationPlaceId, {
    message: "Pickup and destination cannot be the same location.",
    path: ["destinationPlaceId"],
  });

export type QuoteCard = {
  vehicleId: string;
  name: string;
  category: string;
  imageUrl: string;
  passengers: number;
  luggage: number;
  handLuggage: number;
  distanceMiles: number;
  finalPrice: number;
  breakdown: QuoteResult["breakdown"];
  pricing: QuoteResult;
  snapshot: PricingSnapshot;
  fixedPriceApplied: boolean;
};

export const calculateQuotes = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof quoteInput>) => quoteInput.parse(data))
  .handler(async ({ data }) => {
    // Light per-IP quote rate limit (defense-in-depth against scraping).
    let ip = "unknown";
    try { ip = getRequestIP({ xForwardedFor: true }) ?? "unknown"; } catch {}
    if (!checkLimit({ name: "quote", windowMs: 60_000, max: 30 }, ip).ok) {
      try { setResponseStatus(429); } catch {}
      throw new Error("You've made too many requests. Please wait a moment and try again.");
    }

    let auth: AuthoritativeQuote;
    try {
      auth = await computeAuthoritative({
        pickupPlaceId: data.pickupPlaceId,
        pickupLabel: data.pickupLabel,
        destinationPlaceId: data.destinationPlaceId,
        destinationLabel: data.destinationLabel,
        stops: data.stops,
        pickupTime: data.pickupTime,
        passengers: data.passengers,
        luggage: data.luggage,
      });
    } catch (err) {
      throw mapRouteError(err);
    }

    // Return ALL active vehicle profiles — the client marks under-capacity
    // vehicles with a "add more vehicles" notice and enforces qty >= minQty
    // before Book Now is enabled. Server createBooking also re-checks
    // capacity × qty, so this is safe.
    const cards: QuoteCard[] = auth.profiles
      .map((p: LoadedProfile) => {
        const fixed = auth.fixedByVehicle.get(p.vehicle.id) ?? auth.fixedAny;
        const q = computeVehicleQuote({
          profile: p,
          distanceMiles: auth.distanceMiles,
          viaStops: data.stops.length,
          pickupTime: data.pickupTime,
          areaSurcharges: auth.areaSurcharges,
          fixedPrice: fixed ?? null,
          settings: auth.settings,
          vehicleCount: 1,
        });
        return {
          vehicleId: p.vehicle.id,
          name: p.vehicle.name,
          category: p.vehicle.category,
          imageUrl: p.vehicle.image_url,
          passengers: p.vehicle.passengers,
          luggage: p.vehicle.luggage,
          handLuggage: p.vehicle.hand_luggage,
          distanceMiles: auth.distanceMiles,
          finalPrice: q.finalTotal,
          breakdown: q.breakdown,
          pricing: q.engine,
          snapshot: q.snapshot,
          fixedPriceApplied: q.fixedPriceApplied,
        };
      })
      .sort((a: QuoteCard, b: QuoteCard) => a.finalPrice - b.finalPrice);

    return {
      distanceMiles: auth.distanceMiles,
      durationMinutes: auth.durationMinutes,
      quotes: cards,
      childSeatFeePence: auth.settings.childSeatFeePence,
    };
  });

// -------------------------------------------------------------------
// Public: create booking with server-authoritative price
// -------------------------------------------------------------------
const uuidV4 = z
  .string()
  .trim()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    "Invalid idempotency key",
  );

const createBookingInput = z
  .object({
    idempotencyKey: uuidV4,
    vehicleId: z.string().uuid(),
    vehicleCount: z.number().int().min(1).max(20).optional().default(1),
    pickupPlaceId: placeIdSchema,
    pickupLabel: placeLabelSchema,
    destinationPlaceId: placeIdSchema,
    destinationLabel: placeLabelSchema,
    stops: z.array(bookingStopSchema).max(10).optional().default([]),
    routeMode: z.enum(["direct", "scenic", "optimised"]).optional(),
    stopsFingerprint: z.string().trim().regex(/^[0-9a-f]{64}$/i).optional().nullable(),
    tourConversionAckAt: z.string().datetime().optional().nullable(),
    pickupDate: z.string().trim().min(1).max(20),
    pickupTime: z.string().trim().min(1).max(10),
    passengers: z.number().int().min(1).max(200),
    luggage: z.number().int().min(0).max(200),
    customer_name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(255),
    phone: z.string().trim().min(5).max(30),
    flight_number: z.string().trim().max(20).optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
    child_seat: z.boolean().optional().default(false),
    child_seat_count: z.number().int().min(0).max(10).optional().default(0),
    meet_greet: z.boolean().optional().default(false),
    return_journey: z.boolean().optional().default(false),
  })
  .refine((v) => v.pickupPlaceId !== v.destinationPlaceId, {
    message: "Pickup and destination cannot be the same location.",
    path: ["destinationPlaceId"],
  });

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof createBookingInput>) => createBookingInput.parse(data))
  .handler(async ({ data }) => {
    // Per-IP sliding-window rate limit: 10 attempts / 10 min.
    let ip = "unknown";
    try { ip = getRequestIP({ xForwardedFor: true }) ?? "unknown"; } catch {}
    if (!checkLimit({ name: "createBooking", windowMs: 10 * 60_000, max: 10 }, ip).ok) {
      try { setResponseStatus(429); } catch {}
      throw new Error("You've made too many booking attempts. Please wait a few minutes and try again.");
    }

    // Compute canonical request fingerprint (authoritative inputs only —
    // never client-supplied price or distance).
    const { bookingRequestHash } = await import("@/lib/booking-fingerprint");
    const requestHash = await bookingRequestHash({
      pickupPlaceId: data.pickupPlaceId,
      destinationPlaceId: data.destinationPlaceId,
      stops: data.stops,
      pickupDate: data.pickupDate,
      pickupTime: data.pickupTime,
      vehicleId: data.vehicleId,
      vehicleCount: data.vehicleCount ?? 1,
      passengers: data.passengers,
      luggage: data.luggage,
      email: data.email,
      phone: data.phone,
      returnJourney: !!data.return_journey,
      meetGreet: !!data.meet_greet,
      childSeat: !!data.child_seat,
      childSeatCount: data.child_seat_count ?? 0,
    });

    // Idempotency: return existing booking ONLY if the request fingerprint
    // matches. A mismatched replay is refused with a generic conflict.
    // On matching replay we RE-DERIVE the deterministic confirmation token
    // from (id, booking_ref) so a customer whose first response was lost
    // still receives a working confirmation URL — without ever creating a
    // second booking or a duplicate notification.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { deriveConfirmationToken } = await import("@/lib/booking-confirmation.server");
    const existing = await supabaseAdmin
      .from("bookings")
      .select("id, price, booking_ref, idempotency_request_hash")
      .eq("idempotency_key", data.idempotencyKey)
      .maybeSingle();
    if (existing.data) {
      const storedHash = (existing.data as any).idempotency_request_hash as string | null;
      if (storedHash && storedHash === requestHash) {
        const eid = (existing.data as any).id as string;
        const eref = (existing.data as any).booking_ref as string;
        let recoveredToken: string | null = null;
        try {
          recoveredToken = deriveConfirmationToken(eid, eref).token;
        } catch {
          recoveredToken = null;
        }
        return {
          id: eid,
          price: Number((existing.data as any).price),
          ref: eref,
          token: recoveredToken,
        };
      }
      try { setResponseStatus(409); } catch {}
      throw new Error("This booking request conflicts with an earlier submission. Please refresh and try again.");
    }


    // Authoritative price recompute — client-supplied price/distance ignored.
    let auth: AuthoritativeQuote;
    try {
      auth = await computeAuthoritative({
        pickupPlaceId: data.pickupPlaceId,
        pickupLabel: data.pickupLabel,
        destinationPlaceId: data.destinationPlaceId,
        destinationLabel: data.destinationLabel,
        stops: data.stops,
        pickupTime: data.pickupTime,
        passengers: data.passengers,
        luggage: data.luggage,
      });
    } catch (err) {
      throw mapRouteError(err);
    }

    const profile = auth.profiles.find((p: LoadedProfile) => p.vehicle.id === data.vehicleId);
    if (!profile) throw new Error("Selected vehicle is unavailable.");
    const qty = Math.max(1, data.vehicleCount ?? 1);
    if (profile.vehicle.passengers * qty < data.passengers || profile.vehicle.luggage * qty < data.luggage) {
      throw new Error("Selected vehicles cannot fit the requested passengers/luggage.");
    }

    const fixed = auth.fixedByVehicle.get(profile.vehicle.id) ?? auth.fixedAny;
    const q = computeVehicleQuote({
      profile,
      distanceMiles: auth.distanceMiles,
      viaStops: data.stops.length,
      pickupTime: data.pickupTime,
      areaSurcharges: auth.areaSurcharges,
      fixedPrice: fixed ?? null,
      settings: auth.settings,
      vehicleCount: qty,
    });
    let price = q.finalTotal;
    const pricingSnapshot = q.snapshot;
    const pricingProfileIdSnapshot = q.profileId;

    // Child seat fee — configurable per seat, added on top of the vehicle total.
    const childSeatCount = Math.max(0, data.child_seat_count ?? 0);
    const childSeatFee = childSeatCount > 0
      ? Number(((auth.settings.childSeatFeePence * childSeatCount) / 100).toFixed(2))
      : 0;

    // ---------------------------------------------------------------
    // Multi-stop / scenic verification.
    // If the client selected timed POI stops, re-derive the stops
    // fingerprint from server-authoritative inputs and re-run the
    // service classifier. Any mismatch → 409. Tour conversion without
    // an acknowledgement → 409.
    // ---------------------------------------------------------------
    const hasTimedStops = data.stops.some((s) => (s.minutes ?? 0) > 0);
    let serverServiceType = "direct_transfer";
    let serverOriginalServiceType = "direct_transfer";
    let serverFingerprint: string | null = null;
    let plannedStopSeconds = 0;
    let selectedPoisJson: any[] = [];
    let scenicTemplateId: string | null = null;
    let scenicPrice: number | null = null;

    if (hasTimedStops) {
      const routeMode = data.routeMode ?? "scenic";
      const { stopsFingerprint } = await import("@/lib/stops-fingerprint");
      const { classifyService } = await import("@/lib/classification");
      const { loadPoiFeesByPlaceId, loadThresholds, calculateMultiStopQuote } = await import("@/lib/scenic-quote.functions");

      serverFingerprint = await stopsFingerprint({
        pickupPlaceId: data.pickupPlaceId,
        destinationPlaceId: data.destinationPlaceId,
        routeMode,
        stops: data.stops.map((s) => ({ place_id: s.placeId, minutes: s.minutes ?? 0 })),
      });
      if (data.stopsFingerprint && data.stopsFingerprint.toLowerCase() !== serverFingerprint) {
        try { setResponseStatus(409); } catch {}
        throw new Error("Your journey changed while we were preparing the booking. Please refresh your quote and try again.");
      }

      const [thresholds, poiFees] = await Promise.all([
        loadThresholds(),
        loadPoiFeesByPlaceId(data.stops.map((s) => s.placeId)),
      ]);
      const classification = classifyService(
        data.stops.map((s) => ({
          place_id: s.placeId,
          minutes: s.minutes ?? 0,
          category: s.category ?? poiFees.get(s.placeId)?.category ?? null,
        })),
        {
          sightseeingThresholdMinutes: thresholds.sightseeingThresholdMinutes,
          tourThresholdMinutes: thresholds.tourThresholdMinutes,
          tourThresholdStops: thresholds.tourThresholdStops,
        },
      );
      serverServiceType = classification.service_type;
      serverOriginalServiceType = "direct_transfer";
      plannedStopSeconds = data.stops.reduce((sum, s) => sum + Math.max(0, s.minutes ?? 0) * 60, 0);
      selectedPoisJson = data.stops.map((s) => ({
        place_id: s.placeId, label: s.label, minutes: s.minutes ?? 0, category: s.category ?? null,
      }));

      if (serverServiceType !== serverOriginalServiceType && !data.tourConversionAckAt) {
        try { setResponseStatus(409); } catch {}
        throw new Error("This journey now qualifies as a different service. Please acknowledge the change and resubmit.");
      }

      // Recompute authoritative multi-stop total for this vehicle so the
      // saved price includes stop / parking / scenic fees and any detour.
      try {
        const multi = await calculateMultiStopQuote({
          data: {
            pickup_place_id: data.pickupPlaceId,
            pickup_label: data.pickupLabel,
            destination_place_id: data.destinationPlaceId,
            destination_label: data.destinationLabel,
            pickup_time: data.pickupTime,
            stops: data.stops.map((s) => ({
              place_id: s.placeId, label: s.label,
              minutes: s.minutes ?? 0, category: s.category ?? null,
            })),
            route_mode: routeMode,
            vehicle_id: data.vehicleId,
          } as any,
        });
        const veh = multi.vehicles.find((v) => v.vehicle_id === data.vehicleId);
        if (veh) {
          scenicPrice = Number((veh.per_vehicle_total * qty).toFixed(2));
          scenicTemplateId = multi.template_id;
          price = scenicPrice;
        }
      } catch (err) {
        console.error("multi-stop verification recompute failed", err);
      }
    }

    // Add child seat fee last so it applies whether the ride is a direct
    // transfer or a scenic/multi-stop recompute.
    if (childSeatFee > 0) {
      price = Number((price + childSeatFee).toFixed(2));
    }

    const notesWithQty = qty > 1
      ? `Vehicles: ${qty} × ${profile.vehicle.name}${data.notes ? `\n\n${data.notes}` : ""}`
      : data.notes || null;

    // Server-issued booking reference (client cannot supply one).
    const refRpc: any = await supabaseAdmin.rpc("generate_booking_ref");
    if (refRpc.error) {
      console.error("generate_booking_ref failed", refRpc.error);
      throw new Error("Couldn't save your booking. Please try again.");
    }
    const bookingRef = refRpc.data as string;

    const CONFIRMATION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
    const confirmationExpires = new Date(Date.now() + CONFIRMATION_TTL_MS).toISOString();

    const capacitySnapshot = {
      passengers: profile.vehicle.passengers,
      luggage: profile.vehicle.luggage,
      hand_luggage: profile.vehicle.hand_luggage,
      vehicle_count: qty,
    };

    const insertPayload = {
      customer_name: data.customer_name,
      email: data.email,
      phone: data.phone,
      pickup_address: data.pickupLabel,
      dropoff_address: data.destinationLabel,
      pickup_place_id: data.pickupPlaceId,
      dropoff_place_id: data.destinationPlaceId,
      pickup_date: data.pickupDate,
      pickup_time: data.pickupTime,
      flight_number: data.flight_number || null,
      passengers: data.passengers,
      luggage: data.luggage,
      vehicle_type: qty > 1 ? `${qty} × ${profile.vehicle.name}` : profile.vehicle.name,
      vehicle_id: profile.vehicle.id,
      vehicle_name_snapshot: profile.vehicle.name,
      vehicle_capacity_snapshot: capacitySnapshot,
      pricing_profile_id_snapshot: pricingProfileIdSnapshot,
      pricing_snapshot: pricingSnapshot,
      engine_version: ENGINE_VERSION,
      child_seat: !!data.child_seat || childSeatCount > 0,
      child_seat_count: childSeatCount,
      meet_greet: !!data.meet_greet,
      return_journey: !!data.return_journey,
      notes: notesWithQty,
      price,
      distance_miles: auth.distanceMiles,
      idempotency_key: data.idempotencyKey,
      idempotency_request_hash: requestHash,
      status: "new",
      booking_ref: bookingRef,
      confirmation_token_expires_at: confirmationExpires,
      // Multi-stop / scenic columns — null for direct transfers.
      service_type: serverServiceType,
      original_service_type: serverOriginalServiceType,
      stops_fingerprint: serverFingerprint,
      tour_conversion_ack_at: data.tourConversionAckAt ?? null,
      planned_stop_duration_seconds: plannedStopSeconds,
      selected_pois: selectedPoisJson,
      scenic_template_id: scenicTemplateId,
      // confirmation_token_hash set immediately after we know the row id
    };

    const insertRes = await supabaseAdmin
      .from("bookings")
      .insert(insertPayload as any)
      .select("id, price, booking_ref")
      .single();

    if (insertRes.error) {
      // Unique-violation on idempotency_key → race with a concurrent submit.
      // Return the existing booking only if its stored request hash matches.
      if ((insertRes.error as any).code === "23505") {
        const again = await supabaseAdmin
          .from("bookings")
          .select("id, price, booking_ref, idempotency_request_hash")
          .eq("idempotency_key", data.idempotencyKey)
          .maybeSingle();
        if (again.data) {
          const storedHash = (again.data as any).idempotency_request_hash as string | null;
          if (storedHash && storedHash === requestHash) {
            const raceId = (again.data as any).id as string;
            const raceRef = (again.data as any).booking_ref as string;
            let recoveredToken: string | null = null;
            try { recoveredToken = deriveConfirmationToken(raceId, raceRef).token; } catch { recoveredToken = null; }
            return {
              id: raceId,
              price: Number((again.data as any).price),
              ref: raceRef,
              token: recoveredToken,
            };
          }
          try { setResponseStatus(409); } catch {}
          throw new Error("This booking request conflicts with an earlier submission. Please refresh and try again.");
        }
      }
      console.error("createBooking insert failed", insertRes.error);
      throw new Error("Couldn't save your booking. Please try again.");
    }

    const insertedId = (insertRes.data as any).id as string;

    // Derive the deterministic confirmation token now that we have the id.
    // Missing BOOKING_TOKEN_SECRET must not break booking creation — log and
    // proceed with a null token; admins can still contact the customer.
    let confirmationToken: string | null = null;
    let confirmationHash: string | null = null;
    try {
      const derived = deriveConfirmationToken(insertedId, bookingRef);
      confirmationToken = derived.token;
      confirmationHash = derived.hash;
      await supabaseAdmin
        .from("bookings")
        .update({ confirmation_token_hash: confirmationHash } as any)
        .eq("id", insertedId);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("confirmation token derivation failed", err);
    }

    // Best-effort notifications — never throw to the caller, never roll back.
    try {
      const { notifyBookingReceived, notifyAdminNewBooking } = await import("@/lib/notifications.server");
      const ctx = {
        bookingRef,
        status: "new" as const,
        paymentMode: "manual" as const,
        customerName: data.customer_name,
        customerEmail: data.email,
        customerPhone: data.phone,
        pickupAddress: data.pickupLabel,
        dropoffAddress: data.destinationLabel,
        pickupDate: data.pickupDate,
        pickupTime: data.pickupTime,
        vehicleType: insertPayload.vehicle_type,
        passengers: data.passengers,
        luggage: data.luggage,
        flightNumber: data.flight_number ?? null,
        meetGreet: !!data.meet_greet,
        childSeat: !!data.child_seat,
        returnJourney: !!data.return_journey,
        distanceMiles: auth.distanceMiles,
        price,
        notes: data.notes ?? null,
      };
      await Promise.allSettled([
        notifyBookingReceived(ctx, insertedId),
        notifyAdminNewBooking(ctx, insertedId),
      ]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("post-booking notifications failed", err);
    }

    return { id: insertedId, price, ref: bookingRef, token: confirmationToken };
  });


// -------------------------------------------------------------------
// Admin: list profiles + tiers for editing
// -------------------------------------------------------------------
export const adminListPricingProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: vehicles } = await context.supabase
      .from("vehicles")
      .select("id, name, category, image_url, passengers, luggage, hand_luggage, active, display_order")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    const { data: profiles } = await context.supabase
      .from("vehicle_pricing_profiles" as any)
      .select("*");

    const ids = (profiles ?? []).map((p: any) => p.id);
    const { data: tiers } = await context.supabase
      .from("vehicle_mileage_tiers" as any)
      .select("*")
      .in("pricing_profile_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
      .order("sort_order", { ascending: true });

    const byProfile = new Map<string, any[]>();
    for (const t of tiers ?? []) {
      const list = byProfile.get((t as any).pricing_profile_id) ?? [];
      list.push(t);
      byProfile.set((t as any).pricing_profile_id, list);
    }

    return {
      vehicles: vehicles ?? [],
      profiles: (profiles ?? []).map((p: any) => ({ ...p, tiers: byProfile.get(p.id) ?? [] })),
    };
  });

// -------------------------------------------------------------------
// Admin: save profile + tiers (upsert + replace tiers)
// -------------------------------------------------------------------
const saveInput = z
  .object({
    id: z.string().uuid().nullable().optional(),
    vehicle_id: z.string().uuid("Vehicle is required"),
    base_price: z.coerce.number().min(0, "Base price must be ≥ 0").max(100000),
    via_price: z.coerce.number().min(0, "Via price must be ≥ 0").max(100000),
    vehicle_add_price_enabled: z.boolean(),
    time_extra_from: z.string().nullable().optional(),
    time_extra_to: z.string().nullable().optional(),
    time_extra_amount: z.coerce.number().min(0).max(100000),
    time_extra_type: z.enum(["fixed", "percent"]),
    status: z.boolean(),
    tiers: z
      .array(
        z.object({
          tier_name: z.string().trim().min(1).max(80),
          miles: z.coerce.number().gt(0, "Tier miles must be > 0").max(99999),
          cost_per_mile: z.coerce.number().min(0, "Cost per mile must be ≥ 0").max(100000),
          sort_order: z.coerce.number().int().min(0).max(999),
        }),
      )
      .min(1, "At least one mileage tier is required")
      .max(20),
  })
  .refine(
    (v) => new Set(v.tiers.map((t) => t.sort_order)).size === v.tiers.length,
    { message: "Tier sort_order values must be unique", path: ["tiers"] },
  )
  .refine(
    (v) => {
      if (!v.status) return true;
      const topMiles = Math.max(0, ...v.tiers.map((t) => Number(t.miles) || 0));
      return topMiles >= 500;
    },
    {
      message: "Active profile's largest tier must cover long journeys (≥ 500 miles)",
      path: ["tiers"],
    },
  );

export const adminSavePricingProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.infer<typeof saveInput>) => saveInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { tiers, id, ...row } = data as any;

    const payload = {
      ...row,
      time_extra_from: row.time_extra_from || null,
      time_extra_to: row.time_extra_to || null,
    };

    let profileId = id as string | null | undefined;
    if (profileId) {
      const { error } = await context.supabase
        .from("vehicle_pricing_profiles" as any)
        .update(payload)
        .eq("id", profileId);
      if (error) throw new Error(error.message);
    } else {
      const { data: inserted, error } = await context.supabase
        .from("vehicle_pricing_profiles" as any)
        .upsert(payload, { onConflict: "vehicle_id" })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      profileId = (inserted as any).id;
    }

    await context.supabase
      .from("vehicle_mileage_tiers" as any)
      .delete()
      .eq("pricing_profile_id", profileId);

    const tierRows = (tiers as any[]).map((t, i) => ({
      pricing_profile_id: profileId,
      tier_name: t.tier_name,
      miles: t.miles,
      cost_per_mile: t.cost_per_mile,
      sort_order: t.sort_order ?? i + 1,
    }));
    const { error: tErr } = await context.supabase
      .from("vehicle_mileage_tiers" as any)
      .insert(tierRows);
    if (tErr) throw new Error(tErr.message);

    return { ok: true, id: profileId };
  });

// -------------------------------------------------------------------
// Admin: duplicate a profile to another vehicle
// -------------------------------------------------------------------
const duplicateInput = z.object({
  source_profile_id: z.string().uuid(),
  target_vehicle_id: z.string().uuid(),
});

export const adminDuplicatePricingProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.infer<typeof duplicateInput>) => duplicateInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: src, error: sErr } = await context.supabase
      .from("vehicle_pricing_profiles" as any)
      .select("*")
      .eq("id", data.source_profile_id)
      .single();
    if (sErr || !src) throw new Error(sErr?.message ?? "Source profile not found");

    const { data: srcTiers } = await context.supabase
      .from("vehicle_mileage_tiers" as any)
      .select("*")
      .eq("pricing_profile_id", data.source_profile_id)
      .order("sort_order");

    const { data: newProfile, error: iErr } = await context.supabase
      .from("vehicle_pricing_profiles" as any)
      .upsert(
        {
          vehicle_id: data.target_vehicle_id,
          base_price: (src as any).base_price,
          via_price: (src as any).via_price,
          vehicle_add_price_enabled: (src as any).vehicle_add_price_enabled,
          time_extra_from: (src as any).time_extra_from,
          time_extra_to: (src as any).time_extra_to,
          time_extra_amount: (src as any).time_extra_amount,
          time_extra_type: (src as any).time_extra_type,
          status: (src as any).status,
        },
        { onConflict: "vehicle_id" },
      )
      .select("id")
      .single();
    if (iErr || !newProfile) throw new Error(iErr?.message ?? "Could not create profile");

    await context.supabase
      .from("vehicle_mileage_tiers" as any)
      .delete()
      .eq("pricing_profile_id", (newProfile as any).id);

    if (srcTiers && srcTiers.length) {
      await context.supabase.from("vehicle_mileage_tiers" as any).insert(
        srcTiers.map((t: any) => ({
          pricing_profile_id: (newProfile as any).id,
          tier_name: t.tier_name,
          miles: t.miles,
          cost_per_mile: t.cost_per_mile,
          sort_order: t.sort_order,
        })),
      );
    }
    return { ok: true, id: (newProfile as any).id };
  });

// -------------------------------------------------------------------
// Admin: test calculator (no DB write)
// -------------------------------------------------------------------
const testInput = z.object({
  vehicle_id: z.string().uuid(),
  distance_miles: z.coerce.number().min(0).max(99999),
  pickup_time: z.string().optional().default(""),
  via_stops: z.coerce.number().int().min(0).max(20).optional().default(0),
});

export const adminTestQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.infer<typeof testInput>) => testInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: profile, error } = await context.supabase
      .from("vehicle_pricing_profiles" as any)
      .select("*")
      .eq("vehicle_id", data.vehicle_id)
      .single();
    if (error || !profile) throw new Error("No pricing profile for this vehicle yet.");
    const { data: tiers } = await context.supabase
      .from("vehicle_mileage_tiers" as any)
      .select("*")
      .eq("pricing_profile_id", (profile as any).id)
      .order("sort_order");

    const result = runPricingEngine(
      {
        ...(profile as any),
        tiers: (tiers ?? []).map((t: any) => ({
          tier_name: t.tier_name,
          miles: Number(t.miles),
          cost_per_mile: Number(t.cost_per_mile),
          sort_order: t.sort_order,
        })),
      } as PricingProfile,
      {
        distanceMiles: data.distance_miles,
        viaStops: data.via_stops,
        pickupTime: data.pickup_time || undefined,
      },
    );
    return result;
  });

// -------------------------------------------------------------------
// Admin: full end-to-end quote preview (runs the REAL production
// pricing pipeline, no math duplicated). Requires Place IDs so
// fixed-route rules can be matched exactly. When distanceMiles is
// omitted, computes via Google Routes API.
// -------------------------------------------------------------------
const previewInput = z.object({
  pickupPlaceId: placeIdSchema,
  pickupLabel: placeLabelSchema,
  destinationPlaceId: placeIdSchema,
  destinationLabel: placeLabelSchema,
  distanceMiles: z.coerce.number().min(0).max(99999).optional(),
  vehicleId: z.string().uuid(),
  vehicleCount: z.coerce.number().int().min(1).max(20).default(1),
  viaStops: z.coerce.number().int().min(0).max(10).default(0),
  pickupDate: z.string().max(20).optional().default(""),
  pickupTime: z.string().max(10).optional().default(""),
  discountAmount: z.coerce.number().min(0).max(100000).optional().default(0),
});

export const adminPreviewQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.infer<typeof previewInput>) => previewInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const client = publicClient();

    // Distance: prefer explicit override, else call routes API.
    let distanceMiles = data.distanceMiles ?? 0;
    let durationMinutes = 0;
    if (data.distanceMiles == null) {
      try {
        const r = await realDistanceMiles(data.pickupPlaceId, data.destinationPlaceId, []);
        distanceMiles = r.miles;
        durationMinutes = r.minutes;
      } catch (err) {
        throw mapRouteError(err);
      }
    }

    const [profiles, areaSurcharges, fixed, settings] = await Promise.all([
      loadActiveProfiles(client),
      loadAreaSurcharges(client, data.pickupLabel, data.destinationLabel, {
        pickupPlaceId: data.pickupPlaceId,
        dropoffPlaceId: data.destinationPlaceId,
      }),
      loadFixedPriceForRoute(client, data.pickupPlaceId, data.destinationPlaceId),
      loadQuoteSettings(client),
    ]);

    const profile = profiles.find((p) => p.vehicle.id === data.vehicleId);
    if (!profile) {
      throw new Error("Selected vehicle has no active pricing profile.");
    }
    const fixedByVehicle = new Map<string, number>();
    let fixedAny: number | null = null;
    for (const r of fixed) {
      if (r.vehicle_id) fixedByVehicle.set(r.vehicle_id, r.price);
      else if (fixedAny === null) fixedAny = r.price;
    }
    const fixedPrice = fixedByVehicle.get(profile.vehicle.id) ?? fixedAny;

    const q = computeVehicleQuote({
      profile,
      distanceMiles,
      viaStops: data.viaStops,
      pickupTime: data.pickupTime,
      areaSurcharges,
      fixedPrice: fixedPrice ?? null,
      discountAmount: data.discountAmount,
      settings,
      vehicleCount: data.vehicleCount,
    });

    return {
      distanceMiles,
      durationMinutes,
      snapshot: q.snapshot,
      breakdown: q.breakdown,
      engine: q.engine,
      settings,
    };
  });

