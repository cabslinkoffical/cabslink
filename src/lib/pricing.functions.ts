import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, setResponseStatus } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
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
  loadRuleSets,
  loadJourneyCoords,
  resolveRulesForVehicle,
  computeVehicleQuote,
  EMPTY_RULE_SETS,
  type LoadedProfile,
  type AreaSurcharge,
  type QuoteSettings,
  type PricingSnapshot,
  type RuleSets,
  type ResolvedRules,
} from "@/lib/pricing-helpers.server";
import {
  resolveAvailability,
  validateCoupon,
  type Coord,
  type CouponRow,
  type JourneyContext,
} from "@/lib/pricing-rules";
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
  pickupDate?: string;
  pickupTime: string;
  passengers: number;
  luggage: number;
  serviceType?: string;
  isReturn?: boolean;
};

type AuthoritativeQuote = {
  distanceMiles: number;
  durationMinutes: number;
  areaSurcharges: AreaSurcharge[];
  profiles: LoadedProfile[];
  fixedByVehicle: Map<string, number>;
  fixedAny: number | null;
  settings: QuoteSettings;
  ruleSets: RuleSets;
  pickupCoord: Coord | null;
  destinationCoord: Coord | null;
  input: AuthoritativeInput;
};

async function computeAuthoritative(inp: AuthoritativeInput): Promise<AuthoritativeQuote> {
  const client = publicClient();
  const [distance, profiles, areaSurcharges, fixed, settings, ruleSets, coords] = await Promise.all([
    realDistanceMiles(inp.pickupPlaceId, inp.destinationPlaceId, inp.stops.map((s) => s.placeId)),
    loadActiveProfiles(client),
    loadAreaSurcharges(client, inp.pickupLabel, inp.destinationLabel, {
      pickupPlaceId: inp.pickupPlaceId,
      dropoffPlaceId: inp.destinationPlaceId,
    }),
    loadFixedPriceForRoute(client, inp.pickupPlaceId, inp.destinationPlaceId),
    loadQuoteSettings(client),
    loadRuleSets(client).catch((err) => {
      // Rule tables must never break a quote — fall back to legacy behaviour.
      console.error("loadRuleSets failed, falling back to mileage-only rules", err);
      return EMPTY_RULE_SETS;
    }),
    loadJourneyCoords(client, [inp.pickupPlaceId, inp.destinationPlaceId]),
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
    ruleSets,
    pickupCoord: coords.get(inp.pickupPlaceId) ?? null,
    destinationCoord: coords.get(inp.destinationPlaceId) ?? null,
    input: inp,
  };
}

/** Journey context for the rule matchers, per vehicle class. */
function journeyContext(auth: AuthoritativeQuote, profile: LoadedProfile): JourneyContext {
  return {
    pickupPlaceId: auth.input.pickupPlaceId,
    destinationPlaceId: auth.input.destinationPlaceId,
    pickupCoord: auth.pickupCoord,
    destinationCoord: auth.destinationCoord,
    vehicleId: profile.vehicle.id,
    vehicleClassId: profile.vehicle.class_id,
    date: auth.input.pickupDate || undefined,
    time: auth.input.pickupTime || undefined,
    serviceType: auth.input.serviceType,
    distanceMiles: auth.distanceMiles,
    isReturn: auth.input.isReturn,
  };
}

/**
 * Resolve every rule stage for one vehicle. `discountBase` is approximated
 * from the pre-discount engine subtotal, which is why we run the engine
 * twice: once to size percentage discounts, once for the final number.
 */
function resolveForProfile(auth: AuthoritativeQuote, profile: LoadedProfile): { resolved: ResolvedRules; ctx: JourneyContext } {
  const ctx = journeyContext(auth, profile);
  const legacyFixed = auth.fixedByVehicle.get(profile.vehicle.id) ?? auth.fixedAny ?? null;

  // Pass 1 — no discounts, to establish the base the discounts apply to.
  const pass1 = resolveRulesForVehicle({ ruleSets: auth.ruleSets, ctx, discountBase: 0, legacyFixedPrice: legacyFixed });
  const probe = computeVehicleQuote({
    profile,
    distanceMiles: auth.distanceMiles,
    viaStops: auth.input.stops.length,
    pickupTime: auth.input.pickupTime,
    areaSurcharges: auth.areaSurcharges,
    fixedPrice: legacyFixed,
    settings: { ...auth.settings, taxRate: 0 },
    vehicleCount: 1,
    resolved: { ...pass1, discountLines: [], discountRuleTotal: 0 },
  });

  // Pass 2 — size discounts against the pre-discount, pre-tax subtotal.
  const resolved = resolveRulesForVehicle({
    ruleSets: auth.ruleSets,
    ctx,
    discountBase: probe.engine.subtotal,
    legacyFixedPrice: legacyFixed,
  });
  return { resolved, ctx };
}

/**
 * Server-side coupon lookup + validation. Reads the coupon and this email's
 * prior redemptions, then defers to the pure `validateCoupon` rules.
 */
async function validateCouponForRequest(args: {
  code: string;
  base: number;
  date?: string;
  vehicleClassId?: string | null;
  classSlug?: string | null;
  serviceType?: string;
  email?: string | null;
}) {
  const client = publicClient();
  const code = args.code.trim().toUpperCase();
  const { data: coupon } = await client
    .from("coupons")
    .select(
      "id, code, discount_type, discount_value, min_booking_amount, usage_limit, used_count, starts_at, expires_at, active, applicable_vehicle_classes, applies_to_service_types, max_discount, per_customer_limit, stackable",
    )
    .ilike("code", code)
    .maybeSingle();

  let customerRedemptions = 0;
  if (coupon && args.email) {
    const { count } = await client
      .from("coupon_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", (coupon as { id: string }).id)
      .ilike("customer_email", args.email.trim());
    customerRedemptions = count ?? 0;
  }

  return validateCoupon(coupon as CouponRow | null, {
    base: args.base,
    date: args.date,
    vehicleClassId: args.vehicleClassId,
    classSlug: args.classSlug,
    serviceType: args.serviceType,
    customerRedemptions,
  });
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
  pricingSource: string;
  classId: string;
  classSlug: string;
  classDisplayOrder: number;
  quoteOnRequest: boolean;
  /** Availability engine verdict — customer-safe. */
  unavailable: boolean;
  unavailableMessage: string | null;
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
        pickupDate: data.pickupDate,
        pickupTime: data.pickupTime,
        passengers: data.passengers,
        luggage: data.luggage,
        serviceType: data.stops.length > 0 ? undefined : "direct_transfer",
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
        const { resolved, ctx } = resolveForProfile(auth, p);
        const verdict = resolveAvailability(auth.ruleSets.availabilityRules, ctx);
        const q = computeVehicleQuote({
          profile: p,
          distanceMiles: auth.distanceMiles,
          viaStops: data.stops.length,
          pickupTime: data.pickupTime,
          areaSurcharges: auth.areaSurcharges,
          fixedPrice: fixed ?? null,
          settings: auth.settings,
          vehicleCount: 1,
          resolved,
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
          pricingSource: q.pricingSource,
          classId: p.vehicle.class_id,
          classSlug: p.vehicle.class_slug,
          classDisplayOrder: p.vehicle.class_display_order,
          quoteOnRequest: p.vehicle.class_quote_on_request,
          unavailable: !verdict.available,
          unavailableMessage: verdict.message,
        };
      })
      // A hard availability block removes the class from customer quotes.
      .filter((c: QuoteCard) => !c.unavailable)
      .sort((a: QuoteCard, b: QuoteCard) => a.classDisplayOrder - b.classDisplayOrder || a.finalPrice - b.finalPrice);

    return {
      distanceMiles: auth.distanceMiles,
      durationMinutes: auth.durationMinutes,
      quotes: cards,
      childSeatFeePence: auth.settings.childSeatFeePence,
      meetGreetFeePence: auth.settings.meetGreetFeePence,
      returnJourneyFeePence: auth.settings.returnJourneyFeePence,
      policy: {
        nonRefundablePercent: auth.settings.policyNonRefundablePercent,
        nonRefundableMinPence: auth.settings.policyNonRefundableMinPence,
        flexiblePercent: auth.settings.policyFlexiblePercent,
        flexibleMinPence: auth.settings.policyFlexibleMinPence,
      },
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
    cancellation_policy: z.enum(["standard", "non_refundable", "flexible"]).optional().default("standard"),
    templateSlug: z.string().trim().min(1).max(120).optional().nullable(),
    couponCode: z.string().trim().min(1).max(40).optional().nullable(),
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
        pickupDate: data.pickupDate,
        pickupTime: data.pickupTime,
        passengers: data.passengers,
        luggage: data.luggage,
        serviceType: data.stops.length > 0 ? undefined : "direct_transfer",
        isReturn: !!data.return_journey,
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
    const { resolved, ctx: journeyCtx } = resolveForProfile(auth, profile);

    // Hard availability gate — the customer only ever sees the safe message.
    const verdict = resolveAvailability(auth.ruleSets.availabilityRules, journeyCtx);
    if (!verdict.available) {
      console.warn("booking blocked by availability rule", verdict.adminReason);
      try { setResponseStatus(409); } catch {}
      throw new Error(verdict.message ?? "That vehicle isn't available for the selected journey.");
    }

    // Coupon: validated server-side against the pre-VAT subtotal. Stacks with
    // the selected rule discount, capped so total discount ≤ subtotal.
    let couponRow: CouponRow | null = null;
    let couponDiscount = 0;
    let couponError = "";
    if (data.couponCode) {
      const probe = computeVehicleQuote({
        profile,
        distanceMiles: auth.distanceMiles,
        viaStops: data.stops.length,
        pickupTime: data.pickupTime,
        areaSurcharges: auth.areaSurcharges,
        fixedPrice: fixed ?? null,
        settings: { ...auth.settings, taxRate: 0 },
        vehicleCount: 1,
        resolved,
      });
      const res = await validateCouponForRequest({
        code: data.couponCode,
        base: probe.engine.subtotal,
        date: data.pickupDate,
        vehicleClassId: profile.vehicle.class_id,
        classSlug: profile.vehicle.class_slug,
        email: data.email,
      });
      if (res.ok) {
        couponRow = res.coupon;
        couponDiscount = res.amount;
      } else {
        couponError = res.reason;
        try { setResponseStatus(400); } catch {}
        throw new Error(couponError);
      }
    }

    const q = computeVehicleQuote({
      profile,
      distanceMiles: auth.distanceMiles,
      viaStops: data.stops.length,
      pickupTime: data.pickupTime,
      areaSurcharges: auth.areaSurcharges,
      fixedPrice: fixed ?? null,
      settings: auth.settings,
      vehicleCount: qty,
      resolved,
      couponCode: couponRow?.code ?? null,
      couponDiscount,
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
    const hasTimedStops = data.stops.length > 0;
    let serverServiceType = "direct_transfer";
    let serverOriginalServiceType = "direct_transfer";
    let serverFingerprint: string | null = null;
    let plannedStopSeconds = 0;
    let selectedPoisJson: any[] = [];
    let scenicTemplateId: string | null = null;
    let scenicPrice: number | null = null;

    // Template validation — when the booking originates from a published
    // tour we enforce that pickup/destination match the template's origin
    // and that every timed stop is one of the template's approved POIs.
    if (data.templateSlug) {
      const { getPublishedTourBySlugImpl } = await import("@/lib/tours.functions");
      const template = await getPublishedTourBySlugImpl(data.templateSlug);
      if (!template) {
        try { setResponseStatus(400); } catch {}
        throw new Error("This tour is no longer available. Please choose another tour.");
      }
      if (template.origin_place_id !== data.pickupPlaceId
          || template.destination_place_id !== data.destinationPlaceId) {
        try { setResponseStatus(400); } catch {}
        throw new Error("Pickup and destination don't match the selected tour. Return to the tour page and continue from there.");
      }
      const allowed = new Set(template.pois.map((p) => p.place_id));
      const bad = data.stops.find((s) => !allowed.has(s.placeId));
      if (bad) {
        try { setResponseStatus(400); } catch {}
        throw new Error(`Stop "${bad.label}" isn't part of this tour. Please refresh and reselect.`);
      }
      scenicTemplateId = template.id;
    }

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
          if (!scenicTemplateId) scenicTemplateId = multi.template_id;
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

    // Meet & greet + return journey extras (admin-configurable per site_settings).
    if (data.meet_greet && auth.settings.meetGreetFeePence > 0) {
      price = Number((price + auth.settings.meetGreetFeePence / 100).toFixed(2));
    }
    if (data.return_journey && auth.settings.returnJourneyFeePence > 0) {
      price = Number((price + auth.settings.returnJourneyFeePence / 100).toFixed(2));
    }

    // Cancellation-policy delta (admin-configurable percent + minimum).
    {
      const s = auth.settings;
      if (data.cancellation_policy === "non_refundable") {
        const d = -Math.max(s.policyNonRefundableMinPence / 100, Math.round(price * (s.policyNonRefundablePercent / 100) * 100) / 100);
        price = Number(Math.max(0, price + d).toFixed(2));
      } else if (data.cancellation_policy === "flexible") {
        const d = Math.max(s.policyFlexibleMinPence / 100, Math.round(price * (s.policyFlexiblePercent / 100) * 100) / 100);
        price = Number((price + d).toFixed(2));
      }
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
      pricing_source: q.pricingSource,
      applied_rules: q.appliedRules ?? [],
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

    // Coupon redemption — unique (coupon_id, booking_id) prevents double
    // counting; the used_count bump only happens when the row is new.
    if (couponRow && couponDiscount > 0) {
      try {
        const red = await supabaseAdmin
          .from("coupon_redemptions")
          .insert({
            coupon_id: couponRow.id,
            booking_id: insertedId,
            customer_email: data.email.trim().toLowerCase(),
            discount_amount: couponDiscount,
          } as any)
          .select("id")
          .single();
        if (!red.error) {
          await supabaseAdmin
            .from("coupons")
            .update({ used_count: Number(couponRow.used_count ?? 0) + 1 } as any)
            .eq("id", couponRow.id);
        }
      } catch (err) {
        console.error("coupon redemption failed", err);
      }
    }


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
  serviceType: z.string().trim().max(60).optional(),
  isReturn: z.boolean().optional().default(false),
  couponCode: z.string().trim().max(40).optional().nullable(),
});

export const adminPreviewQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.infer<typeof previewInput>) => previewInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const client = publicClient();

    // Distance: prefer explicit override (tests/edge verification), else the
    // same Routes API path production uses.
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

    const [profiles, areaSurcharges, fixed, settings, ruleSets, coords] = await Promise.all([
      loadActiveProfiles(client),
      loadAreaSurcharges(client, data.pickupLabel, data.destinationLabel, {
        pickupPlaceId: data.pickupPlaceId,
        dropoffPlaceId: data.destinationPlaceId,
      }),
      loadFixedPriceForRoute(client, data.pickupPlaceId, data.destinationPlaceId),
      loadQuoteSettings(client),
      loadRuleSets(client),
      loadJourneyCoords(client, [data.pickupPlaceId, data.destinationPlaceId]),
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
    const fixedPrice = fixedByVehicle.get(profile.vehicle.id) ?? fixedAny ?? null;

    const auth: AuthoritativeQuote = {
      distanceMiles,
      durationMinutes,
      areaSurcharges,
      profiles,
      fixedByVehicle,
      fixedAny,
      settings,
      ruleSets,
      pickupCoord: coords.get(data.pickupPlaceId) ?? null,
      destinationCoord: coords.get(data.destinationPlaceId) ?? null,
      input: {
        pickupPlaceId: data.pickupPlaceId,
        pickupLabel: data.pickupLabel,
        destinationPlaceId: data.destinationPlaceId,
        destinationLabel: data.destinationLabel,
        stops: [],
        pickupDate: data.pickupDate,
        pickupTime: data.pickupTime,
        passengers: 1,
        luggage: 0,
        serviceType: data.serviceType,
        isReturn: data.isReturn,
      },
    };

    const { resolved, ctx } = resolveForProfile(auth, profile);
    const availability = resolveAvailability(ruleSets.availabilityRules, ctx);

    // Coupon debug — never redeemed here, only validated.
    let couponDiscount = 0;
    let couponCode: string | null = null;
    let couponReason: string | null = null;
    if (data.couponCode) {
      const probe = computeVehicleQuote({
        profile,
        distanceMiles,
        viaStops: data.viaStops,
        pickupTime: data.pickupTime,
        areaSurcharges,
        fixedPrice,
        settings: { ...settings, taxRate: 0 },
        vehicleCount: 1,
        resolved,
      });
      const res = await validateCouponForRequest({
        code: data.couponCode,
        base: probe.engine.subtotal,
        date: data.pickupDate,
        vehicleClassId: profile.vehicle.class_id,
        classSlug: profile.vehicle.class_slug,
        serviceType: data.serviceType,
      });
      if (res.ok) {
        couponDiscount = res.amount;
        couponCode = res.coupon.code;
      } else {
        couponReason = res.reason;
      }
    }

    const q = computeVehicleQuote({
      profile,
      distanceMiles,
      viaStops: data.viaStops,
      pickupTime: data.pickupTime,
      areaSurcharges,
      fixedPrice,
      discountAmount: data.discountAmount,
      settings,
      vehicleCount: data.vehicleCount,
      resolved,
      couponCode,
      couponDiscount,
    });

    return {
      distanceMiles,
      durationMinutes,
      snapshot: q.snapshot,
      breakdown: q.breakdown,
      engine: q.engine,
      settings,
      // Pricing-debug payload (admin only).
      debug: {
        pricingSource: q.pricingSource,
        appliedRules: q.appliedRules,
        unmatchedReasons: q.unmatchedReasons,
        conflicts: resolved.conflicts,
        modifiers: resolved.modifiers,
        ruleDiscounts: resolved.discountLines,
        ruleSurcharges: resolved.extraSurcharges,
        legacyFixedPrice: fixedPrice,
        taxMode: settings.taxMode,
        taxRate: settings.taxRate,
        coupon: { code: couponCode, discount: couponDiscount, reason: couponReason },
        availability: {
          available: availability.available,
          adminReason: availability.adminReason,
          ruleId: availability.rule?.id ?? null,
          conflicts: availability.conflicts.map((r) => ({ id: r.id, name: r.name ?? null })),
        },
        pickupCoord: auth.pickupCoord,
        destinationCoord: auth.destinationCoord,
      },
    };
  });

// -------------------------------------------------------------------
// Public: validate a promo code for the booking form (no redemption).
// -------------------------------------------------------------------
const promoInput = z.object({
  code: z.string().trim().min(1).max(40),
  subtotal: z.coerce.number().min(0).max(1000000),
  pickupDate: z.string().max(20).optional().default(""),
  vehicleClassId: z.string().uuid().optional().nullable(),
});

export const validatePromoCode = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof promoInput>) => promoInput.parse(data))
  .handler(async ({ data }) => {
    let ip = "unknown";
    try { ip = getRequestIP({ xForwardedFor: true }) ?? "unknown"; } catch {}
    if (!checkLimit({ name: "promo", windowMs: 60_000, max: 15 }, ip).ok) {
      try { setResponseStatus(429); } catch {}
      throw new Error("Too many attempts. Please wait a moment and try again.");
    }
    const res = await validateCouponForRequest({
      code: data.code,
      base: data.subtotal,
      date: data.pickupDate,
      vehicleClassId: data.vehicleClassId ?? null,
    });
    if (!res.ok) return { ok: false as const, reason: res.reason };
    return { ok: true as const, code: res.coupon.code, discount: res.amount };
  });


