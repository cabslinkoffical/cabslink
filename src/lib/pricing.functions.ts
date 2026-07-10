import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, setResponseStatus } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  runPricingEngine,
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
  type LoadedProfile,
  type AreaSurcharge,
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
};

async function computeAuthoritative(inp: AuthoritativeInput): Promise<AuthoritativeQuote> {
  const client = publicClient();
  const [distance, profiles, areaSurcharges, fixed] = await Promise.all([
    realDistanceMiles(inp.pickupPlaceId, inp.destinationPlaceId, inp.stops.map((s) => s.placeId)),
    loadActiveProfiles(client),
    loadAreaSurcharges(client, inp.pickupLabel, inp.destinationLabel),
    loadFixedPriceForRoute(client, inp.pickupPlaceId, inp.destinationPlaceId),
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

    const areaTotal = auth.areaSurcharges.reduce((s: number, a: AreaSurcharge) => s + a.amount, 0);

    const cards: QuoteCard[] = auth.profiles
      .filter((p: LoadedProfile) => p.vehicle.passengers >= data.passengers && p.vehicle.luggage >= data.luggage)
      .map((p: LoadedProfile) => {
        const result = runPricingEngine(p, {
          distanceMiles: auth.distanceMiles,
          viaStops: data.stops.length,
          pickupTime: data.pickupTime || undefined,
          surcharges: auth.areaSurcharges,
        });
        const fixed = auth.fixedByVehicle.get(p.vehicle.id) ?? auth.fixedAny;
        const final = fixed != null ? fixed + areaTotal : result.finalPrice;
        return {
          vehicleId: p.vehicle.id,
          name: p.vehicle.name,
          category: p.vehicle.category,
          imageUrl: p.vehicle.image_url,
          passengers: p.vehicle.passengers,
          luggage: p.vehicle.luggage,
          handLuggage: p.vehicle.hand_luggage,
          distanceMiles: auth.distanceMiles,
          finalPrice: Math.round(final * 100) / 100,
          breakdown: result.breakdown,
          pricing: result,
        };
      })
      .sort((a: QuoteCard, b: QuoteCard) => a.finalPrice - b.finalPrice);

    return {
      distanceMiles: auth.distanceMiles,
      durationMinutes: auth.durationMinutes,
      quotes: cards,
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
    stops: z.array(stopSchema).max(10).optional().default([]),
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
    });

    // Idempotency: return existing booking ONLY if the request fingerprint
    // matches. A mismatched replay is refused with a generic conflict.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const existing = await supabaseAdmin
      .from("bookings")
      .select("id, price, idempotency_request_hash")
      .eq("idempotency_key", data.idempotencyKey)
      .maybeSingle();
    if (existing.data) {
      const storedHash = (existing.data as any).idempotency_request_hash as string | null;
      if (storedHash && storedHash === requestHash) {
        return { id: (existing.data as any).id, price: Number((existing.data as any).price) };
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

    const areaTotal = auth.areaSurcharges.reduce((s: number, a: AreaSurcharge) => s + a.amount, 0);
    const engine = runPricingEngine(profile, {
      distanceMiles: auth.distanceMiles,
      viaStops: data.stops.length,
      pickupTime: data.pickupTime || undefined,
      surcharges: auth.areaSurcharges,
    });
    const fixed = auth.fixedByVehicle.get(profile.vehicle.id) ?? auth.fixedAny;
    const perVehicle = fixed != null ? fixed + areaTotal : engine.finalPrice;
    const price = Math.round(perVehicle * qty * 100) / 100;

    const notesWithQty = qty > 1
      ? `Vehicles: ${qty} × ${profile.vehicle.name}${data.notes ? `\n\n${data.notes}` : ""}`
      : data.notes || null;

    // Server-issued booking reference + confirmation token (client cannot supply)
    const [{ newConfirmationToken }, refRpc] = await Promise.all([
      import("@/lib/booking-confirmation.server"),
      supabaseAdmin.rpc("generate_booking_ref"),
    ]);
    if ((refRpc as any).error) {
      console.error("generate_booking_ref failed", (refRpc as any).error);
      throw new Error("Couldn't save your booking. Please try again.");
    }
    const bookingRef = (refRpc as any).data as string;
    const { token: confirmationToken, hash: confirmationHash, expiresAt: confirmationExpires } = newConfirmationToken();

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
      child_seat: !!data.child_seat,
      meet_greet: !!data.meet_greet,
      return_journey: !!data.return_journey,
      notes: notesWithQty,
      price,
      distance_miles: auth.distanceMiles,
      idempotency_key: data.idempotencyKey,
      idempotency_request_hash: requestHash,
      status: "new",
      booking_ref: bookingRef,
      confirmation_token_hash: confirmationHash,
      confirmation_token_expires_at: confirmationExpires,
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
            // Confirmation token is NOT re-issued on replay; the original
            // customer already received one. Return without a token so the
            // client falls back to a generic "already submitted" flow.
            return {
              id: (again.data as any).id,
              price: Number((again.data as any).price),
              ref: (again.data as any).booking_ref,
              token: null as string | null,
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
      // Fire in parallel; failures are logged inside notify* helpers.
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
const saveInput = z.object({
  id: z.string().uuid().nullable().optional(),
  vehicle_id: z.string().uuid(),
  base_price: z.coerce.number().min(0).max(100000),
  via_price: z.coerce.number().min(0).max(100000),
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
        miles: z.coerce.number().min(0).max(99999),
        cost_per_mile: z.coerce.number().min(0).max(100000),
        sort_order: z.coerce.number().int().min(0).max(999),
      }),
    )
    .min(1)
    .max(20),
});

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
