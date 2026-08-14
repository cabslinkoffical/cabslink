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
