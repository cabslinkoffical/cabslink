import { createClient } from "@supabase/supabase-js";
import {
  ENGINE_VERSION,
  runPricingEngine,
  type EngineModifier,
  type PricingProfile,
  type QuoteResult,
} from "@/lib/pricing";
import {
  detectFixedRouteConflicts,
  matchDiscounts,
  matchFixedRoute,
  matchLocationPricing,
  matchModifiers,
  matchSurcharges,
  type AvailabilityRule,
  type Coord,
  type DiscountRule,
  type FixedRouteRule,
  type JourneyContext,
  type LocationPricingRule,
  type ModifierRule,
  type SurchargeRule,
} from "@/lib/pricing-rules";
import { computeRoute } from "@/lib/route-distance.server";

const round2 = (n: number) => Math.round(n * 100) / 100;

// -------------------------------------------------------------------
// Public client for anonymous quote reads
// -------------------------------------------------------------------
export function publicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
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
  taxMode: "exclusive" | "inclusive";
  taxEffectiveFrom: string | null;
  currency: string;
  currencySymbol: string;
  childSeatFeePence: number;
  meetGreetFeePence: number;
  returnJourneyFeePence: number;
  policyNonRefundablePercent: number;
  policyNonRefundableMinPence: number;
  policyFlexiblePercent: number;
  policyFlexibleMinPence: number;
};

export async function loadQuoteSettings(client: ReturnType<typeof publicClient>): Promise<QuoteSettings> {
  const { data } = await client
    .from("site_settings")
    .select("tax_enabled, tax_percentage, tax_label, tax_mode, tax_effective_from, currency, currency_symbol, child_seat_fee_pence, meet_greet_fee_pence, return_journey_fee_pence, policy_non_refundable_percent, policy_non_refundable_min_pence, policy_flexible_percent, policy_flexible_min_pence")
    .eq("id", 1)
    .maybeSingle();
  const row: any = data ?? {};
  const enabled = !!row.tax_enabled;
  const pct = Math.max(0, Math.min(100, Number(row.tax_percentage) || 0));
  return {
    taxEnabled: enabled,
    taxRate: enabled ? pct / 100 : 0,
    taxLabel: (row.tax_label as string) || "VAT",
    taxMode: row.tax_mode === "inclusive" ? "inclusive" : "exclusive",
    taxEffectiveFrom: (row.tax_effective_from as string) ?? null,
    currency: (row.currency as string) || "GBP",
    currencySymbol: (row.currency_symbol as string) || "£",
    childSeatFeePence: Math.max(0, Number(row.child_seat_fee_pence) || 0),
    meetGreetFeePence: Math.max(0, Number(row.meet_greet_fee_pence) || 0),
    returnJourneyFeePence: Math.max(0, Number(row.return_journey_fee_pence) || 0),
    policyNonRefundablePercent: Math.max(0, Math.min(100, Number(row.policy_non_refundable_percent) || 0)),
    policyNonRefundableMinPence: Math.max(0, Number(row.policy_non_refundable_min_pence) || 0),
    policyFlexiblePercent: Math.max(0, Math.min(100, Number(row.policy_flexible_percent) || 0)),
    policyFlexibleMinPence: Math.max(0, Number(row.policy_flexible_min_pence) || 0),
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
    class_id: string;
    class_slug: string;
    class_name: string;
    class_display_order: number;
    class_quote_on_request: boolean;
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

  const [tiersRes, vehiclesRes, classesRes] = await Promise.all([
    client
      .from("vehicle_mileage_tiers" as any)
      .select("*")
      .in("pricing_profile_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
      .order("sort_order", { ascending: true }),
    client
      .from("vehicles")
      .select("id, name, category, image_url, passengers, luggage, hand_luggage, active, display_order")
      .in("id", vehicleIds.length ? vehicleIds : ["00000000-0000-0000-0000-000000000000"]),
    client
      .from("vehicle_classes")
      .select("id, name, slug, hero_image, passengers, large_luggage, hand_luggage, quote_on_request, display_order, pricing_vehicle_id, active")
      .eq("active", true)
      .in("pricing_vehicle_id", vehicleIds.length ? vehicleIds : ["00000000-0000-0000-0000-000000000000"]),
  ]);
  if (tiersRes.error) throw new Error(tiersRes.error.message);
  if (vehiclesRes.error) throw new Error(vehiclesRes.error.message);
  if (classesRes.error) throw new Error(classesRes.error.message);
  const tiers = tiersRes.data;
  const vehicles = vehiclesRes.data;
  const classes = classesRes.data;

  const tiersByProfile = new Map<string, any[]>();
  for (const t of tiers ?? []) {
    const list = tiersByProfile.get((t as any).pricing_profile_id) ?? [];
    list.push(t);
    tiersByProfile.set((t as any).pricing_profile_id, list);
  }
  const vehicleById = new Map((vehicles ?? []).map((v: any) => [v.id, v]));
  const classByPricingVehicleId = new Map((classes ?? []).map((c: any) => [c.pricing_vehicle_id, c]));

  return (profiles ?? [])
    .map((p: any) => {
      const v: any = vehicleById.get(p.vehicle_id);
      const c: any = classByPricingVehicleId.get(p.vehicle_id);
      if (!v || !v.active) return null;
      if (!c) return null;
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
          name: c.name,
          category: c.slug,
          image_url: (typeof c.hero_image === "string" && c.hero_image.trim()) ? c.hero_image : v.image_url,
          passengers: c.passengers,
          luggage: c.large_luggage,
          hand_luggage: c.hand_luggage,
          class_id: c.id,
          class_slug: c.slug,
          class_name: c.name,
          class_display_order: Number(c.display_order ?? v.display_order ?? 0),
          class_quote_on_request: !!c.quote_on_request,
        },
      } as LoadedProfile;
    })
    .filter((profile): profile is LoadedProfile => profile !== null)
    .sort((a: LoadedProfile, b: LoadedProfile) => a.vehicle.class_display_order - b.vehicle.class_display_order) as LoadedProfile[];
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
// Rule sets — one parallel load per quote, shared across every vehicle.
// -------------------------------------------------------------------
export type RuleSets = {
  fixedRoutes: FixedRouteRule[];
  locationRules: LocationPricingRule[];
  surchargeRules: SurchargeRule[];
  modifiers: ModifierRule[];
  discountRules: DiscountRule[];
  availabilityRules: AvailabilityRule[];
};

export const EMPTY_RULE_SETS: RuleSets = {
  fixedRoutes: [],
  locationRules: [],
  surchargeRules: [],
  modifiers: [],
  discountRules: [],
  availabilityRules: [],
};

const num = (v: unknown) => (v == null ? null : Number(v));

export async function loadRuleSets(client: ReturnType<typeof publicClient>): Promise<RuleSets> {
  const [fixed, loc, sur, mod, disc, avail] = await Promise.all([
    client.from("pricing_rules").select("*").eq("active", true),
    client.from("location_pricing_rules" as any).select("*").eq("active", true),
    client.from("surcharges").select("*").eq("active", true),
    client.from("pricing_modifiers" as any).select("*").eq("active", true),
    client.from("discount_rules" as any).select("*").eq("active", true),
    client.from("availability_rules" as any).select("*").eq("active", true),
  ]);

  return {
    fixedRoutes: ((fixed.data ?? []) as any[]).map((r) => ({
      id: r.id,
      vehicle_id: r.vehicle_id ?? null,
      vehicle_class_id: r.vehicle_class_id ?? null,
      price: Number(r.price),
      from_place_id: r.from_place_id ?? null,
      to_place_id: r.to_place_id ?? null,
      from_lat: num(r.from_lat),
      from_lng: num(r.from_lng),
      to_lat: num(r.to_lat),
      to_lng: num(r.to_lng),
      from_radius_miles: Number(r.from_radius_miles ?? 0),
      to_radius_miles: Number(r.to_radius_miles ?? 0),
      bidirectional: !!r.bidirectional,
      valid_for_return: r.valid_for_return !== false,
      priority: Number(r.priority ?? 100),
      valid_from: r.valid_from ?? null,
      valid_to: r.valid_to ?? null,
      active: r.active !== false,
    })),
    locationRules: ((loc.data ?? []) as any[]).map((r) => ({
      id: r.id,
      name: r.name,
      place_id: r.place_id ?? null,
      lat: num(r.lat),
      lng: num(r.lng),
      radius_miles: Number(r.radius_miles ?? 0),
      included_distance_miles: Number(r.included_distance_miles ?? 0),
      price_type: r.price_type === "base" ? "base" : "fixed",
      price: Number(r.price ?? 0),
      extra_per_mile: Number(r.extra_per_mile ?? 0),
      scope: r.scope ?? "pickup",
      vehicle_class_id: r.vehicle_class_id ?? null,
      priority: Number(r.priority ?? 100),
      active: r.active !== false,
    })),
    surchargeRules: ((sur.data ?? []) as any[]).map((r) => ({
      id: r.id,
      name: r.name,
      charge_type: r.charge_type ?? "fixed",
      amount: Number(r.amount ?? 0),
      applies_to: r.applies_to ?? null,
      vehicle_id: r.vehicle_id ?? null,
      vehicle_class_id: r.vehicle_class_id ?? null,
      starts_at: r.starts_at ?? null,
      ends_at: r.ends_at ?? null,
      days_of_week: r.days_of_week ?? null,
      time_from: r.time_from ?? null,
      time_to: r.time_to ?? null,
      priority: Number(r.priority ?? 100),
      active: r.active !== false,
    })),
    modifiers: ((mod.data ?? []) as any[]).map((r) => ({
      id: r.id,
      name: r.name,
      modifier_type: r.modifier_type === "fixed" ? "fixed" : "percent",
      value: Number(r.value ?? 0),
      vehicle_class_id: r.vehicle_class_id ?? null,
      service_types: r.service_types ?? null,
      place_id: r.place_id ?? null,
      lat: num(r.lat),
      lng: num(r.lng),
      radius_miles: num(r.radius_miles),
      scope: r.scope ?? "either",
      date_from: r.date_from ?? null,
      date_to: r.date_to ?? null,
      days_of_week: r.days_of_week ?? null,
      time_from: r.time_from ?? null,
      time_to: r.time_to ?? null,
      stackable: !!r.stackable,
      priority: Number(r.priority ?? 100),
      active: r.active !== false,
    })),
    discountRules: ((disc.data ?? []) as any[]).map((r) => ({
      id: r.id,
      name: r.name,
      basis: r.basis ?? "vehicle_class",
      discount_type: r.discount_type === "fixed" ? "fixed" : "percent",
      value: Number(r.value ?? 0),
      event_name: r.event_name ?? null,
      place_id: r.place_id ?? null,
      lat: num(r.lat),
      lng: num(r.lng),
      radius_miles: num(r.radius_miles),
      scope: r.scope ?? "either",
      starts_at: r.starts_at ?? null,
      ends_at: r.ends_at ?? null,
      vehicle_class_ids: r.vehicle_class_ids ?? null,
      service_types: r.service_types ?? null,
      max_discount: num(r.max_discount),
      stackable: !!r.stackable,
      priority: Number(r.priority ?? 100),
      active: r.active !== false,
    })),
    availabilityRules: ((avail.data ?? []) as any[]).map((r) => ({
      id: r.id,
      name: r.name,
      rule_scope: r.rule_scope ?? "global",
      vehicle_class_id: r.vehicle_class_id ?? null,
      vehicle_id: r.vehicle_id ?? null,
      service_types: r.service_types ?? null,
      effect: r.effect === "allow" ? "allow" : "block",
      date_from: r.date_from ?? null,
      date_to: r.date_to ?? null,
      days_of_week: r.days_of_week ?? null,
      time_from: r.time_from ?? null,
      time_to: r.time_to ?? null,
      place_id: r.place_id ?? null,
      lat: num(r.lat),
      lng: num(r.lng),
      radius_miles: num(r.radius_miles),
      scope: r.scope ?? "either",
      reason: r.reason ?? null,
      priority: Number(r.priority ?? 100),
      active: r.active !== false,
    })),
  };
}

/** Resolve pickup/destination Place IDs to coordinates for radius matching. */
export async function loadJourneyCoords(
  client: ReturnType<typeof publicClient>,
  placeIds: string[],
): Promise<Map<string, Coord>> {
  try {
    const { resolveCoords } = await import("@/lib/place-coords.server");
    return await resolveCoords(client as any, placeIds);
  } catch (err) {
    console.warn("journey coord resolution failed:", (err as Error).message);
    return new Map();
  }
}

// -------------------------------------------------------------------
// Per-vehicle rule resolution: chooses the base pricing source and
// gathers modifiers / rule discounts / applied-rule provenance.
// -------------------------------------------------------------------
export type AppliedRule = {
  stage: "fixed_route" | "location_pricing" | "surcharge" | "modifier" | "discount" | "coupon" | "availability";
  rule_id: string;
  label: string;
  amount?: number;
  detail?: string;
};

export type ResolvedRules = {
  pricingSource: "fixed_route" | "location" | "mileage";
  fixedPrice: number | null;
  locationPrice: number | null;
  extraSurcharges: Array<{ label: string; amount: number }>;
  modifiers: EngineModifier[];
  discountLines: Array<{ label: string; amount: number }>;
  discountRuleTotal: number;
  appliedRules: AppliedRule[];
  reasons: string[];
  conflicts: string[];
};

export function resolveRulesForVehicle(args: {
  ruleSets: RuleSets;
  ctx: JourneyContext;
  /** Pre-discount base used to size percentage discounts. */
  discountBase: number;
  /** Legacy exact-match fixed price (kept so nothing regresses if rule sets are empty). */
  legacyFixedPrice?: number | null;
}): ResolvedRules {
  const { ruleSets, ctx } = args;
  const appliedRules: AppliedRule[] = [];
  const reasons: string[] = [];
  const conflicts: string[] = [];

  // --- 1 & 2: fixed route -------------------------------------------------
  const fixedResult = matchFixedRoute(ruleSets.fixedRoutes, ctx);
  reasons.push(...fixedResult.reasons);
  let fixedPrice: number | null = args.legacyFixedPrice ?? null;
  if (fixedResult.match) {
    fixedPrice = fixedResult.match.price;
    appliedRules.push({
      stage: "fixed_route",
      rule_id: fixedResult.match.rule.id,
      label: `Fixed route (${fixedResult.match.kind}${fixedResult.match.reversed ? ", reverse" : ""})`,
      amount: fixedResult.match.price,
    });
    for (const c of detectFixedRouteConflicts(fixedResult.candidates)) {
      conflicts.push(`Fixed route ${c.rule.id} ties with the winning rule at the same priority and radius but a different price.`);
    }
  }

  // --- 3: location / radius pricing --------------------------------------
  let locationPrice: number | null = null;
  if (fixedPrice == null) {
    const locResult = matchLocationPricing(ruleSets.locationRules, ctx);
    reasons.push(...locResult.reasons);
    if (locResult.match) {
      locationPrice = locResult.match.amount;
      appliedRules.push({
        stage: "location_pricing",
        rule_id: locResult.match.rule.id,
        label: `Location pricing: ${locResult.match.rule.name}`,
        amount: locResult.match.amount,
      });
    }
  } else {
    reasons.push("Location pricing skipped: a fixed-route rule takes precedence.");
  }

  const pricingSource: ResolvedRules["pricingSource"] =
    fixedPrice != null ? "fixed_route" : locationPrice != null ? "location" : "mileage";

  // --- surcharge rules (previously admin-only, now live) ------------------
  const extraSurcharges: Array<{ label: string; amount: number }> = [];
  const baseForPercent = fixedPrice ?? locationPrice ?? 0;
  for (const s of matchSurcharges(ruleSets.surchargeRules, ctx)) {
    const amount =
      s.charge_type === "percentage"
        ? round2((baseForPercent * Number(s.amount)) / 100)
        : round2(Number(s.amount));
    if (amount <= 0) continue;
    extraSurcharges.push({ label: s.name, amount });
    appliedRules.push({ stage: "surcharge", rule_id: s.id, label: s.name, amount });
  }

  // --- modifiers ---------------------------------------------------------
  const modResult = matchModifiers(ruleSets.modifiers, ctx);
  reasons.push(...modResult.reasons);
  const modifiers: EngineModifier[] = modResult.applied.map((m) => ({
    label: m.name,
    type: m.modifier_type,
    value: Number(m.value),
  }));
  for (const m of modResult.applied) {
    appliedRules.push({
      stage: "modifier",
      rule_id: m.id,
      label: m.name,
      detail: `${m.modifier_type === "percent" ? `${m.value}%` : m.value} (priority ${m.priority}${m.stackable ? ", stackable" : ""})`,
    });
  }

  // --- rule discounts ----------------------------------------------------
  const discResult = matchDiscounts(ruleSets.discountRules, ctx, args.discountBase);
  reasons.push(...discResult.reasons);
  const discountLines = discResult.applied.map((d) => ({ label: d.rule.name, amount: d.amount }));
  for (const d of discResult.applied) {
    appliedRules.push({ stage: "discount", rule_id: d.rule.id, label: d.rule.name, amount: d.amount, detail: d.rule.basis });
  }
  const discountRuleTotal = round2(discountLines.reduce((s, d) => s + d.amount, 0));

  return {
    pricingSource,
    fixedPrice,
    locationPrice,
    extraSurcharges,
    modifiers,
    discountLines,
    discountRuleTotal,
    appliedRules,
    reasons,
    conflicts,
  };
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
  vehicle_class_id?: string | null;
  profile_id: string | null;
  distance_miles: number;
  base_price: number;
  mileage_tiers: Array<{ tier_name: string; miles: number; rate: number; amount: number }>;
  mileage_total: number;
  fixed_price_applied: boolean;
  fixed_price_amount: number | null;
  location_price_applied?: boolean;
  location_price_amount?: number | null;
  pricing_source?: string;
  applied_rules?: AppliedRule[];
  unmatched_reasons?: string[];
  rule_conflicts?: string[];
  pickup_surcharge: number;
  dropoff_surcharge: number;
  rule_surcharges?: Array<{ label: string; amount: number }>;
  via_stops: number;
  via_price: number;
  time_extra: number;
  modifier_total?: number;
  discount: number;
  coupon_code?: string | null;
  coupon_discount?: number;
  tax_rate: number;
  tax_mode?: string;
  tax_amount: number;
  net_total?: number;
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
  pricingSource: string;
  appliedRules: AppliedRule[];
  unmatchedReasons: string[];
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
  /** Optional rule-engine output. Omitted → identical behaviour to before. */
  resolved?: ResolvedRules | null;
  /** Validated coupon discount, applied after rule discounts. */
  couponCode?: string | null;
  couponDiscount?: number;
  /** Service type — drives the scheme's airport pickup fee. */
  serviceType?: string;
  /** Job connects to another booking → the scheme's connecting-job discount. */
  isConnectingJob?: boolean;
}): ComputedVehicleQuote {
  const {
    profile, distanceMiles, viaStops, pickupTime,
    areaSurcharges, fixedPrice, discountAmount = 0, settings, vehicleCount = 1,
    resolved = null,
  } = args;

  const pickup = areaSurcharges.find((a) => a.side === "pickup")?.amount ?? 0;
  const dropoff = areaSurcharges.find((a) => a.side === "dropoff")?.amount ?? 0;

  // Base price source. Fixed route wins, then location pricing, then mileage.
  const effectiveFixed = resolved?.fixedPrice ?? fixedPrice;
  const locationPrice = effectiveFixed == null ? (resolved?.locationPrice ?? null) : null;
  const fixedApplied = effectiveFixed != null;
  const locationApplied = !fixedApplied && locationPrice != null;

  const engineProfile: PricingProfile = fixedApplied
    ? { ...profile, base_price: effectiveFixed!, tiers: [] }
    : locationApplied
      ? { ...profile, base_price: locationPrice!, tiers: [] }
      : profile;

  const surchargeLines = [
    ...areaSurcharges.map((a) => ({ label: a.label, amount: a.amount })),
    ...(resolved?.extraSurcharges ?? []),
  ];

  const couponDiscount = round2(Math.max(0, args.couponDiscount ?? 0));
  const discountLines = [
    ...(resolved?.discountLines ?? []),
    ...(couponDiscount > 0
      ? [{ label: args.couponCode ? `Promo code ${args.couponCode}` : "Promo code", amount: couponDiscount }]
      : []),
  ];

  const engine = runPricingEngine(engineProfile, {
    distanceMiles,
    viaStops,
    pickupTime: pickupTime || undefined,
    surcharges: surchargeLines,
    modifiers: resolved?.modifiers ?? [],
    discountAmount,
    discountLines,
    taxRate: settings.taxRate,
    taxMode: settings.taxMode,
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

  const pricingSource = fixedApplied ? "fixed_route" : locationApplied ? "location" : "mileage";
  const appliedRules = resolved?.appliedRules ?? [];

  const snapshot: PricingSnapshot = {
    engine_version: ENGINE_VERSION,
    vehicle_id: profile.vehicle.id,
    vehicle_class_id: profile.vehicle.class_id ?? null,
    profile_id: ((profile as any).id as string) ?? null,
    distance_miles: round2(distanceMiles),
    base_price: engine.basePrice,
    mileage_tiers: mileageLines,
    mileage_total: engine.mileagePrice,
    fixed_price_applied: fixedApplied,
    fixed_price_amount: fixedApplied ? round2(effectiveFixed!) : null,
    location_price_applied: locationApplied,
    location_price_amount: locationApplied ? round2(locationPrice!) : null,
    pricing_source: pricingSource,
    applied_rules: appliedRules,
    unmatched_reasons: resolved?.reasons ?? [],
    rule_conflicts: resolved?.conflicts ?? [],
    pickup_surcharge: round2(pickup),
    dropoff_surcharge: round2(dropoff),
    rule_surcharges: resolved?.extraSurcharges ?? [],
    via_stops: viaStops,
    via_price: engine.viaPrice,
    time_extra: engine.timeExtraPrice,
    modifier_total: engine.modifierPrice,
    discount: engine.discountPrice,
    coupon_code: args.couponCode ?? null,
    coupon_discount: couponDiscount,
    tax_rate: settings.taxRate,
    tax_mode: engine.taxMode,
    tax_amount: engine.taxPrice,
    net_total: engine.netPrice,
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
    fixedPriceAmount: fixedApplied ? round2(effectiveFixed!) : null,
    pricingSource,
    appliedRules,
    unmatchedReasons: resolved?.reasons ?? [],
  };
}

