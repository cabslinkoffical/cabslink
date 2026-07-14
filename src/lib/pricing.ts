/**
 * Tiered mileage pricing engine — pure, isomorphic.
 * Same code runs on the server (quote calc) and in the admin "Test pricing" UI.
 *
 * Bump ENGINE_VERSION when the pricing formula changes so historical
 * snapshots can be interpreted correctly.
 */

export const ENGINE_VERSION = "2026.07.2" as const;

export type PricingTier = {
  id?: string;
  tier_name: string;
  miles: number;
  cost_per_mile: number;
  sort_order: number;
};

export type PricingProfile = {
  id?: string;
  vehicle_id: string;
  base_price: number;
  via_price: number;
  vehicle_add_price_enabled: boolean;
  time_extra_from: string | null;
  time_extra_to: string | null;
  time_extra_amount: number;
  time_extra_type: "fixed" | "percent";
  status: boolean;
  tiers: PricingTier[];
};

export type BreakdownLine =
  | { kind: "base"; label: string; amount: number }
  | { kind: "mileage"; label: string; miles: number; rate: number; amount: number }
  | { kind: "via"; label: string; count: number; amount: number }
  | { kind: "surcharge"; label: string; amount: number }
  | { kind: "time_extra"; label: string; amount: number }
  | { kind: "discount"; label: string; amount: number }
  | { kind: "tax"; label: string; rate: number; amount: number }
  | { kind: "stop_fee"; label: string; count: number; amount: number }
  | { kind: "stop_time"; label: string; extra_minutes: number; amount: number }
  | { kind: "parking"; label: string; amount: number }
  | { kind: "scenic_fee"; label: string; amount: number };

export type QuoteOptions = {
  distanceMiles: number;
  viaStops?: number;
  pickupTime?: string; // "HH:MM"
  surcharges?: { label: string; amount: number }[];
  discountAmount?: number;
  taxRate?: number; // 0–1
};

export type QuoteResult = {
  basePrice: number;
  mileagePrice: number;
  viaPrice: number;
  surchargePrice: number;
  timeExtraPrice: number;
  discountPrice: number;
  taxPrice: number;
  subtotal: number;
  finalPrice: number;
  breakdown: BreakdownLine[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function timeInWindow(time: string, from: string | null, to: string | null) {
  if (!from || !to) return false;
  const [h, m] = time.split(":").map(Number);
  const t = h * 60 + m;
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  const f = fh * 60 + fm;
  const e = th * 60 + tm;
  if (f <= e) return t >= f && t <= e;
  return t >= f || t <= e;
}

export function runPricingEngine(profile: PricingProfile, opts: QuoteOptions): QuoteResult {
  const breakdown: BreakdownLine[] = [];

  const basePrice = Number(profile.base_price) || 0;
  breakdown.push({ kind: "base", label: "Base price", amount: round2(basePrice) });

  const tiers = [...(profile.tiers ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  let remaining = Math.max(0, Number(opts.distanceMiles) || 0);
  let mileagePrice = 0;
  for (const tier of tiers) {
    if (remaining <= 0) break;
    const milesInTier = Math.min(remaining, Number(tier.miles) || 0);
    if (milesInTier <= 0) continue;
    const rate = Number(tier.cost_per_mile) || 0;
    const amount = round2(milesInTier * rate);
    mileagePrice += amount;
    breakdown.push({
      kind: "mileage",
      label: tier.tier_name,
      miles: round2(milesInTier),
      rate,
      amount,
    });
    remaining -= milesInTier;
  }
  mileagePrice = round2(mileagePrice);

  const stops = Math.max(0, opts.viaStops ?? 0);
  const viaPrice = round2(stops * (Number(profile.via_price) || 0));
  if (stops > 0 && viaPrice > 0) {
    breakdown.push({ kind: "via", label: `${stops} via stop(s)`, count: stops, amount: viaPrice });
  }

  let timeExtraPrice = 0;
  if (
    opts.pickupTime &&
    profile.time_extra_amount > 0 &&
    timeInWindow(opts.pickupTime, profile.time_extra_from, profile.time_extra_to)
  ) {
    if (profile.time_extra_type === "percent") {
      timeExtraPrice = round2(((basePrice + mileagePrice) * Number(profile.time_extra_amount)) / 100);
    } else {
      timeExtraPrice = round2(Number(profile.time_extra_amount));
    }
    breakdown.push({
      kind: "time_extra",
      label: `Time surcharge (${profile.time_extra_from}–${profile.time_extra_to})`,
      amount: timeExtraPrice,
    });
  }

  let surchargePrice = 0;
  for (const s of opts.surcharges ?? []) {
    surchargePrice += Number(s.amount) || 0;
    breakdown.push({ kind: "surcharge", label: s.label, amount: round2(Number(s.amount) || 0) });
  }
  surchargePrice = round2(surchargePrice);

  const discountPrice = round2(Math.max(0, opts.discountAmount ?? 0));
  if (discountPrice > 0) {
    breakdown.push({ kind: "discount", label: "Discount", amount: -discountPrice });
  }

  const subtotal = round2(
    basePrice + mileagePrice + viaPrice + timeExtraPrice + surchargePrice - discountPrice,
  );
  const taxRate = Math.max(0, Math.min(1, opts.taxRate ?? 0));
  const taxPrice = round2(subtotal * taxRate);
  if (taxPrice > 0) {
    breakdown.push({ kind: "tax", label: `Tax (${(taxRate * 100).toFixed(0)}%)`, rate: taxRate, amount: taxPrice });
  }

  const finalPrice = round2(subtotal + taxPrice);

  return {
    basePrice: round2(basePrice),
    mileagePrice,
    viaPrice,
    surchargePrice,
    timeExtraPrice,
    discountPrice,
    taxPrice,
    subtotal,
    finalPrice,
    breakdown,
  };
}

// ---------------------------------------------------------------------------
// Stop charges — pure, isomorphic.
//
// For each selected POI:
//   • per-stop base fee (stop_fee_pence)
//   • planned-time uplift above `includedStopMinutes`, billed per whole 15 min
//     block at `pricePerExtra15minPence`
//   • parking fee (parking_fee_pence)
// Plus an optional scenic/tour fee (scenic_route_templates.tour_fee_pence).
//
// All monetary inputs are in **pence** for lossless integer math; output is
// in the same currency unit as the rest of the engine (major units).
// ---------------------------------------------------------------------------

export type StopChargeInput = {
  name: string;
  minutes: number;
  stop_fee_pence: number;
  parking_fee_pence: number;
};

export type StopChargesResult = {
  stopFeeTotal: number;
  stopTimeTotal: number;
  parkingTotal: number;
  scenicFee: number;
  addedTotal: number;
  breakdown: BreakdownLine[];
  extraMinutesTotal: number;
};

export function computeStopCharges(args: {
  stops: readonly StopChargeInput[];
  includedStopMinutes: number;
  pricePerExtra15minPence: number;
  scenicFeePence?: number;
}): StopChargesResult {
  const breakdown: BreakdownLine[] = [];
  let stopFeeP = 0;
  let stopTimeP = 0;
  let parkingP = 0;
  let extraMinutes = 0;

  const included = Math.max(0, Math.floor(Number(args.includedStopMinutes) || 0));
  const per15 = Math.max(0, Math.floor(Number(args.pricePerExtra15minPence) || 0));

  for (const s of args.stops) {
    const fee = Math.max(0, Math.floor(Number(s.stop_fee_pence) || 0));
    const parking = Math.max(0, Math.floor(Number(s.parking_fee_pence) || 0));
    stopFeeP += fee;
    parkingP += parking;
    const mins = Math.max(0, Math.floor(Number(s.minutes) || 0));
    const overrun = Math.max(0, mins - included);
    if (overrun > 0 && per15 > 0) {
      const blocks = Math.ceil(overrun / 15);
      stopTimeP += blocks * per15;
      extraMinutes += overrun;
    }
  }

  const scenicP = Math.max(0, Math.floor(Number(args.scenicFeePence ?? 0)));

  const stopFeeTotal = round2(stopFeeP / 100);
  const stopTimeTotal = round2(stopTimeP / 100);
  const parkingTotal = round2(parkingP / 100);
  const scenicFee = round2(scenicP / 100);

  if (stopFeeTotal > 0) {
    breakdown.push({
      kind: "stop_fee",
      label: `Stop fees (${args.stops.length} stop${args.stops.length === 1 ? "" : "s"})`,
      count: args.stops.length,
      amount: stopFeeTotal,
    });
  }
  if (stopTimeTotal > 0) {
    breakdown.push({
      kind: "stop_time",
      label: `Extra time at stops (${extraMinutes} min)`,
      extra_minutes: extraMinutes,
      amount: stopTimeTotal,
    });
  }
  if (parkingTotal > 0) {
    breakdown.push({ kind: "parking", label: "Parking fees", amount: parkingTotal });
  }
  if (scenicFee > 0) {
    breakdown.push({ kind: "scenic_fee", label: "Scenic route fee", amount: scenicFee });
  }

  return {
    stopFeeTotal,
    stopTimeTotal,
    parkingTotal,
    scenicFee,
    addedTotal: round2(stopFeeTotal + stopTimeTotal + parkingTotal + scenicFee),
    breakdown,
    extraMinutesTotal: extraMinutes,
  };
}
