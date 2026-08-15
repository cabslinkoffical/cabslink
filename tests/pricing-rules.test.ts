import { describe, expect, it } from "vitest";
import {
  discountAmountFor,
  haversineMiles,
  locationRuleAmount,
  matchDiscounts,
  bothWays,
  matchFixedRoute,
  matchLocationPricing,
  matchModifiers,
  resolveAvailability,
  validateCoupon,
  withinRadius,
  type AvailabilityRule,
  type CouponRow,
  type DiscountRule,
  type FixedRouteRule,
  type JourneyContext,
  type LocationPricingRule,
  type ModifierRule,
} from "@/lib/pricing-rules";

const EDINBURGH = { lat: 55.9533, lng: -3.1883 };
const GLASGOW = { lat: 55.8642, lng: -4.2518 };

function ctx(over: Partial<JourneyContext> = {}): JourneyContext {
  return {
    pickupPlaceId: "PICKUP",
    destinationPlaceId: "DEST",
    pickupCoord: EDINBURGH,
    destinationCoord: GLASGOW,
    vehicleId: "veh-1",
    vehicleClassId: "class-1",
    date: "2026-06-15", // Monday
    time: "10:00",
    distanceMiles: 47,
    ...over,
  };
}

function fixedRoute(over: Partial<FixedRouteRule> = {}): FixedRouteRule {
  return {
    id: "fr-1",
    vehicle_id: null,
    vehicle_class_id: null,
    price: 100,
    from_place_id: null,
    to_place_id: null,
    from_lat: null,
    from_lng: null,
    to_lat: null,
    to_lng: null,
    from_radius_miles: 0,
    to_radius_miles: 0,
    bidirectional: false,
    valid_for_return: true,
    priority: 100,
    valid_from: null,
    valid_to: null,
    active: true,
    ...over,
  };
}

function locationRule(over: Partial<LocationPricingRule> = {}): LocationPricingRule {
  return {
    id: "lp-1",
    name: "Edinburgh zone",
    place_id: null,
    lat: EDINBURGH.lat,
    lng: EDINBURGH.lng,
    radius_miles: 10,
    included_distance_miles: 0,
    price_type: "fixed",
    price: 80,
    extra_per_mile: 0,
    scope: "pickup",
    vehicle_class_id: null,
    priority: 100,
    active: true,
    ...over,
  };
}

function modifier(over: Partial<ModifierRule> = {}): ModifierRule {
  return {
    id: "mod-1",
    name: "Peak",
    modifier_type: "percent",
    value: 10,
    vehicle_class_id: null,
    service_types: null,
    place_id: null,
    lat: null,
    lng: null,
    radius_miles: null,
    scope: "either",
    date_from: null,
    date_to: null,
    days_of_week: null,
    time_from: null,
    time_to: null,
    stackable: false,
    priority: 100,
    active: true,
    ...over,
  };
}

function discount(over: Partial<DiscountRule> = {}): DiscountRule {
  return {
    id: "dc-1",
    name: "Loyalty",
    basis: "vehicle_class",
    discount_type: "percent",
    value: 10,
    event_name: null,
    place_id: null,
    lat: null,
    lng: null,
    radius_miles: null,
    scope: "either",
    starts_at: null,
    ends_at: null,
    vehicle_class_ids: null,
    service_types: null,
    max_discount: null,
    stackable: false,
    priority: 100,
    active: true,
    ...over,
  };
}

function availability(over: Partial<AvailabilityRule> = {}): AvailabilityRule {
  return {
    id: "av-1",
    name: "Rule",
    rule_scope: "global",
    vehicle_class_id: null,
    vehicle_id: null,
    service_types: null,
    effect: "block",
    date_from: null,
    date_to: null,
    days_of_week: null,
    time_from: null,
    time_to: null,
    place_id: null,
    lat: null,
    lng: null,
    radius_miles: null,
    scope: "either",
    reason: "Maintenance",
    priority: 100,
    active: true,
    ...over,
  };
}

function coupon(over: Partial<CouponRow> = {}): CouponRow {
  return {
    id: "cp-1",
    code: "SAVE10",
    discount_type: "percentage",
    discount_value: 10,
    min_booking_amount: null,
    usage_limit: null,
    used_count: 0,
    starts_at: null,
    expires_at: null,
    active: true,
    applicable_vehicle_classes: null,
    applies_to_service_types: null,
    max_discount: null,
    per_customer_limit: null,
    stackable: true,
    ...over,
  };
}

describe("geo helpers", () => {
  it("computes great-circle miles between Edinburgh and Glasgow", () => {
    expect(haversineMiles(EDINBURGH, GLASGOW)).toBeGreaterThan(38);
    expect(haversineMiles(EDINBURGH, GLASGOW)).toBeLessThan(45);
  });

  it("treats a zero/absent radius as no match", () => {
    expect(withinRadius(EDINBURGH, GLASGOW, 0)).toBe(false);
    expect(withinRadius(EDINBURGH, null, 50)).toBe(false);
    expect(withinRadius(EDINBURGH, GLASGOW, 50)).toBe(true);
  });
});

describe("fixed route precedence", () => {
  it("prefers an exact Place-ID pair over a radius match", () => {
    const exact = fixedRoute({ id: "exact", from_place_id: "PICKUP", to_place_id: "DEST", price: 120 });
    const radius = fixedRoute({
      id: "radius",
      from_lat: EDINBURGH.lat,
      from_lng: EDINBURGH.lng,
      from_radius_miles: 15,
      to_lat: GLASGOW.lat,
      to_lng: GLASGOW.lng,
      to_radius_miles: 15,
      price: 90,
      priority: 900,
    });
    const res = matchFixedRoute([radius, exact], ctx());
    expect(res.match?.kind).toBe("exact");
    expect(res.match?.rule.id).toBe("exact");
    expect(res.match?.price).toBe(120);
  });

  it("matches a radius rule when no exact pair exists", () => {
    const radius = fixedRoute({
      id: "radius",
      from_lat: EDINBURGH.lat,
      from_lng: EDINBURGH.lng,
      from_radius_miles: 15,
      to_lat: GLASGOW.lat,
      to_lng: GLASGOW.lng,
      to_radius_miles: 15,
      price: 90,
    });
    const res = matchFixedRoute([radius], ctx());
    expect(res.match?.kind).toBe("radius");
    expect(res.match?.price).toBe(90);
  });

  it("prefers the narrower radius at equal priority", () => {
    const wide = fixedRoute({
      id: "wide",
      from_lat: EDINBURGH.lat, from_lng: EDINBURGH.lng, from_radius_miles: 30,
      to_lat: GLASGOW.lat, to_lng: GLASGOW.lng, to_radius_miles: 30,
      price: 95,
    });
    const narrow = fixedRoute({
      id: "narrow",
      from_lat: EDINBURGH.lat, from_lng: EDINBURGH.lng, from_radius_miles: 5,
      to_lat: GLASGOW.lat, to_lng: GLASGOW.lng, to_radius_miles: 5,
      price: 105,
    });
    const res = matchFixedRoute([wide, narrow], ctx());
    expect(res.match?.rule.id).toBe("narrow");
  });

  it("honours higher priority ahead of specificity", () => {
    const wideHigh = fixedRoute({
      id: "wide-high", priority: 500,
      from_lat: EDINBURGH.lat, from_lng: EDINBURGH.lng, from_radius_miles: 30,
      to_lat: GLASGOW.lat, to_lng: GLASGOW.lng, to_radius_miles: 30,
    });
    const narrowLow = fixedRoute({
      id: "narrow-low", priority: 10,
      from_lat: EDINBURGH.lat, from_lng: EDINBURGH.lng, from_radius_miles: 5,
      to_lat: GLASGOW.lat, to_lng: GLASGOW.lng, to_radius_miles: 5,
    });
    const res = matchFixedRoute([narrowLow, wideHigh], ctx());
    expect(res.match?.rule.id).toBe("wide-high");
  });

  it("matches the reverse direction only when bidirectional", () => {
    const rule = fixedRoute({ from_place_id: "DEST", to_place_id: "PICKUP", bidirectional: false });
    expect(matchFixedRoute([rule], ctx()).match).toBeNull();
    const bidi = fixedRoute({ from_place_id: "DEST", to_place_id: "PICKUP", bidirectional: true });
    const res = matchFixedRoute([bidi], ctx());
    expect(res.match?.reversed).toBe(true);
  });

  it("skips inactive, out-of-date and mismatched-class rules with reasons", () => {
    const base = { from_place_id: "PICKUP", to_place_id: "DEST" };
    expect(matchFixedRoute([fixedRoute({ ...base, active: false })], ctx()).match).toBeNull();
    expect(matchFixedRoute([fixedRoute({ ...base, valid_to: "2020-01-01" })], ctx()).match).toBeNull();
    const wrongClass = matchFixedRoute([fixedRoute({ ...base, vehicle_class_id: "other-class" })], ctx());
    expect(wrongClass.match).toBeNull();
    expect(wrongClass.reasons.length).toBeGreaterThan(0);
  });

  it("excludes return journeys from rules not valid for return", () => {
    const rule = fixedRoute({ from_place_id: "PICKUP", to_place_id: "DEST", valid_for_return: false });
    expect(matchFixedRoute([rule], ctx({ isReturn: true })).match).toBeNull();
    expect(matchFixedRoute([rule], ctx({ isReturn: false })).match).not.toBeNull();
  });
});

describe("location / radius pricing", () => {
  it("matches on the pickup radius and returns a fixed amount", () => {
    const res = matchLocationPricing([locationRule()], ctx());
    expect(res.match?.amount).toBe(80);
  });

  it("respects scope", () => {
    const destOnly = locationRule({ scope: "destination" });
    expect(matchLocationPricing([destOnly], ctx()).match).toBeNull();
  });

  it("adds per-mile charges beyond the included distance for base pricing", () => {
    const rule = locationRule({ price_type: "base", price: 50, included_distance_miles: 10, extra_per_mile: 2 });
    expect(locationRuleAmount(rule, 20)).toBe(70);
    expect(locationRuleAmount(rule, 5)).toBe(50);
  });

  it("reports a reason when nothing matches", () => {
    const res = matchLocationPricing([], ctx());
    expect(res.reasons.length).toBeGreaterThan(0);
  });
});

describe("modifiers", () => {
  it("applies only the highest-priority non-stackable modifier", () => {
    const low = modifier({ id: "low", priority: 10, value: 5 });
    const high = modifier({ id: "high", priority: 900, value: 20 });
    const res = matchModifiers([low, high], ctx());
    expect(res.applied.map((r) => r.id)).toEqual(["high"]);
    expect(res.skipped.map((r) => r.id)).toEqual(["low"]);
  });

  it("stacks modifiers explicitly marked stackable", () => {
    const a = modifier({ id: "a", stackable: true, priority: 200 });
    const b = modifier({ id: "b", stackable: true, priority: 100 });
    const res = matchModifiers([b, a], ctx());
    expect(res.applied.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("filters by day of week and time window", () => {
    const sundayOnly = modifier({ days_of_week: [0] });
    expect(matchModifiers([sundayOnly], ctx()).applied).toHaveLength(0);
    const mondayOnly = modifier({ days_of_week: [1] });
    expect(matchModifiers([mondayOnly], ctx()).applied).toHaveLength(1);
    const nightOnly = modifier({ time_from: "22:00", time_to: "05:00" });
    expect(matchModifiers([nightOnly], ctx({ time: "23:30" })).applied).toHaveLength(1);
    expect(matchModifiers([nightOnly], ctx({ time: "10:00" })).applied).toHaveLength(0);
  });
});

describe("discounts", () => {
  it("takes the best single discount by default", () => {
    const small = discount({ id: "small", value: 5 });
    const big = discount({ id: "big", value: 25 });
    const res = matchDiscounts([small, big], ctx(), 200);
    expect(res.applied.map((r) => r.rule.id)).toEqual(["big"]);
    expect(res.total).toBe(50);
  });

  it("stacks stackable rules in priority order", () => {
    const a = discount({ id: "a", stackable: true, priority: 300, discount_type: "fixed", value: 10 });
    const b = discount({ id: "b", stackable: true, priority: 100, discount_type: "fixed", value: 5 });
    const res = matchDiscounts([b, a], ctx(), 200);
    expect(res.applied.map((r) => r.rule.id)).toEqual(["a", "b"]);
    expect(res.total).toBe(15);
  });

  it("never exceeds the base subtotal", () => {
    const huge = discount({ discount_type: "fixed", value: 9999 });
    const res = matchDiscounts([huge], ctx(), 120);
    expect(res.total).toBeLessThanOrEqual(120);
  });

  it("caps a percentage discount at max_discount", () => {
    expect(discountAmountFor(discount({ value: 50, max_discount: 20 }), 200)).toBe(20);
  });

  it("applies event windows by date", () => {
    const event = discount({ basis: "event", event_name: "Festival", starts_at: "2026-08-01", ends_at: "2026-08-31" });
    expect(matchDiscounts([event], ctx({ date: "2026-06-15" }), 100).applied).toHaveLength(0);
    expect(matchDiscounts([event], ctx({ date: "2026-08-10" }), 100).applied).toHaveLength(1);
  });
});

describe("coupons", () => {
  it("accepts a valid coupon and computes the amount", () => {
    const res = validateCoupon(coupon(), { base: 200 });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.amount).toBe(20);
  });

  it("rejects unknown, inactive and expired codes", () => {
    expect(validateCoupon(null, { base: 100 }).ok).toBe(false);
    expect(validateCoupon(coupon({ active: false }), { base: 100 }).ok).toBe(false);
    expect(validateCoupon(coupon({ expires_at: "2020-01-01" }), { base: 100, date: "2026-01-01" }).ok).toBe(false);
    expect(validateCoupon(coupon({ starts_at: "2030-01-01" }), { base: 100, date: "2026-01-01" }).ok).toBe(false);
  });

  it("enforces usage and per-customer limits", () => {
    expect(validateCoupon(coupon({ usage_limit: 5, used_count: 5 }), { base: 100 }).ok).toBe(false);
    expect(validateCoupon(coupon({ per_customer_limit: 1 }), { base: 100, customerRedemptions: 1 }).ok).toBe(false);
  });

  it("enforces minimum spend and class scope", () => {
    expect(validateCoupon(coupon({ min_booking_amount: 300 }), { base: 100 }).ok).toBe(false);
    const scoped = coupon({ applicable_vehicle_classes: ["class-9"] });
    expect(validateCoupon(scoped, { base: 100, vehicleClassId: "class-1" }).ok).toBe(false);
    expect(validateCoupon(scoped, { base: 100, vehicleClassId: "class-9" }).ok).toBe(true);
  });

  it("never discounts more than the base", () => {
    const res = validateCoupon(coupon({ discount_type: "fixed", discount_value: 500 }), { base: 90 });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.amount).toBe(90);
  });
});

describe("availability precedence", () => {
  it("is available when no rule matches", () => {
    expect(resolveAvailability([], ctx()).available).toBe(true);
  });

  it("lets a more specific allow rule override a broader block", () => {
    const globalBlock = availability({ id: "g", rule_scope: "global", effect: "block" });
    const classAllow = availability({ id: "c", rule_scope: "vehicle_class", vehicle_class_id: "class-1", effect: "allow" });
    const res = resolveAvailability([globalBlock, classAllow], ctx());
    expect(res.available).toBe(true);
    expect(res.rule?.id).toBe("c");
  });

  it("blocks when an individual vehicle rule wins", () => {
    const classAllow = availability({ id: "c", rule_scope: "vehicle_class", vehicle_class_id: "class-1", effect: "allow" });
    const vehBlock = availability({ id: "v", rule_scope: "vehicle", vehicle_id: "veh-1", effect: "block", reason: "In for service" });
    const res = resolveAvailability([classAllow, vehBlock], ctx());
    expect(res.available).toBe(false);
    expect(res.rule?.id).toBe("v");
    expect(res.adminReason).toContain("In for service");
    // Customer message must never leak the internal reason.
    expect(res.message).not.toContain("In for service");
  });

  it("prefers block over allow at equal specificity and reports the conflict", () => {
    const allow = availability({ id: "a", rule_scope: "vehicle_class", vehicle_class_id: "class-1", effect: "allow" });
    const block = availability({ id: "b", rule_scope: "vehicle_class", vehicle_class_id: "class-1", effect: "block" });
    const res = resolveAvailability([allow, block], ctx());
    expect(res.available).toBe(false);
    expect(res.conflicts.length).toBeGreaterThan(0);
  });

  it("ignores rules outside their date, day or geo window", () => {
    expect(resolveAvailability([availability({ date_from: "2026-01-01", date_to: "2026-01-31" })], ctx()).available).toBe(true);
    expect(resolveAvailability([availability({ days_of_week: [0] })], ctx()).available).toBe(true);
    const farAway = availability({ lat: 51.5, lng: -0.12, radius_miles: 5, scope: "pickup" });
    expect(resolveAvailability([farAway], ctx()).available).toBe(true);
    const nearPickup = availability({ lat: EDINBURGH.lat, lng: EDINBURGH.lng, radius_miles: 5, scope: "pickup" });
    expect(resolveAvailability([nearPickup], ctx()).available).toBe(false);
  });
});

describe("bidirectional is the single source of truth", () => {
  it("treats bidirectional as canonical and valid_for_return as a legacy alias", () => {
    expect(bothWays({ bidirectional: true, valid_for_return: false })).toBe(true);
    expect(bothWays({ bidirectional: false, valid_for_return: true })).toBe(false);
    expect(bothWays({ valid_for_return: true })).toBe(true);
    expect(bothWays({})).toBe(false);
  });
});
