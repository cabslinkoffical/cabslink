import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, setResponseStatus } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  publicClient,
  assertAdmin,
  loadActiveProfiles,
  loadQuoteSettings,
  loadRuleSets,
  loadJourneyCoords,
} from "@/lib/pricing-helpers.server";
import {
  loadActiveHourlyRates,
  buildHourlyCards,
  round2,
  hourlyJourneyContext,
  applyHourlyRules,
  type HourlyCard,
} from "@/lib/hourly-pricing.server";
import { placeIdSchema, placeLabelSchema } from "@/lib/place-id";
import { checkLimit } from "@/lib/rate-limit.server";

export type { HourlyCard };

const hourlyQuoteInput = z.object({
  hours: z.number().int().min(1).max(24),
  passengers: z.number().int().min(1).max(60).optional().default(1),
  luggage: z.number().int().min(0).max(60).optional().default(0),
  pickupPlaceId: z.string().trim().max(300).optional().nullable(),
  pickupDate: z.string().trim().max(20).optional().nullable(),
  pickupTime: z.string().trim().max(10).optional().nullable(),
});

export const calculateHourlyQuotes = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof hourlyQuoteInput>) => hourlyQuoteInput.parse(data))
  .handler(async ({ data }) => {
    let ip = "unknown";
    try { ip = getRequestIP({ xForwardedFor: true }) ?? "unknown"; } catch {}
    if (!checkLimit({ name: "hourlyQuote", windowMs: 60_000, max: 30 }, ip).ok) {
      try { setResponseStatus(429); } catch {}
      throw new Error("You've made too many requests. Please wait a moment and try again.");
    }

    const client = publicClient();
    const [profiles, rates, settings, ruleSets] = await Promise.all([
      loadActiveProfiles(client),
      loadActiveHourlyRates(),
      loadQuoteSettings(client),
      loadRuleSets(client).catch((err) => {
        console.error("loadRuleSets failed for hourly quote", err);
        return null;
      }),
    ]);

    const pickupPlaceId = data.pickupPlaceId?.trim() || "";
    let pickupCoord: { lat: number; lng: number } | null = null;
    if (pickupPlaceId) {
      const coords = await loadJourneyCoords(client, [pickupPlaceId]);
      pickupCoord = coords.get(pickupPlaceId) ?? null;
    }

    return {
      hours: data.hours,
      quotes: buildHourlyCards({
        profiles,
        rates,
        hours: data.hours,
        ruleSets,
        pickupPlaceId,
        pickupCoord,
        date: data.pickupDate?.trim() || undefined,
        time: data.pickupTime?.trim() || undefined,
      }),
      childSeatFeePence: settings.childSeatFeePence,
      meetGreetFeePence: settings.meetGreetFeePence,
      currencySymbol: settings.currencySymbol,
      policy: {
        nonRefundablePercent: settings.policyNonRefundablePercent,
        nonRefundableMinPence: settings.policyNonRefundableMinPence,
        flexiblePercent: settings.policyFlexiblePercent,
        flexibleMinPence: settings.policyFlexibleMinPence,
      },
    };
  });


// -------------------------------------------------------------------
// Create an hourly hire booking (server-authoritative price)
// -------------------------------------------------------------------
const uuidV4 = z
  .string()
  .trim()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    "Invalid idempotency key",
  );

const createHourlyBookingInput = z.object({
  idempotencyKey: uuidV4,
  vehicleId: z.string().uuid(),
  vehicleCount: z.number().int().min(1).max(20).optional().default(1),
  hours: z.number().int().min(1).max(24),
  pickupPlaceId: placeIdSchema,
  pickupLabel: placeLabelSchema,
  dropoffLabel: z.string().trim().max(500).optional().nullable(),
  itinerary: z.string().trim().max(1000).optional().nullable(),
  pickupDate: z.string().trim().min(1).max(20),
  pickupTime: z.string().trim().min(1).max(10),
  passengers: z.number().int().min(1).max(200),
  luggage: z.number().int().min(0).max(200),
  customer_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(5).max(30),
  flight_number: z.string().trim().max(20).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  child_seat_count: z.number().int().min(0).max(10).optional().default(0),
  meet_greet: z.boolean().optional().default(false),
  cancellation_policy: z.enum(["standard", "non_refundable", "flexible"]).optional().default("standard"),
});

export const createHourlyBooking = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof createHourlyBookingInput>) => createHourlyBookingInput.parse(data))
  .handler(async ({ data }) => {
    let ip = "unknown";
    try { ip = getRequestIP({ xForwardedFor: true }) ?? "unknown"; } catch {}
    if (!checkLimit({ name: "createBooking", windowMs: 10 * 60_000, max: 10 }, ip).ok) {
      try { setResponseStatus(429); } catch {}
      throw new Error("You've made too many booking attempts. Please wait a few minutes and try again.");
    }

    const { bookingRequestHash } = await import("@/lib/booking-fingerprint");
    const requestHash = await bookingRequestHash({
      pickupPlaceId: data.pickupPlaceId,
      destinationPlaceId: `hourly:${data.hours}`,
      stops: [],
      pickupDate: data.pickupDate,
      pickupTime: data.pickupTime,
      vehicleId: data.vehicleId,
      vehicleCount: data.vehicleCount ?? 1,
      passengers: data.passengers,
      luggage: data.luggage,
      email: data.email,
      phone: data.phone,
      returnJourney: false,
      meetGreet: !!data.meet_greet,
      childSeat: (data.child_seat_count ?? 0) > 0,
      childSeatCount: data.child_seat_count ?? 0,
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { deriveConfirmationToken } = await import("@/lib/booking-confirmation.server");

    const existing = await supabaseAdmin
      .from("bookings")
      .select("id, price, booking_ref, idempotency_request_hash")
      .eq("idempotency_key", data.idempotencyKey)
      .maybeSingle();
    if (existing.data) {
      const stored = (existing.data as any).idempotency_request_hash as string | null;
      if (stored && stored === requestHash) {
        const eid = (existing.data as any).id as string;
        const eref = (existing.data as any).booking_ref as string;
        let token: string | null = null;
        try { token = deriveConfirmationToken(eid, eref).token; } catch { token = null; }
        return { id: eid, price: Number((existing.data as any).price), ref: eref, token };
      }
      try { setResponseStatus(409); } catch {}
      throw new Error("This booking request conflicts with an earlier submission. Please refresh and try again.");
    }

    // --- Authoritative recompute --------------------------------------
    const client = publicClient();
    const [profiles, rates, settings] = await Promise.all([
      loadActiveProfiles(client),
      loadActiveHourlyRates(),
      loadQuoteSettings(client),
    ]);
    const profile = profiles.find((p) => p.vehicle.id === data.vehicleId);
    const rate = rates.get(data.vehicleId);
    if (!profile || !rate) throw new Error("Selected vehicle is unavailable for hourly hire.");

    const qty = Math.max(1, data.vehicleCount ?? 1);
    if (profile.vehicle.passengers * qty < data.passengers || profile.vehicle.luggage * qty < data.luggage) {
      throw new Error("Selected vehicles cannot fit the requested passengers/luggage.");
    }

    const minHours = Math.max(1, Number(rate.min_hours) || 1);
    const maxHours = Math.max(minHours, Number(rate.max_hours) || 24);
    if (data.hours > maxHours) {
      throw new Error(`This vehicle can be hired for a maximum of ${maxHours} hours.`);
    }
    const chargedHours = Math.max(data.hours, minHours);
    const perHour = Math.max(0, Number(rate.price_per_hour) || 0);
    const childSeatCount = Math.max(0, data.child_seat_count ?? 0);
    const childSeatFee = round2((settings.childSeatFeePence * childSeatCount) / 100);
    const meetGreetFee = data.meet_greet ? round2(settings.meetGreetFeePence / 100) : 0;
    const base = round2(perHour * chargedHours * qty);
    const price = round2(base + childSeatFee + meetGreetFee);

    const refRpc: any = await supabaseAdmin.rpc("generate_booking_ref");
    if (refRpc.error) {
      console.error("generate_booking_ref failed", refRpc.error);
      throw new Error("Couldn't save your booking. Please try again.");
    }
    const bookingRef = refRpc.data as string;
    const confirmationExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const noteParts = [
      `Hourly hire — ${chargedHours} hour${chargedHours === 1 ? "" : "s"} @ ${settings.currencySymbol}${perHour.toFixed(2)}/hr`,
      qty > 1 ? `${qty} × ${profile.vehicle.name}` : null,
      data.itinerary ? `Itinerary: ${data.itinerary}` : null,
      data.notes || null,
    ].filter(Boolean);

    const insertPayload = {
      customer_name: data.customer_name,
      email: data.email,
      phone: data.phone,
      pickup_address: data.pickupLabel,
      dropoff_address: data.dropoffLabel?.trim() || "As directed (hourly hire)",
      pickup_place_id: data.pickupPlaceId,
      dropoff_place_id: null,
      pickup_date: data.pickupDate,
      pickup_time: data.pickupTime,
      flight_number: data.flight_number || null,
      passengers: data.passengers,
      luggage: data.luggage,
      vehicle_type: qty > 1 ? `${qty} × ${profile.vehicle.name}` : profile.vehicle.name,
      vehicle_id: profile.vehicle.id,
      vehicle_name_snapshot: profile.vehicle.name,
      vehicle_capacity_snapshot: {
        passengers: profile.vehicle.passengers,
        luggage: profile.vehicle.luggage,
        hand_luggage: profile.vehicle.hand_luggage,
        vehicle_count: qty,
      },
      pricing_snapshot: {
        kind: "hourly_hire",
        hours_requested: data.hours,
        hours_charged: chargedHours,
        price_per_hour: perHour,
        vehicle_count: qty,
        child_seat_fee: childSeatFee,
        meet_greet_fee: meetGreetFee,
        final_total: price,
        cancellation_policy: data.cancellation_policy,
      },
      child_seat: childSeatCount > 0,
      child_seat_count: childSeatCount,
      meet_greet: !!data.meet_greet,
      return_journey: false,
      notes: noteParts.join(" · "),
      price,
      hourly_hours: chargedHours,
      hourly_rate_per_hour: perHour,
      service_type: "hourly_hire",
      original_service_type: "hourly_hire",
      idempotency_key: data.idempotencyKey,
      idempotency_request_hash: requestHash,
      status: "new",
      booking_ref: bookingRef,
      confirmation_token_expires_at: confirmationExpires,
    };

    const insertRes = await supabaseAdmin
      .from("bookings")
      .insert(insertPayload as any)
      .select("id, price, booking_ref")
      .single();

    if (insertRes.error) {
      if ((insertRes.error as any).code === "23505") {
        const again = await supabaseAdmin
          .from("bookings")
          .select("id, price, booking_ref, idempotency_request_hash")
          .eq("idempotency_key", data.idempotencyKey)
          .maybeSingle();
        const stored = (again.data as any)?.idempotency_request_hash as string | null;
        if (again.data && stored && stored === requestHash) {
          const rid = (again.data as any).id as string;
          const rref = (again.data as any).booking_ref as string;
          let token: string | null = null;
          try { token = deriveConfirmationToken(rid, rref).token; } catch { token = null; }
          return { id: rid, price: Number((again.data as any).price), ref: rref, token };
        }
        try { setResponseStatus(409); } catch {}
        throw new Error("This booking request conflicts with an earlier submission. Please refresh and try again.");
      }
      console.error("createHourlyBooking insert failed", insertRes.error);
      throw new Error("Couldn't save your booking. Please try again.");
    }

    const insertedId = (insertRes.data as any).id as string;
    let confirmationToken: string | null = null;
    try {
      const derived = deriveConfirmationToken(insertedId, bookingRef);
      confirmationToken = derived.token;
      await supabaseAdmin
        .from("bookings")
        .update({ confirmation_token_hash: derived.hash } as any)
        .eq("id", insertedId);
    } catch (err) {
      console.error("confirmation token derivation failed", err);
    }

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
        dropoffAddress: insertPayload.dropoff_address,
        pickupDate: data.pickupDate,
        pickupTime: data.pickupTime,
        vehicleType: insertPayload.vehicle_type,
        passengers: data.passengers,
        luggage: data.luggage,
        flightNumber: data.flight_number ?? null,
        meetGreet: !!data.meet_greet,
        childSeat: childSeatCount > 0,
        returnJourney: false,
        distanceMiles: null,
        price,
        notes: insertPayload.notes,
      };
      await Promise.allSettled([
        notifyBookingReceived(ctx as any, insertedId),
        notifyAdminNewBooking(ctx as any, insertedId),
      ]);
    } catch (err) {
      console.error("post-booking notifications failed", err);
    }

    return { id: insertedId, price, ref: bookingRef, token: confirmationToken };
  });

// -------------------------------------------------------------------
// Admin: manage hourly rates
// -------------------------------------------------------------------
export const adminListHourlyRates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [{ data: vehicles }, { data: rates }] = await Promise.all([
      context.supabase
        .from("vehicles")
        .select("id, name, passengers, luggage, active, display_order")
        .eq("active", true)
        .order("display_order", { ascending: true }),
      context.supabase
        .from("hourly_rates")
        .select("id, vehicle_id, price_per_hour, min_hours, max_hours, currency, active"),
    ]);
    const byVehicle = new Map<string, any>();
    for (const r of (rates ?? []) as any[]) byVehicle.set(r.vehicle_id, r);
    return ((vehicles ?? []) as any[]).map((v) => {
      const r = byVehicle.get(v.id);
      return {
        vehicleId: v.id as string,
        vehicleName: v.name as string,
        passengers: v.passengers as number,
        luggage: v.luggage as number,
        rateId: (r?.id as string) ?? null,
        pricePerHour: Number(r?.price_per_hour ?? 0),
        minHours: Number(r?.min_hours ?? 3),
        maxHours: Number(r?.max_hours ?? 12),
        active: r ? !!r.active : false,
      };
    });
  });

const saveRateInput = z.object({
  vehicleId: z.string().uuid(),
  pricePerHour: z.number().min(0).max(10000),
  minHours: z.number().int().min(1).max(24),
  maxHours: z.number().int().min(1).max(24),
  active: z.boolean(),
});

export const adminSaveHourlyRate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.infer<typeof saveRateInput>) => saveRateInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.maxHours < data.minHours) throw new Error("Maximum hours must be at least the minimum hours.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const existing = await supabaseAdmin
      .from("hourly_rates")
      .select("id")
      .eq("vehicle_id", data.vehicleId)
      .maybeSingle();
    const payload = {
      vehicle_id: data.vehicleId,
      price_per_hour: data.pricePerHour,
      min_hours: data.minHours,
      max_hours: data.maxHours,
      active: data.active,
    };
    const res = existing.data
      ? await supabaseAdmin.from("hourly_rates").update(payload as any).eq("id", (existing.data as any).id)
      : await supabaseAdmin.from("hourly_rates").insert(payload as any);
    if (res.error) throw new Error(res.error.message);
    return { ok: true };
  });
