/**
 * Hourly / day-hire pricing helpers.
 *
 * Hourly hire has its own base (price per hour × charged hours) but must go
 * through the same rule funnel as transfers for the stages that make sense:
 * availability blocks, pricing modifiers (surge / event uplift) and rule
 * discounts. Fixed routes, location pricing and mileage tiers do not apply,
 * because an hourly hire has no fixed destination.
 */
import { publicClient, type LoadedProfile, type RuleSets, type AppliedRule } from "@/lib/pricing-helpers.server";
import {
  matchModifiers,
  matchDiscounts,
  resolveAvailability,
  type JourneyContext,
} from "@/lib/pricing-rules";
import { applyTaxTo, type TaxMode } from "@/lib/pricing";

export const HOURLY_SERVICE_TYPE = "hourly_hire";

export const round2 = (n: number) => Math.round(n * 100) / 100;

export type HourlyRateRow = {
  vehicle_id: string;
  price_per_hour: number;
  min_hours: number;
  max_hours: number;
  active: boolean;
  display_order: number | null;
};

export async function loadActiveHourlyRates(): Promise<Map<string, HourlyRateRow>> {
  const client = publicClient();
  const { data, error } = await client
    .from("hourly_rates")
    .select("vehicle_id, price_per_hour, min_hours, max_hours, active, display_order")
    .eq("active", true);
  if (error) throw new Error(error.message);
  const map = new Map<string, HourlyRateRow>();
  for (const r of (data ?? []) as any[]) {
    if (r.vehicle_id) map.set(r.vehicle_id as string, r as HourlyRateRow);
  }
  return map;
}

export function hourlyJourneyContext(args: {
  profile: LoadedProfile;
  pickupPlaceId: string;
  pickupCoord?: { lat: number; lng: number } | null;
  date?: string;
  time?: string;
}): JourneyContext {
  return {
    pickupPlaceId: args.pickupPlaceId,
    // An hourly hire returns to (or stays near) the pickup area.
    destinationPlaceId: args.pickupPlaceId,
    pickupCoord: args.pickupCoord ?? null,
    destinationCoord: args.pickupCoord ?? null,
    vehicleId: args.profile.vehicle.id,
    vehicleClassId: args.profile.vehicle.class_id,
    date: args.date,
    time: args.time,
    serviceType: HOURLY_SERVICE_TYPE,
    distanceMiles: 0,
    isReturn: false,
  };
}

export type HourlyRuleOutcome = {
  available: boolean;
  availabilityMessage: string | null;
  availabilityAdminReason: string | null;
  /** Base after modifiers, before discounts. */
  adjustedBase: number;
  adjustments: Array<{ label: string; amount: number }>;
  discountLines: Array<{ label: string; amount: number }>;
  discountTotal: number;
  total: number;
  appliedRules: AppliedRule[];
  reasons: string[];
};

/**
 * Apply availability, modifiers and rule discounts to an hourly base price.
 * `base` is already hours × per-hour × vehicle count, pre-extras.
 */
export function applyHourlyRules(args: {
  ruleSets: RuleSets;
  ctx: JourneyContext;
  base: number;
}): HourlyRuleOutcome {
  const { ruleSets, ctx } = args;
  const appliedRules: AppliedRule[] = [];
  const reasons: string[] = [];

  const verdict = resolveAvailability(ruleSets.availabilityRules, ctx);
  if (verdict.rule) {
    appliedRules.push({
      stage: "availability",
      rule_id: verdict.rule.id,
      label: verdict.rule.name,
      detail: verdict.adminReason ?? undefined,
    });
  }

  const base = round2(Math.max(0, args.base));
  const modResult = matchModifiers(ruleSets.modifiers, ctx);
  reasons.push(...modResult.reasons);

  const adjustments: Array<{ label: string; amount: number }> = [];
  let adjustedBase = base;
  for (const m of modResult.applied) {
    const amount =
      m.modifier_type === "percent" ? round2((base * Number(m.value)) / 100) : round2(Number(m.value));
    if (amount === 0) continue;
    adjustedBase = round2(adjustedBase + amount);
    adjustments.push({ label: m.name, amount });
    appliedRules.push({
      stage: "modifier",
      rule_id: m.id,
      label: m.name,
      amount,
      detail: m.modifier_type === "percent" ? `${m.value}%` : `${m.value}`,
    });
  }
  adjustedBase = round2(Math.max(0, adjustedBase));

  const discResult = matchDiscounts(ruleSets.discountRules, ctx, adjustedBase);
  reasons.push(...discResult.reasons);
  const discountLines = discResult.applied.map((d) => ({ label: d.rule.name, amount: round2(d.amount) }));
  for (const d of discResult.applied) {
    appliedRules.push({ stage: "discount", rule_id: d.rule.id, label: d.rule.name, amount: round2(d.amount) });
  }
  const discountTotal = Math.min(
    adjustedBase,
    round2(discountLines.reduce((s, d) => s + d.amount, 0)),
  );

  return {
    available: verdict.available,
    availabilityMessage: verdict.message,
    availabilityAdminReason: verdict.adminReason,
    adjustedBase,
    adjustments,
    discountLines,
    discountTotal,
    total: round2(Math.max(0, adjustedBase - discountTotal)),
    appliedRules,
    reasons,
  };
}

export type HourlyCard = {
  vehicleId: string;
  name: string;
  category: string;
  imageUrl: string;
  passengers: number;
  luggage: number;
  handLuggage: number;
  pricePerHour: number;
  minHours: number;
  maxHours: number;
  chargedHours: number;
  /** Base before rule adjustments (hours × per-hour). */
  baseTotal: number;
  /** Rule-driven uplifts / reductions applied to the base. */
  adjustments: Array<{ label: string; amount: number }>;
  discountLines: Array<{ label: string; amount: number }>;
  /** Net of tax (equals `total` when tax is exclusive and 0%). */
  netTotal: number;
  taxAmount: number;
  /** Gross payable for the hire, tax applied per the site tax mode. */
  total: number;
  minimumApplied: boolean;
  quoteOnRequest: boolean;
  classSlug: string;
  classDisplayOrder: number;
};

/**
 * Build customer-facing hourly cards. Classes blocked by an availability rule
 * are omitted entirely, matching the transfer quote behaviour.
 */
export function buildHourlyCards(args: {
  profiles: LoadedProfile[];
  rates: Map<string, HourlyRateRow>;
  hours: number;
  ruleSets: RuleSets | null;
  pickupPlaceId?: string;
  pickupCoord?: { lat: number; lng: number } | null;
  date?: string;
  time?: string;
  taxRate?: number;
  taxMode?: TaxMode;
}): HourlyCard[] {
  const cards: HourlyCard[] = [];
  for (const p of args.profiles) {
    const rate = args.rates.get(p.vehicle.id);
    if (!rate) continue;
    const min = Math.max(1, Number(rate.min_hours) || 1);
    const max = Math.max(min, Number(rate.max_hours) || 24);
    if (args.hours > max) continue;
    const chargedHours = Math.max(args.hours, min);
    const perHour = Math.max(0, Number(rate.price_per_hour) || 0);
    const baseTotal = round2(perHour * chargedHours);

    let total = baseTotal;
    let adjustments: Array<{ label: string; amount: number }> = [];
    let discountLines: Array<{ label: string; amount: number }> = [];

    if (args.ruleSets) {
      const ctx = hourlyJourneyContext({
        profile: p,
        pickupPlaceId: args.pickupPlaceId ?? "",
        pickupCoord: args.pickupCoord ?? null,
        date: args.date,
        time: args.time,
      });
      const outcome = applyHourlyRules({ ruleSets: args.ruleSets, ctx, base: baseTotal });
      if (!outcome.available) continue;
      total = outcome.total;
      adjustments = outcome.adjustments;
      discountLines = outcome.discountLines;
    }

    const taxed = applyTaxTo(total, args.taxRate ?? 0, args.taxMode ?? "exclusive");

    cards.push({
      vehicleId: p.vehicle.id,
      name: p.vehicle.name,
      category: p.vehicle.category,
      imageUrl: p.vehicle.image_url,
      passengers: p.vehicle.passengers,
      luggage: p.vehicle.luggage,
      handLuggage: p.vehicle.hand_luggage,
      pricePerHour: perHour,
      minHours: min,
      maxHours: max,
      chargedHours,
      baseTotal,
      adjustments,
      discountLines,
      netTotal: taxed.net,
      taxAmount: taxed.tax,
      total: taxed.gross,
      minimumApplied: chargedHours > args.hours,
      quoteOnRequest: p.vehicle.class_quote_on_request,
      classSlug: p.vehicle.class_slug,
      classDisplayOrder: p.vehicle.class_display_order,
    });
  }
  return cards.sort((a, b) => a.classDisplayOrder - b.classDisplayOrder || a.total - b.total);
}
