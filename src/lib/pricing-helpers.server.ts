import { createClient } from "@supabase/supabase-js";
import { ENGINE_VERSION, runPricingEngine, type PricingProfile, type QuoteResult } from "@/lib/pricing";
import { computeRoute } from "@/lib/route-distance.server";

const round2 = (n: number) => Math.round(n * 100) / 100;

// -------------------------------------------------------------------
// Public client for anonymous quote reads
// -------------------------------------------------------------------
export function publicClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden: admin access required");
}

// -------------------------------------------------------------------
// Real driving distance from Google Routes API. Throws on any failure —
// callers must surface a retryable error. Never returns a fake mileage.
// -------------------------------------------------------------------
export async function realDistanceMiles(
  pickupPlaceId: string,
  destinationPlaceId: string,
  waypointPlaceIds: string[] = [],
): Promise<{ miles: number; minutes: number }> {
  const r = await computeRoute({
    originPlaceId: pickupPlaceId,
    destinationPlaceId: destinationPlaceId,
    waypointPlaceIds,
  });
  const minutes = r.durationSeconds > 0
    ? Math.round(r.durationSeconds / 60)
    : Math.max(5, Math.round((r.distanceMiles / 35) * 60));
  return { miles: r.distanceMiles, minutes };
}

// -------------------------------------------------------------------
// Load site tax + currency settings (Task 4)
// -------------------------------------------------------------------
export type QuoteSettings = {
  taxRate: number;      // 0..1
  taxEnabled: boolean;
  taxLabel: string;
  currency: string;
  currencySymbol: string;
};

export async function loadQuoteSettings(client: ReturnType<typeof publicClient>): Promise<QuoteSettings> {
  const { data } = await client
    .from("site_settings")
    .select("tax_enabled, tax_percentage, tax_label, currency, currency_symbol")
    .eq("id", 1)
    .maybeSingle();
  const row: any = data ?? {};
  const enabled = !!row.tax_enabled;
  const pct = Math.max(0, Math.min(100, Number(row.tax_percentage) || 0));
  return {
    taxEnabled: enabled,
    taxRate: enabled ? pct / 100 : 0,
    taxLabel: (row.tax_label as string) || "VAT",
    currency: (row.currency as string) || "GBP",
    currencySymbol: (row.currency_symbol as string) || "£",
  };
}

// -------------------------------------------------------------------
// Load all active pricing profiles + tiers + vehicle meta
// -------------------------------------------------------------------
export type LoadedProfile = PricingProfile & {
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

export async function loadActiveProfiles(client: ReturnType<typeof publicClient>): Promise<LoadedProfile[]> {
  const { data: profiles, error: pErr } = await client
    .from("vehicle_pricing_profiles" as any)
    .select("*")
    .eq("status", true);
  if (pErr) throw new Error(pErr.message);

  const ids = (profiles ?? []).map((p: any) => p.id);
  const vehicleIds = (profiles ?? []).map((p: any) => p.vehicle_id);

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
// Area pickup / dropoff surcharges (Task 3)
// Prefer exact Place-ID match; fall back to comparable_value substring
// against the LABEL text. Returns pickup + dropoff amounts as SEPARATE
// entries so the snapshot / breakdown can present them individually.
// -------------------------------------------------------------------
export type AreaSurcharge = { label: string; amount: number; side: "pickup" | "dropoff" };

export async function loadAreaSurcharges(
  client: ReturnType<typeof publicClient>,
  pickupLabel: string,
  dropoffLabel: string,
  opts?: { pickupPlaceId?: string | null; dropoffPlaceId?: string | null },
): Promise<AreaSurcharge[]> {
  const { data } = await client
    .from("addresses")
    .select("name, comparable_value, pickup_charge, dropoff_charge, place_id, label, active")
    .eq("active", true);
  const rows = (data ?? []) as any[];

  const p = (pickupLabel ?? "").toLowerCase();
  const d = (dropoffLabel ?? "").toLowerCase();
  const pPid = opts?.pickupPlaceId ?? null;
  const dPid = opts?.dropoffPlaceId ?? null;

  function pickRow(text: string, placeId: string | null) {
    if (placeId) {
      const exact = rows.find((r) => r.place_id && r.place_id === placeId);
      if (exact) return { row: exact, label: (exact.label || exact.name) as string };
    }
    let best: { row: any; label: string; len: number } | null = null;
    for (const r of rows) {
      const keys = [r.comparable_value, r.label, r.name].filter(Boolean) as string[];
      for (const k of keys) {
        const kl = k.toLowerCase();
        if (kl && text.includes(kl) && (!best || kl.length > best.len)) {
          best = { row: r, label: (r.label || r.name) as string, len: kl.length };
        }
      }
    }
    return best ? { row: best.row, label: best.label } : null;
  }

  const out: AreaSurcharge[] = [];
  const pm = pickRow(p, pPid);
  if (pm) {
    const amt = Number(pm.row.pickup_charge) || 0;
    if (amt > 0) out.push({ side: "pickup", label: `Pickup area: ${pm.label}`, amount: round2(amt) });
  }
  const dm = pickRow(d, dPid);
  if (dm) {
    const amt = Number(dm.row.dropoff_charge) || 0;
    if (amt > 0) out.push({ side: "dropoff", label: `Dropoff area: ${dm.label}`, amount: round2(amt) });
  }
  return out;
}

// -------------------------------------------------------------------
// Fixed-price matching by exact Place-ID pair (with bidirectional support).
// -------------------------------------------------------------------
export async function loadFixedPriceForRoute(
  client: ReturnType<typeof publicClient>,
  fromPlaceId: string,
  toPlaceId: string,
): Promise<Array<{ vehicle_id: string | null; price: number }>> {
  const { data } = await client
    .from("pricing_rules")
    .select("vehicle_id, price, from_place_id, to_place_id, bidirectional")
    .eq("active", true)
    .not("from_place_id", "is", null)
    .not("to_place_id", "is", null);
  const rows = (data ?? []) as any[];
  const matches = rows.filter((r) => {
    const forward = r.from_place_id === fromPlaceId && r.to_place_id === toPlaceId;
    const reverse =
      r.bidirectional === true && r.from_place_id === toPlaceId && r.to_place_id === fromPlaceId;
    return forward || reverse;
  });
  return matches.map((r) => ({ vehicle_id: r.vehicle_id ?? null, price: Number(r.price) }));
}

// -------------------------------------------------------------------
// Compute a single vehicle's authoritative quote (engine + fixed-price
// override + tax + vehicle count) and build a stable snapshot.
// This is THE canonical entry point — calculateQuotes, createBooking,
// and previewQuote all funnel through it. No math elsewhere.
// -------------------------------------------------------------------
export type PricingSnapshot = {
  engine_version: string;
  vehicle_id: string;
  profile_id: string | null;
  distance_miles: number;
  base_price: number;
  mileage_tiers: Array<{ tier_name: string; miles: number; rate: number; amount: number }>;
  mileage_total: number;
  fixed_price_applied: boolean;
  fixed_price_amount: number | null;
  pickup_surcharge: number;
  dropoff_surcharge: number;
  via_stops: number;
  via_price: number;
  time_extra: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  subtotal: number;
  per_vehicle_total: number;
  vehicle_count: number;
  final_total: number;
  currency: string;
  currency_symbol: string;
  timestamp: string;
};

export type ComputedVehicleQuote = {
  vehicleId: string;
  profileId: string | null;
  perVehicleTotal: number;
  finalTotal: number;
  breakdown: QuoteResult["breakdown"];
  engine: QuoteResult;
  snapshot: PricingSnapshot;
  fixedPriceApplied: boolean;
  fixedPriceAmount: number | null;
};

export function computeVehicleQuote(args: {
  profile: LoadedProfile;
  distanceMiles: number;
  viaStops: number;
  pickupTime?: string;
  areaSurcharges: AreaSurcharge[];
  fixedPrice: number | null;
  discountAmount?: number;
  settings: QuoteSettings;
  vehicleCount?: number;
}): ComputedVehicleQuote {
  const {
    profile, distanceMiles, viaStops, pickupTime,
    areaSurcharges, fixedPrice, discountAmount = 0, settings, vehicleCount = 1,
  } = args;

  const pickup = areaSurcharges.find((a) => a.side === "pickup")?.amount ?? 0;
  const dropoff = areaSurcharges.find((a) => a.side === "dropoff")?.amount ?? 0;

  // Feed the pricing engine. When fixed price applies, base+mileage are
  // replaced by a synthetic profile that has fixed_price as base and no tiers.
  const fixedApplied = fixedPrice != null;
  const engineProfile: PricingProfile = fixedApplied
    ? { ...profile, base_price: fixedPrice!, tiers: [] }
    : profile;

  const engine = runPricingEngine(engineProfile, {
    distanceMiles,
    viaStops,
    pickupTime: pickupTime || undefined,
    surcharges: areaSurcharges.map((a) => ({ label: a.label, amount: a.amount })),
    discountAmount,
    taxRate: settings.taxRate,
  });

  const qty = Math.max(1, vehicleCount);
  const perVehicleTotal = engine.finalPrice;
  const finalTotal = round2(perVehicleTotal * qty);

  const mileageLines = engine.breakdown
    .filter((b) => b.kind === "mileage")
    .map((b: any) => ({
      tier_name: b.label as string,
      miles: b.miles as number,
      rate: b.rate as number,
      amount: b.amount as number,
    }));

  const snapshot: PricingSnapshot = {
    engine_version: ENGINE_VERSION,
    vehicle_id: profile.vehicle.id,
    profile_id: ((profile as any).id as string) ?? null,
    distance_miles: round2(distanceMiles),
    base_price: engine.basePrice,
    mileage_tiers: mileageLines,
    mileage_total: engine.mileagePrice,
    fixed_price_applied: fixedApplied,
    fixed_price_amount: fixedApplied ? round2(fixedPrice!) : null,
    pickup_surcharge: round2(pickup),
    dropoff_surcharge: round2(dropoff),
    via_stops: viaStops,
    via_price: engine.viaPrice,
    time_extra: engine.timeExtraPrice,
    discount: engine.discountPrice,
    tax_rate: settings.taxRate,
    tax_amount: engine.taxPrice,
    subtotal: engine.subtotal,
    per_vehicle_total: round2(perVehicleTotal),
    vehicle_count: qty,
    final_total: finalTotal,
    currency: settings.currency,
    currency_symbol: settings.currencySymbol,
    timestamp: new Date().toISOString(),
  };

  return {
    vehicleId: profile.vehicle.id,
    profileId: ((profile as any).id as string) ?? null,
    perVehicleTotal: round2(perVehicleTotal),
    finalTotal,
    breakdown: engine.breakdown,
    engine,
    snapshot,
    fixedPriceApplied: fixedApplied,
    fixedPriceAmount: fixedApplied ? round2(fixedPrice!) : null,
  };
}
