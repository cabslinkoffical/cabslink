# Pricing System Hardening Plan

Keeps `src/lib/pricing.ts` as the single pricing engine. All calculation stays server-side via `pricing.functions.ts` / `pricing-helpers.server.ts`. No new formula, no client-side math, no fake UI numbers.

## Scope
In this phase: mileage tiers, fixed routes, address surcharges, tax & currency, admin quote preview, quote snapshot, automated tests.
Deferred (marked "I'll add later" in code + admin UI): coupons runtime, hourly mode, waiting time, return journey, payment provider, reports.

---

## Task 1 — Mileage Pricing (admin + engine guardrails)

**DB migration** — add sanity constraints:
- `vehicle_pricing_profiles`: unique `(vehicle_id)` where `status = true` (one active profile per vehicle).
- `vehicle_mileage_tiers`: CHECK `miles > 0`, CHECK `cost_per_mile >= 0`, unique `(pricing_profile_id, sort_order)`.
- Validation trigger `pricing_profile_requires_tier_when_active`: active profile must have ≥1 tier and the highest-sort tier must have `miles >= 500` (covers long journeys).

**Server (`admin.functions.ts`)** — `upsertPricingProfile` runs a Zod schema:
- vehicle_id required; base_price ≥ 0; via_price ≥ 0
- tiers: each miles > 0, cost_per_mile ≥ 0, unique sort_order
- if `status=true`: tiers array non-empty and last tier miles ≥ 500
Rejects invalid saves with structured error, no partial writes.

**Engine safety (`pricing-helpers.server.ts`)** — when loading a quote for an active vehicle:
- If no active pricing profile exists → filter that vehicle out of quote results with reason `no_pricing_profile`; log a warning.
- Never fall back to a hidden default rate.

**Admin UI (`/admin/pricing`)**:
- Range labels rendered from cumulative miles (`0–10 mi`, `10–30 mi`, `30+ mi`).
- Add / remove / reorder tiers (drag handle + up/down buttons; renumbers `sort_order`).
- "Duplicate profile" action — pick source vehicle → copies profile + tiers to target vehicle.
- Inline field errors + top-of-form error summary from server validation.
- "Preview" panel calls the real backend preview endpoint (see Task 5), not local math.

## Task 2 — Fixed Route Pricing

**DB migration**:
- Partial unique index preventing duplicate active rules on `(vehicle_id, from_place_id, to_place_id)` where `active`.
- Trigger `pricing_rule_bidirectional_conflict`: if `bidirectional`, block another active rule (in either direction, either bidirectional flag) on the same vehicle + place-id pair.
- Already-present trigger enforces place IDs when active.

**Server**:
- `upsertPricingRule` Zod: vehicle_id required, `from_place_id`/`to_place_id` required when active, `price > 0`.
- `pricing-helpers.server.ts` fixed-route lookup: match `(vehicle_id, pickup_place_id, dropoff_place_id)` OR bidirectional reversed. On hit, replace base + mileage with `fixed_price`; area surcharges, via, time extra, discount, tax still apply. Set snapshot flag `fixed_price_applied = true`.

**Admin UI** — validation errors surfaced; bidirectional badge; conflict prevention message.

## Task 3 — Address Surcharges

**DB migration** — extend `addresses`:
- `place_id text` (indexed), `label text`, `updated_by uuid`.
- Keep `comparable_value`, `pickup_charge`, `dropoff_charge`, `notes`, `active`.

**Server** — surcharge lookup already applied after mileage/fixed price in `pricing-helpers.server.ts`; extend the matcher to prefer `place_id` exact match, fall back to `comparable_value` text match. Both charges land as separate breakdown lines: `pickup_surcharge`, `dropoff_surcharge`.

**Admin UI (`/admin/addresses`)** — CRUD form with all fields, Place ID autocomplete (Google Places), active toggle, notes.

## Task 4 — Tax & Currency Settings

**DB migration** — extend `site_settings`:
- `tax_enabled bool default false`
- `tax_label text default 'VAT'`
- `currency_symbol text default '£'`
(existing: `currency`, `tax_percentage`.)

**Server** — `pricing-helpers.server.ts` loads settings once per quote; passes `taxRate = tax_enabled ? tax_percentage/100 : 0` into engine. Tax is applied to subtotal **before** the vehicle_count multiplier (engine already does subtotal → tax → `finalPrice`; the outer wrapper multiplies by `vehicle_count`).

**Admin UI (`/admin/settings`)** — Tax section (enable toggle, rate %, label) + Currency section (code + symbol).

## Task 5 — Quote Preview Tool

**Server** — new authenticated admin server fn `previewQuote(input)`:
- Inputs: pickup_place_id, dropoff_place_id, distance_miles, vehicle_id, vehicle_count, via_stops, pickup_date, pickup_time.
- Calls the same `calculateQuoteForVehicle(...)` used by the public booking flow — no duplicated math.
- Returns full breakdown + snapshot object (identical shape to Task 6).

**Admin UI (`/admin/pricing/preview`)** — form + result panel showing:
`fixed_price_applied`, base, mileage tier lines, via, time_extra, pickup_surcharge, dropoff_surcharge, discount, tax_rate, tax_amount, vehicle_count, final_total, plus raw JSON snapshot.

## Task 6 — Quote / Booking Snapshot

**DB migration** — extend `quote_calculations` and `bookings.pricing_snapshot` JSONB with a fixed schema:
```
{
  engine_version: "2026.07.1",
  vehicle_id, profile_id,
  distance_miles,
  base_price,
  mileage_tiers: [{ tier_name, miles, rate, amount }],
  mileage_total,
  fixed_price_applied: bool,
  fixed_price_amount: number|null,
  pickup_surcharge, dropoff_surcharge,
  via_stops, via_price,
  time_extra,
  discount,
  tax_rate, tax_amount,
  vehicle_count,
  final_total,
  timestamp
}
```
Add columns to `quote_calculations`: `engine_version`, `profile_id`, `fixed_price_applied`, `fixed_price_amount`, `pickup_surcharge`, `dropoff_surcharge`, `via_stops`, `via_price`, `time_extra`, `tax_rate`, `vehicle_count`, `snapshot jsonb`.

**Server** — `pricing-helpers.server.ts` builds this snapshot in one place; both `calculateQuotes` and `createBooking` persist it. Engine version constant lives in `pricing.ts`.

## Task 7 — Automated Tests

Extend `tests/` (Vitest) covering the engine + helper pipeline with a fake Supabase context:

1. Progressive mileage 42 mi → `10×3 + 20×2.5 + 12×2 = 104`.
2. Fixed route override — matched rule replaces base+mileage; mileage lines absent.
3. Fixed route + surcharges — pickup/dropoff surcharge lines still added on top of fixed price.
4. Time extra — pickup time inside window adds correct amount (fixed and percent variants).
5. Tax 20 % — `taxAmount === round2(subtotal × 0.2)` and `finalPrice === subtotal + taxAmount`.
6. Vehicle count 2 → outer wrapper multiplies tax-inclusive total by 2.
7. Rounding — every line item and total pass `round2(x) === x`.

## Deferred (stubbed in admin, not wired to engine)
Coupons runtime, hourly mode, waiting time, return journey, payment provider, reports — leave existing UI, add `// TODO(pricing-phase-2): wire when engine supports it` note. No fake numbers surfaced.

---

## Technical Details

**Files touched**
- `src/lib/pricing.ts` — export `ENGINE_VERSION`, add snapshot builder helper (pure).
- `src/lib/pricing-helpers.server.ts` — profile guard, fixed-route matcher with bidirectional, address surcharge by place_id, settings loader, snapshot builder, `vehicle_count` wrapper.
- `src/lib/pricing.functions.ts` — plumb snapshot into `calculateQuotes`; add `previewQuote` (admin, `has_role('admin')` check).
- `src/lib/admin.functions.ts` — Zod validation on `upsertPricingProfile`, `upsertPricingRule`, `upsertAddress`, `updateSiteSettings`; new `duplicatePricingProfile`.
- `src/routes/_authenticated/admin/pricing.tsx` — tier reorder, ranges, duplicate, preview panel.
- `src/routes/_authenticated/admin/pricing-rules.tsx` — validation surfacing.
- `src/routes/_authenticated/admin/addresses.tsx` — new fields incl. Place ID.
- `src/routes/_authenticated/admin/settings.tsx` — Tax + Currency sections.
- `src/routes/_authenticated/admin/pricing/preview.tsx` — new route.
- `tests/pricing-engine.test.ts` — 7 scenarios.

**Migrations** (one migration per task, ordered): profile+tier constraints → pricing_rules uniqueness/trigger → addresses columns → site_settings columns → quote_calculations snapshot columns.

**Non-negotiable rules**
- No math in components. UI reads server results only.
- One engine (`runPricingEngine`) — preview, quotes, and booking creation all funnel through it.
- Every snapshot is written whenever a price is calculated or a booking is created.
