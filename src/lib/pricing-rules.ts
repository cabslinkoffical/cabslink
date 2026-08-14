/**
 * Pure, isomorphic rule matchers for the Cabslink pricing engine.
 *
 * These functions never touch the network or the database — the server
 * loaders in `pricing-helpers.server.ts` fetch the rows, resolve Place IDs to
 * coordinates via `place_coords`, and hand plain objects to the matchers here.
 * That keeps precedence logic unit-testable and deterministic.
 *
 * APPROVED PRECEDENCE (base price source, first category with a match wins):
 *   1. exact fixed route (Place-ID pair)
 *   2. radius fixed route
 *   3. location / radius pricing
 *   4. mileage tiers (existing behaviour, unchanged)
 * Within a category: highest priority → narrowest radius → lowest price → id.
 */

export type Coord = { lat: number; lng: number };

const EARTH_MILES = 3958.7613;
const toRad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in statute miles. */
export function haversineMiles(a: Coord, b: Coord): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_MILES * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function withinRadius(point: Coord | null | undefined, centre: Coord | null | undefined, radiusMiles: number | null | undefined): boolean {
  if (!point || !centre) return false;
  const r = Number(radiusMiles) || 0;
  if (r <= 0) return false;
  return haversineMiles(point, centre) <= r;
}

// ---------------------------------------------------------------------------
// Shared journey context
// ---------------------------------------------------------------------------

export type GeoScope = "pickup" | "destination" | "either";

export type JourneyContext = {
  pickupPlaceId: string;
  destinationPlaceId: string;
  pickupCoord?: Coord | null;
  destinationCoord?: Coord | null;
  /** Proxy vehicle id (legacy pricing key). */
  vehicleId?: string | null;
  vehicleClassId?: string | null;
  /** ISO date `YYYY-MM-DD`. */
  date?: string;
  /** `HH:MM`, 24h. */
  time?: string;
  serviceType?: string;
  distanceMiles: number;
  isReturn?: boolean;
};

/** 0 = Sunday … 6 = Saturday, matching Postgres `extract(dow)`. */
export function dayOfWeek(date?: string): number | null {
  if (!date) return null;
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.getUTCDay();
}

function minutes(hhmm?: string | null): number | null {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Inclusive window; supports windows that wrap past midnight. */
export function timeWithin(time: string | undefined, from: string | null | undefined, to: string | null | undefined): boolean {
  const t = minutes(time);
  const f = minutes(from);
  const e = minutes(to);
  if (f == null || e == null) return true; // no window configured → always
  if (t == null) return false;
  return f <= e ? t >= f && t <= e : t >= f || t <= e;
}

function dateWithin(date: string | undefined, from: string | null | undefined, to: string | null | undefined): boolean {
  if (!from && !to) return true;
  if (!date) return false;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function timestampWithin(date: string | undefined, time: string | undefined, from: string | null | undefined, to: string | null | undefined): boolean {
  if (!from && !to) return true;
  if (!date) return false;
  const at = new Date(`${date}T${(time && /^\d{1,2}:\d{2}/.test(time) ? time : "00:00")}:00Z`).getTime();
  if (Number.isNaN(at)) return false;
  if (from && at < new Date(from).getTime()) return false;
  if (to && at > new Date(to).getTime()) return false;
  return true;
}

function dowMatches(days: number[] | null | undefined, date?: string): boolean {
  if (!days || days.length === 0) return true;
  const dow = dayOfWeek(date);
  if (dow == null) return false;
  return days.map(Number).includes(dow);
}

function classMatches(ruleClassId: string | null | undefined, ruleVehicleId: string | null | undefined, ctx: JourneyContext): boolean {
  if (ruleClassId) return ruleClassId === ctx.vehicleClassId;
  if (ruleVehicleId) return ruleVehicleId === ctx.vehicleId;
  return true; // unscoped rule applies to every class
}

function serviceMatches(types: string[] | null | undefined, ctx: JourneyContext): boolean {
  if (!types || types.length === 0) return true;
  if (!ctx.serviceType) return false;
  return types.includes(ctx.serviceType);
}

function geoMatches(
  rule: { lat?: number | null; lng?: number | null; radius_miles?: number | null; place_id?: string | null; scope?: GeoScope | string | null },
  ctx: JourneyContext,
): boolean {
  const scope = (rule.scope as GeoScope) ?? "either";
  const hasGeo = (rule.lat != null && rule.lng != null && Number(rule.radius_miles) > 0) || !!rule.place_id;
  if (!hasGeo) return true; // no location scope → global rule
  const centre = rule.lat != null && rule.lng != null ? { lat: Number(rule.lat), lng: Number(rule.lng) } : null;

  const hitPickup =
    (!!rule.place_id && rule.place_id === ctx.pickupPlaceId) ||
    withinRadius(ctx.pickupCoord, centre, rule.radius_miles);
  const hitDest =
    (!!rule.place_id && rule.place_id === ctx.destinationPlaceId) ||
    withinRadius(ctx.destinationCoord, centre, rule.radius_miles);

  if (scope === "pickup") return hitPickup;
  if (scope === "destination") return hitDest;
  return hitPickup || hitDest;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// 1 + 2. Fixed route rules
// ---------------------------------------------------------------------------

export type FixedRouteRule = {
  id: string;
  vehicle_id: string | null;
  vehicle_class_id: string | null;
  price: number;
  from_place_id: string | null;
  to_place_id: string | null;
  from_lat: number | null;
  from_lng: number | null;
  to_lat: number | null;
  to_lng: number | null;
  from_radius_miles: number;
  to_radius_miles: number;
  bidirectional: boolean;
  valid_for_return: boolean;
  priority: number;
  valid_from: string | null;
  valid_to: string | null;
  active: boolean;
};

export type FixedRouteMatch = {
  rule: FixedRouteRule;
  kind: "exact" | "radius";
  /** Sum of both radii — smaller is more specific. */
  specificity: number;
  price: number;
  reversed: boolean;
};

function endpointHit(
  placeId: string | null,
  lat: number | null,
  lng: number | null,
  radius: number,
  targetPlaceId: string,
  targetCoord: Coord | null | undefined,
): { hit: boolean; exact: boolean } {
  if (placeId && placeId === targetPlaceId) return { hit: true, exact: true };
  if (lat != null && lng != null && Number(radius) > 0) {
    return { hit: withinRadius(targetCoord, { lat: Number(lat), lng: Number(lng) }, radius), exact: false };
  }
  return { hit: false, exact: false };
}

/**
 * Resolve the winning fixed-route rule. Exact Place-ID pairs always beat
 * radius matches. Returns `null` plus reasons when nothing matched.
 */
export function matchFixedRoute(
  rules: readonly FixedRouteRule[],
  ctx: JourneyContext,
): { match: FixedRouteMatch | null; candidates: FixedRouteMatch[]; reasons: string[] } {
  const reasons: string[] = [];
  const candidates: FixedRouteMatch[] = [];

  for (const r of rules) {
    if (r.active === false) continue;
    if (!classMatches(r.vehicle_class_id, r.vehicle_id, ctx)) continue;
    if (!dateWithin(ctx.date, r.valid_from, r.valid_to)) {
      reasons.push(`Fixed route "${r.id}" skipped: outside its valid date range.`);
      continue;
    }
    if (ctx.isReturn && r.valid_for_return === false) {
      reasons.push(`Fixed route "${r.id}" skipped: not valid for return journeys.`);
      continue;
    }

    const forwardFrom = endpointHit(r.from_place_id, r.from_lat, r.from_lng, r.from_radius_miles, ctx.pickupPlaceId, ctx.pickupCoord);
    const forwardTo = endpointHit(r.to_place_id, r.to_lat, r.to_lng, r.to_radius_miles, ctx.destinationPlaceId, ctx.destinationCoord);
    if (forwardFrom.hit && forwardTo.hit) {
      candidates.push({
        rule: r,
        kind: forwardFrom.exact && forwardTo.exact ? "exact" : "radius",
        specificity: Number(r.from_radius_miles || 0) + Number(r.to_radius_miles || 0),
        price: Number(r.price),
        reversed: false,
      });
      continue;
    }

    if (r.bidirectional === true) {
      const revFrom = endpointHit(r.from_place_id, r.from_lat, r.from_lng, r.from_radius_miles, ctx.destinationPlaceId, ctx.destinationCoord);
      const revTo = endpointHit(r.to_place_id, r.to_lat, r.to_lng, r.to_radius_miles, ctx.pickupPlaceId, ctx.pickupCoord);
      if (revFrom.hit && revTo.hit) {
        candidates.push({
          rule: r,
          kind: revFrom.exact && revTo.exact ? "exact" : "radius",
          specificity: Number(r.from_radius_miles || 0) + Number(r.to_radius_miles || 0),
          price: Number(r.price),
          reversed: true,
        });
      }
    }
  }

  if (candidates.length === 0) {
    reasons.push("No fixed-route rule matched this pickup/destination pair.");
    return { match: null, candidates, reasons };
  }

  const exact = candidates.filter((c) => c.kind === "exact");
  const pool = exact.length > 0 ? exact : candidates;
  const sorted = [...pool].sort(compareRuleCandidates);
  return { match: sorted[0]!, candidates: sorted, reasons };
}

function compareRuleCandidates(a: { rule: { priority: number; id: string }; specificity: number; price: number }, b: { rule: { priority: number; id: string }; specificity: number; price: number }) {
  const p = Number(b.rule.priority ?? 100) - Number(a.rule.priority ?? 100);
  if (p !== 0) return p;
  const s = a.specificity - b.specificity;
  if (s !== 0) return s;
  const pr = a.price - b.price;
  if (pr !== 0) return pr;
  return a.rule.id < b.rule.id ? -1 : a.rule.id > b.rule.id ? 1 : 0;
}

/** Detect fixed-route rules that would both win at equal priority/specificity. */
export function detectFixedRouteConflicts(candidates: readonly FixedRouteMatch[]): FixedRouteMatch[] {
  if (candidates.length < 2) return [];
  const first = candidates[0]!;
  return candidates.filter(
    (c) =>
      c !== first &&
      c.kind === first.kind &&
      Number(c.rule.priority ?? 100) === Number(first.rule.priority ?? 100) &&
      c.specificity === first.specificity &&
      c.price !== first.price,
  );
}

// ---------------------------------------------------------------------------
// 3. Location / radius pricing
// ---------------------------------------------------------------------------

export type LocationPricingRule = {
  id: string;
  name: string;
  place_id: string | null;
  lat: number | null;
  lng: number | null;
  radius_miles: number;
  included_distance_miles: number;
  price_type: "fixed" | "base";
  price: number;
  extra_per_mile: number;
  scope: GeoScope;
  vehicle_class_id: string | null;
  priority: number;
  active: boolean;
};

export type LocationPricingMatch = {
  rule: LocationPricingRule;
  /** Total base price this rule produces for the journey. */
  amount: number;
};

export function matchLocationPricing(
  rules: readonly LocationPricingRule[],
  ctx: JourneyContext,
): { match: LocationPricingMatch | null; candidates: LocationPricingMatch[]; reasons: string[] } {
  const reasons: string[] = [];
  const hits: LocationPricingRule[] = [];

  for (const r of rules) {
    if (r.active === false) continue;
    if (!classMatches(r.vehicle_class_id, null, ctx)) continue;
    if (!geoMatches({ lat: r.lat, lng: r.lng, radius_miles: r.radius_miles, place_id: r.place_id, scope: r.scope }, ctx)) continue;
    hits.push(r);
  }

  if (hits.length === 0) {
    reasons.push("No location/radius pricing rule covered the pickup or destination.");
    return { match: null, candidates: [], reasons };
  }

  const priced = hits
    .map((rule) => ({ rule, amount: locationRuleAmount(rule, ctx.distanceMiles) }))
    .sort((a, b) =>
      compareRuleCandidates(
        { rule: a.rule, specificity: Number(a.rule.radius_miles || 0), price: a.amount },
        { rule: b.rule, specificity: Number(b.rule.radius_miles || 0), price: b.amount },
      ),
    );

  return { match: priced[0]!, candidates: priced, reasons };
}

export function locationRuleAmount(rule: LocationPricingRule, distanceMiles: number): number {
  const base = Number(rule.price) || 0;
  if (rule.price_type === "fixed") return round2(base);
  const included = Math.max(0, Number(rule.included_distance_miles) || 0);
  const extraMiles = Math.max(0, (Number(distanceMiles) || 0) - included);
  return round2(base + extraMiles * (Number(rule.extra_per_mile) || 0));
}

// ---------------------------------------------------------------------------
// Surcharge rules (existing `surcharges` table, now read by the engine)
// ---------------------------------------------------------------------------

export type SurchargeRule = {
  id: string;
  name: string;
  charge_type: string; // 'fixed' | 'percentage'
  amount: number;
  applies_to: string | null;
  vehicle_id: string | null;
  vehicle_class_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  days_of_week: number[] | null;
  time_from: string | null;
  time_to: string | null;
  priority: number;
  active: boolean;
};

/** Surcharge rows that apply to this journey, sorted by priority. */
export function matchSurcharges(rules: readonly SurchargeRule[], ctx: JourneyContext): SurchargeRule[] {
  return rules
    .filter((r) => r.active !== false)
    .filter((r) => classMatches(r.vehicle_class_id, r.vehicle_id, ctx))
    .filter((r) => timestampWithin(ctx.date, ctx.time, r.starts_at, r.ends_at))
    .filter((r) => dowMatches(r.days_of_week, ctx.date))
    .filter((r) => timeWithin(ctx.time, r.time_from, r.time_to))
    .filter((r) => serviceMatches(r.applies_to ? [r.applies_to] : null, ctx) || !ctx.serviceType)
    .sort((a, b) => Number(b.priority ?? 100) - Number(a.priority ?? 100) || (a.id < b.id ? -1 : 1));
}

// ---------------------------------------------------------------------------
// Modifiers
// ---------------------------------------------------------------------------

export type ModifierRule = {
  id: string;
  name: string;
  modifier_type: "percent" | "fixed";
  value: number;
  vehicle_class_id: string | null;
  service_types: string[] | null;
  place_id: string | null;
  lat: number | null;
  lng: number | null;
  radius_miles: number | null;
  scope: GeoScope;
  date_from: string | null;
  date_to: string | null;
  days_of_week: number[] | null;
  time_from: string | null;
  time_to: string | null;
  stackable: boolean;
  priority: number;
  active: boolean;
};

/**
 * Non-stackable modifiers: only the single highest-priority match applies.
 * Stackable modifiers: all matches apply, in descending priority order.
 */
export function matchModifiers(
  rules: readonly ModifierRule[],
  ctx: JourneyContext,
): { applied: ModifierRule[]; skipped: ModifierRule[]; reasons: string[] } {
  const reasons: string[] = [];
  const eligible = rules
    .filter((r) => r.active !== false)
    .filter((r) => classMatches(r.vehicle_class_id, null, ctx))
    .filter((r) => serviceMatches(r.service_types, ctx))
    .filter((r) => dateWithin(ctx.date, r.date_from, r.date_to))
    .filter((r) => dowMatches(r.days_of_week, ctx.date))
    .filter((r) => timeWithin(ctx.time, r.time_from, r.time_to))
    .filter((r) => geoMatches({ lat: r.lat, lng: r.lng, radius_miles: r.radius_miles, place_id: r.place_id, scope: r.scope }, ctx))
    .sort((a, b) => Number(b.priority ?? 100) - Number(a.priority ?? 100) || (a.id < b.id ? -1 : 1));

  const stackable = eligible.filter((r) => r.stackable === true);
  const exclusive = eligible.filter((r) => r.stackable !== true);
  const applied = [...stackable];
  const skipped: ModifierRule[] = [];

  if (exclusive.length > 0) {
    applied.push(exclusive[0]!);
    for (const r of exclusive.slice(1)) {
      skipped.push(r);
      reasons.push(`Modifier "${r.name}" not applied: a higher-priority non-stackable modifier won.`);
    }
  }

  applied.sort((a, b) => Number(b.priority ?? 100) - Number(a.priority ?? 100) || (a.id < b.id ? -1 : 1));
  return { applied, skipped, reasons };
}

// ---------------------------------------------------------------------------
// Discount rules (radius / class / location / event)
// ---------------------------------------------------------------------------

export type DiscountRule = {
  id: string;
  name: string;
  basis: "radius" | "vehicle_class" | "location" | "event";
  discount_type: "percent" | "fixed";
  value: number;
  event_name: string | null;
  place_id: string | null;
  lat: number | null;
  lng: number | null;
  radius_miles: number | null;
  scope: GeoScope;
  starts_at: string | null;
  ends_at: string | null;
  vehicle_class_ids: string[] | null;
  service_types: string[] | null;
  max_discount: number | null;
  stackable: boolean;
  priority: number;
  active: boolean;
};

export function discountAmountFor(rule: DiscountRule, base: number): number {
  const raw = rule.discount_type === "percent" ? (base * (Number(rule.value) || 0)) / 100 : Number(rule.value) || 0;
  const capped = rule.max_discount != null ? Math.min(raw, Number(rule.max_discount)) : raw;
  return round2(Math.max(0, Math.min(capped, base)));
}

/**
 * Default policy: the single best eligible discount wins.
 * Rules flagged `stackable` combine with each other in priority order; if any
 * stackable rules match, they are applied together and compared against the
 * best single non-stackable rule — the larger total wins.
 */
export type DiscountMatchResult = {
  applied: Array<{ rule: DiscountRule; amount: number }>;
  /** Sum of applied amounts, capped so discounts never exceed `base`. */
  total: number;
  reasons: string[];
};

/** Cap the applied lines so their sum never exceeds the pre-VAT base. */
function capApplied(applied: Array<{ rule: DiscountRule; amount: number }>, base: number): DiscountMatchResult["applied"] {
  const limit = Math.max(0, round2(base));
  let running = 0;
  const out: DiscountMatchResult["applied"] = [];
  for (const line of applied) {
    const room = round2(limit - running);
    if (room <= 0) break;
    const amount = round2(Math.min(line.amount, room));
    if (amount <= 0) continue;
    running = round2(running + amount);
    out.push({ rule: line.rule, amount });
  }
  return out;
}

export function matchDiscounts(
  rules: readonly DiscountRule[],
  ctx: JourneyContext,
  base: number,
): DiscountMatchResult {
  const reasons: string[] = [];
  const eligible = rules
    .filter((r) => r.active !== false)
    .filter((r) => !r.vehicle_class_ids || r.vehicle_class_ids.length === 0 || (ctx.vehicleClassId != null && r.vehicle_class_ids.includes(ctx.vehicleClassId)))
    .filter((r) => serviceMatches(r.service_types, ctx))
    .filter((r) => timestampWithin(ctx.date, ctx.time, r.starts_at, r.ends_at))
    .filter((r) => geoMatches({ lat: r.lat, lng: r.lng, radius_miles: r.radius_miles, place_id: r.place_id, scope: r.scope }, ctx))
    .sort((a, b) => Number(b.priority ?? 100) - Number(a.priority ?? 100) || (a.id < b.id ? -1 : 1));

  const finish = (applied: DiscountMatchResult["applied"]): DiscountMatchResult => {
    const capped = capApplied(applied, base);
    return { applied: capped, total: capped.reduce((s, l) => round2(s + l.amount), 0), reasons };
  };

  if (eligible.length === 0) {
    reasons.push("No discount rule matched this journey.");
    return finish([]);
  }

  const stackables = eligible.filter((r) => r.stackable === true);
  const singles = eligible.filter((r) => r.stackable !== true);

  const stackTotal = stackables.reduce((sum, r) => round2(sum + discountAmountFor(r, base)), 0);
  const bestSingle = singles
    .map((rule) => ({ rule, amount: discountAmountFor(rule, base) }))
    .sort((a, b) => b.amount - a.amount || (a.rule.id < b.rule.id ? -1 : 1))[0];

  if (stackables.length > 0 && stackTotal >= (bestSingle?.amount ?? 0)) {
    for (const r of singles) reasons.push(`Discount "${r.name}" not applied: stackable rules produced a better total.`);
    return finish(stackables.map((rule) => ({ rule, amount: discountAmountFor(rule, base) })));
  }

  if (!bestSingle) return finish([]);
  for (const r of eligible) {
    if (r.id !== bestSingle.rule.id) reasons.push(`Discount "${r.name}" not applied: best-single-discount policy selected "${bestSingle.rule.name}".`);
  }
  return finish([bestSingle]);
}

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

export type CouponRow = {
  id: string;
  code: string;
  discount_type: "fixed" | "percentage";
  discount_value: number;
  min_booking_amount: number | null;
  usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  active: boolean;
  applicable_vehicle_classes: string[] | null;
  applies_to_service_types: string[] | null;
  max_discount: number | null;
  per_customer_limit: number | null;
  stackable: boolean;
};

export type CouponValidation =
  | { ok: true; coupon: CouponRow; amount: number }
  | { ok: false; reason: string };

/**
 * Validate a coupon against a journey. `base` is the pre-VAT subtotal the
 * coupon discounts. `customerRedemptions` is how many times this email has
 * already redeemed the coupon.
 */
export function validateCoupon(
  coupon: CouponRow | null | undefined,
  args: {
    base: number;
    date?: string;
    vehicleClassId?: string | null;
    classSlug?: string | null;
    serviceType?: string;
    customerRedemptions?: number;
  },
): CouponValidation {
  if (!coupon) return { ok: false, reason: "That promo code isn't valid." };
  if (coupon.active === false) return { ok: false, reason: "That promo code is no longer active." };

  const today = args.date && /^\d{4}-\d{2}-\d{2}$/.test(args.date) ? args.date : new Date().toISOString().slice(0, 10);
  if (coupon.starts_at && today < coupon.starts_at) return { ok: false, reason: "That promo code isn't valid yet." };
  if (coupon.expires_at && today > coupon.expires_at) return { ok: false, reason: "That promo code has expired." };

  if (coupon.usage_limit != null && Number(coupon.used_count) >= Number(coupon.usage_limit)) {
    return { ok: false, reason: "That promo code has reached its usage limit." };
  }
  if (coupon.per_customer_limit != null && Number(args.customerRedemptions ?? 0) >= Number(coupon.per_customer_limit)) {
    return { ok: false, reason: "You've already used that promo code." };
  }
  if (coupon.min_booking_amount != null && args.base < Number(coupon.min_booking_amount)) {
    return { ok: false, reason: `That promo code needs a minimum journey value of ${Number(coupon.min_booking_amount).toFixed(2)}.` };
  }

  const classes = coupon.applicable_vehicle_classes;
  if (classes && classes.length > 0) {
    const keys = [args.vehicleClassId, args.classSlug].filter(Boolean) as string[];
    if (!keys.some((k) => classes.includes(k))) {
      return { ok: false, reason: "That promo code doesn't apply to the selected vehicle class." };
    }
  }
  const svc = coupon.applies_to_service_types;
  if (svc && svc.length > 0 && (!args.serviceType || !svc.includes(args.serviceType))) {
    return { ok: false, reason: "That promo code doesn't apply to this service." };
  }

  const raw =
    coupon.discount_type === "percentage"
      ? (args.base * (Number(coupon.discount_value) || 0)) / 100
      : Number(coupon.discount_value) || 0;
  const capped = coupon.max_discount != null ? Math.min(raw, Number(coupon.max_discount)) : raw;
  const amount = round2(Math.max(0, Math.min(capped, args.base)));
  if (amount <= 0) return { ok: false, reason: "That promo code has no value for this journey." };
  return { ok: true, coupon, amount };
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

export type AvailabilityRule = {
  id: string;
  name: string;
  rule_scope: "global" | "service" | "vehicle_class" | "vehicle";
  vehicle_class_id: string | null;
  vehicle_id: string | null;
  service_types: string[] | null;
  effect: "block" | "allow";
  date_from: string | null;
  date_to: string | null;
  days_of_week: number[] | null;
  time_from: string | null;
  time_to: string | null;
  place_id: string | null;
  lat: number | null;
  lng: number | null;
  radius_miles: number | null;
  scope: GeoScope;
  reason: string | null;
  priority: number;
  active: boolean;
};

const SPECIFICITY: Record<AvailabilityRule["rule_scope"], number> = {
  vehicle: 4,
  vehicle_class: 3,
  service: 2,
  global: 1,
};

function windowWidth(r: AvailabilityRule): number {
  const from = minutes(r.time_from);
  const to = minutes(r.time_to);
  const timeSpan = from != null && to != null ? (to >= from ? to - from : 1440 - from + to) : 1440;
  const daySpan = r.days_of_week && r.days_of_week.length > 0 ? r.days_of_week.length : 7;
  return timeSpan * daySpan;
}

export type AvailabilityVerdict = {
  available: boolean;
  rule: AvailabilityRule | null;
  /** Customer-safe message; admins get `adminReason`. */
  message: string | null;
  adminReason: string | null;
  conflicts: AvailabilityRule[];
};

const CUSTOMER_UNAVAILABLE = "This vehicle class isn't available for the selected date, time or area. Please choose another option or contact us.";

/**
 * Specificity ladder: vehicle > vehicle_class > service > global.
 * Same specificity: block beats allow → highest priority → narrowest window.
 * Equal-specificity contradictions are reported in `conflicts` for admins.
 */
export function resolveAvailability(rules: readonly AvailabilityRule[], ctx: JourneyContext): AvailabilityVerdict {
  const matching = rules
    .filter((r) => r.active !== false)
    .filter((r) => {
      if (r.rule_scope === "vehicle") return !!r.vehicle_id && r.vehicle_id === ctx.vehicleId;
      if (r.rule_scope === "vehicle_class") return !!r.vehicle_class_id && r.vehicle_class_id === ctx.vehicleClassId;
      if (r.rule_scope === "service") return serviceMatches(r.service_types, ctx) && !!r.service_types?.length;
      return true;
    })
    .filter((r) => dateWithin(ctx.date, r.date_from, r.date_to))
    .filter((r) => dowMatches(r.days_of_week, ctx.date))
    .filter((r) => timeWithin(ctx.time, r.time_from, r.time_to))
    .filter((r) => geoMatches({ lat: r.lat, lng: r.lng, radius_miles: r.radius_miles, place_id: r.place_id, scope: r.scope }, ctx));

  if (matching.length === 0) {
    return { available: true, rule: null, message: null, adminReason: null, conflicts: [] };
  }

  const sorted = [...matching].sort((a, b) => {
    const s = SPECIFICITY[b.rule_scope] - SPECIFICITY[a.rule_scope];
    if (s !== 0) return s;
    if (a.effect !== b.effect) return a.effect === "block" ? -1 : 1;
    const p = Number(b.priority ?? 100) - Number(a.priority ?? 100);
    if (p !== 0) return p;
    const w = windowWidth(a) - windowWidth(b);
    if (w !== 0) return w;
    return a.id < b.id ? -1 : 1;
  });

  const winner = sorted[0]!;
  const conflicts = sorted.filter(
    (r) =>
      r.id !== winner.id &&
      SPECIFICITY[r.rule_scope] === SPECIFICITY[winner.rule_scope] &&
      Number(r.priority ?? 100) === Number(winner.priority ?? 100) &&
      r.effect !== winner.effect,
  );

  const blocked = winner.effect === "block";
  return {
    available: !blocked,
    rule: winner,
    message: blocked ? CUSTOMER_UNAVAILABLE : null,
    adminReason: `${winner.effect === "block" ? "Blocked" : "Allowed"} by "${winner.name}" (${winner.rule_scope}, priority ${winner.priority})${winner.reason ? `: ${winner.reason}` : ""}`,
    conflicts,
  };
}
