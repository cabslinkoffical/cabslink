import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  runPricingEngine,
  stubDistanceMiles,
  type PricingProfile,
  type QuoteResult,
} from "@/lib/pricing";

// -------------------------------------------------------------------
// Public client for anonymous quote reads
// -------------------------------------------------------------------
function publicClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden: admin access required");
}

// -------------------------------------------------------------------
// Distance estimation (Google Maps if connector configured, else stub)
// -------------------------------------------------------------------
async function estimateDistanceMiles(pickup: string, dropoff: string): Promise<{ miles: number; minutes: number }> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (apiKey && lovableKey) {
    try {
      const res = await fetch(
        "https://connector-gateway.lovable.dev/google_maps/routes/distanceMatrix/v2:computeRouteMatrix",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": apiKey,
            "Content-Type": "application/json",
            "X-Goog-FieldMask": "originIndex,destinationIndex,distanceMeters,duration,condition",
          },
          body: JSON.stringify({
            origins: [{ waypoint: { address: pickup }, routeModifiers: { avoidFerries: false } }],
            destinations: [{ waypoint: { address: dropoff } }],
            travelMode: "DRIVE",
            routingPreference: "TRAFFIC_AWARE",
            regionCode: "GB",
          }),
          signal: AbortSignal.timeout(3500),
        },
      );
      if (res.ok) {
        const rows = (await res.json()) as Array<{ distanceMeters?: number; duration?: string; condition?: string }>;
        const first = Array.isArray(rows) ? rows[0] : null;
        if (first?.condition === "ROUTE_EXISTS" && first.distanceMeters) {
          const miles = Math.round((first.distanceMeters / 1609.34) * 100) / 100;
          const secs = first.duration ? parseInt(String(first.duration).replace(/[^\d]/g, ""), 10) || 0 : 0;
          const minutes = secs > 0 ? Math.round(secs / 60) : Math.round((miles / 35) * 60);
          return { miles, minutes };
        }
      }
    } catch {
      // fall through to stub
    }
  }
  const miles = stubDistanceMiles(pickup, dropoff);
  return { miles, minutes: Math.max(5, Math.round((miles / 35) * 60)) };
}

// -------------------------------------------------------------------
// Load all active pricing profiles + tiers + vehicle meta
// -------------------------------------------------------------------
type LoadedProfile = PricingProfile & {
  vehicle: {
    id: string;
    name: string;
    category: string;
    image_url: string;
    passengers: number;
    luggage: number;
    hand_luggage: number;
  };
};

async function loadActiveProfiles(client: ReturnType<typeof publicClient>): Promise<LoadedProfile[]> {
  const { data: profiles, error: pErr } = await client
    .from("vehicle_pricing_profiles" as any)
    .select("*")
    .eq("status", true);
  if (pErr) throw new Error(pErr.message);

  const ids = (profiles ?? []).map((p: any) => p.id);
  const vehicleIds = (profiles ?? []).map((p: any) => p.vehicle_id);

  // Tiers + vehicles are independent — fetch in parallel.
  const [tiersRes, vehiclesRes] = await Promise.all([
    client
      .from("vehicle_mileage_tiers" as any)
      .select("*")
      .in("pricing_profile_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
      .order("sort_order", { ascending: true }),
    client
      .from("vehicles")
      .select("id, name, category, image_url, passengers, luggage, hand_luggage, active, display_order")
      .in("id", vehicleIds.length ? vehicleIds : ["00000000-0000-0000-0000-000000000000"]),
  ]);
  if (tiersRes.error) throw new Error(tiersRes.error.message);
  if (vehiclesRes.error) throw new Error(vehiclesRes.error.message);
  const tiers = tiersRes.data;
  const vehicles = vehiclesRes.data;

  const tiersByProfile = new Map<string, any[]>();
  for (const t of tiers ?? []) {
    const list = tiersByProfile.get((t as any).pricing_profile_id) ?? [];
    list.push(t);
    tiersByProfile.set((t as any).pricing_profile_id, list);
  }
  const vehicleById = new Map((vehicles ?? []).map((v: any) => [v.id, v]));

  return (profiles ?? [])
    .map((p: any) => {
      const v: any = vehicleById.get(p.vehicle_id);
      if (!v || !v.active) return null;
      return {
        ...p,
        tiers: (tiersByProfile.get(p.id) ?? []).map((t: any) => ({
          id: t.id,
          tier_name: t.tier_name,
          miles: Number(t.miles),
          cost_per_mile: Number(t.cost_per_mile),
          sort_order: t.sort_order,
        })),
        vehicle: {
          id: v.id,
          name: v.name,
          category: v.category,
          image_url: v.image_url,
          passengers: v.passengers,
          luggage: v.luggage,
          hand_luggage: v.hand_luggage,
        },
      } as LoadedProfile;
    })
    .filter(Boolean) as LoadedProfile[];
}

// -------------------------------------------------------------------
// Area pickup / dropoff surcharges (from `addresses` table)
// -------------------------------------------------------------------
type AreaSurcharge = { label: string; amount: number };
async function loadAreaSurcharges(
  client: ReturnType<typeof publicClient>,
  pickup: string,
  dropoff: string,
): Promise<AreaSurcharge[]> {
  const { data } = await client
    .from("addresses")
    .select("name, comparable_value, pickup_charge, dropoff_charge")
    .eq("active", true);
  const rows = data ?? [];
  const p = pickup.toLowerCase();
  const d = dropoff.toLowerCase();
  const matchFor = (text: string) => {
    let best: { label: string; charge: number; len: number } | null = null;
    for (const r of rows as any[]) {
      const keys = [r.name, r.comparable_value].filter(Boolean) as string[];
      for (const k of keys) {
        const kl = k.toLowerCase();
        if (kl && text.includes(kl)) {
          if (!best || kl.length > best.len) {
            best = { label: r.name as string, charge: 0, len: kl.length };
          }
        }
      }
    }
    return best;
  };
  const out: AreaSurcharge[] = [];
  const pm = matchFor(p);
  if (pm) {
    const row = (rows as any[]).find((r) => r.name === pm.label);
    const amt = Number(row?.pickup_charge) || 0;
    if (amt > 0) out.push({ label: `Pickup area: ${pm.label}`, amount: amt });
  }
  const dm = matchFor(d);
  if (dm) {
    const row = (rows as any[]).find((r) => r.name === dm.label);
    const amt = Number(row?.dropoff_charge) || 0;
    if (amt > 0) out.push({ label: `Dropoff area: ${dm.label}`, amount: amt });
  }
  return out;
}


// -------------------------------------------------------------------
// Public: calculate quotes for all vehicles
// -------------------------------------------------------------------
const quoteInput = z.object({
  pickup: z.string().trim().min(2).max(255),
  dropoff: z.string().trim().min(2).max(255),
  pickupDate: z.string().optional().default(""),
  pickupTime: z.string().optional().default(""),
  viaStops: z.number().int().min(0).max(10).optional().default(0),
  passengers: z.number().int().min(1).max(60).optional().default(1),
  luggage: z.number().int().min(0).max(60).optional().default(0),
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
    const client = publicClient();

    // Run the three independent lookups in parallel: fixed-route prices,
    // distance estimate (external HTTP), and pricing profiles (3 DB queries).
    const [fixed, distanceMiles, profiles] = await Promise.all([
      client
        .from("pricing_rules")
        .select("vehicle_id, price")
        .eq("active", true)
        .ilike("from_address", `%${data.pickup}%`)
        .ilike("to_address", `%${data.dropoff}%`)
        .then((r) => r.data ?? []),
      estimateDistanceMiles(data.pickup, data.dropoff),
      loadActiveProfiles(client),
    ]);

    const fixedByVehicle = new Map<string, number>();
    for (const r of fixed) {
      if ((r as any).vehicle_id) fixedByVehicle.set((r as any).vehicle_id, Number((r as any).price));
    }

    // Run engine per vehicle
    const cards: QuoteCard[] = profiles
      .filter((p) => p.vehicle.passengers >= data.passengers && p.vehicle.luggage >= data.luggage)
      .map((p) => {
        const result = runPricingEngine(p, {
          distanceMiles: distanceMiles.miles,
          viaStops: data.viaStops,
          pickupTime: data.pickupTime || undefined,
        });
        const final = fixedByVehicle.get(p.vehicle.id) ?? result.finalPrice;
        return {
          vehicleId: p.vehicle.id,
          name: p.vehicle.name,
          category: p.vehicle.category,
          imageUrl: p.vehicle.image_url,
          passengers: p.vehicle.passengers,
          luggage: p.vehicle.luggage,
          handLuggage: p.vehicle.hand_luggage,
          distanceMiles: distanceMiles.miles,
          finalPrice: Math.round(final * 100) / 100,
          breakdown: result.breakdown,
          pricing: result,
        };
      })
      .sort((a, b) => a.finalPrice - b.finalPrice);

    return { distanceMiles: distanceMiles.miles, durationMinutes: distanceMiles.minutes, quotes: cards };
  });


// -------------------------------------------------------------------
// Public: create booking with server-authoritative price
// -------------------------------------------------------------------
const createBookingInput = z.object({
  vehicleId: z.string().uuid(),
  vehicleCount: z.number().int().min(1).max(20).optional().default(1),
  pickup: z.string().trim().min(2).max(500),
  dropoff: z.string().trim().min(2).max(500),
  pickupDate: z.string().trim().min(1).max(20),
  pickupTime: z.string().trim().min(1).max(10),
  passengers: z.number().int().min(1).max(200),
  luggage: z.number().int().min(0).max(200),
  viaStops: z.number().int().min(0).max(10).optional().default(0),
  customer_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(5).max(30),
  flight_number: z.string().trim().max(20).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  child_seat: z.boolean().optional().default(false),
  meet_greet: z.boolean().optional().default(false),
  return_journey: z.boolean().optional().default(false),
});


export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof createBookingInput>) => createBookingInput.parse(data))
  .handler(async ({ data }) => {
    const client = publicClient();

    const [fixed, distanceMiles, profiles] = await Promise.all([
      client
        .from("pricing_rules")
        .select("vehicle_id, price")
        .eq("active", true)
        .ilike("from_address", `%${data.pickup}%`)
        .ilike("to_address", `%${data.dropoff}%`)
        .then((r) => r.data ?? []),
      estimateDistanceMiles(data.pickup, data.dropoff),
      loadActiveProfiles(client),
    ]);

    const profile = profiles.find((p) => p.vehicle.id === data.vehicleId);
    if (!profile) throw new Error("Selected vehicle is unavailable.");
    const qty = Math.max(1, data.vehicleCount ?? 1);
    if (profile.vehicle.passengers * qty < data.passengers || profile.vehicle.luggage * qty < data.luggage) {
      throw new Error("Selected vehicles cannot fit the requested passengers/luggage.");
    }

    const fixedByVehicle = new Map<string, number>();
    for (const r of fixed) {
      if ((r as any).vehicle_id) fixedByVehicle.set((r as any).vehicle_id, Number((r as any).price));
    }
    const engine = runPricingEngine(profile, {
      distanceMiles: distanceMiles.miles,
      viaStops: data.viaStops,
      pickupTime: data.pickupTime || undefined,
    });
    const perVehicle =
      fixedByVehicle.get(profile.vehicle.id) ?? engine.finalPrice;
    const price = Math.round(perVehicle * qty * 100) / 100;
    const notesWithQty = qty > 1
      ? `Vehicles: ${qty} × ${profile.vehicle.name}${data.notes ? `\n\n${data.notes}` : ""}`
      : data.notes || null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inserted, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        customer_name: data.customer_name,
        email: data.email,
        phone: data.phone,
        pickup_address: data.pickup,
        dropoff_address: data.dropoff,
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
        status: "new",
      })
      .select("id, price")
      .single();
    if (error) throw new Error(error.message);

    return { id: (inserted as any).id, price };
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

    // Replace tiers
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
