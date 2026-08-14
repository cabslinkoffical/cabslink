# Admin Pricing, Discounts & Availability Upgrade

Goal: extend the existing single pricing engine into a complete, admin-configurable commercial engine (fixed routes, radius pricing, hourly/daily, modifiers, discounts/events, coupons, VAT modes, availability) plus bulk import/export and a real pricing debugger — without creating a second engine and without changing historical booking prices.

## A. Current architecture findings

Pricing engine (single, already authoritative):
- `src/lib/pricing.ts` — pure engine `runPricingEngine()` (base + progressive mileage tiers + via stops + time-window extra + surcharges − discount + tax), `computeStopCharges()`, `ENGINE_VERSION = 2026.07.2`.
- `src/lib/pricing-helpers.server.ts` — the real orchestration: `publicClient()`, `assertAdmin()`, `realDistanceMiles()` (Google Routes via `route-distance.server.ts`, DB-cached in `route_distance_cache`), `loadActiveProfiles()`, `loadAreaSurcharges()`, `loadFixedPriceForRoute()`, `loadQuoteSettings()`, and `computeVehicleQuote()` — the single funnel that builds the `PricingSnapshot`.
- `src/lib/pricing.functions.ts` — `calculateQuotes` (public), `createBooking` (public, recomputes server-side, rate-limited, idempotent), `adminListPricingProfiles`, `adminSavePricingProfile`, `adminDuplicatePricingProfile`, `adminTestQuote`, `adminPreviewQuote`. Admin fns already use `requireSupabaseAuth` + `assertAdmin`.
- `src/lib/hourly.functions.ts` — separate hourly path reading `hourly_rates` (per-hour only, min/max hours), does **not** go through `computeVehicleQuote`.
- `src/lib/tours-pricing.server.ts`, `scenic-quote.functions.ts` — stops/scenic add-ons layered in `createBooking`.
- Snapshots persisted to `quote_calculations` (41 columns incl. `snapshot`, `engine_version`) and `bookings.price` — historical pricing is already snapshot-based.

Class/model/vehicle relationships:
- `vehicle_classes` is the customer-facing entity and carries `pricing_vehicle_id` → a single proxy row in `vehicles`. All pricing (`vehicle_pricing_profiles.vehicle_id`, `hourly_rates.vehicle_id`, `pricing_rules.vehicle_id`, `surcharges.vehicle_id`) keys off that proxy vehicle id.
- `vehicle_models` (`vehicle_class_id`) are display-only models under a class.
- Consequence: "pricing by Vehicle Class" already effectively exists via the proxy vehicle, but the schema doesn't say so. This is the main modelling debt.

Existing rule tables:
- `pricing_rules` — fixed routes. Has `from/to_place_id`, `from/to_place_label`, legacy `from/to_address`, `vehicle_id`, `price`, `valid_from/to`, `bidirectional`, `active`. **Missing: radius, priority, vehicle_class_id.** Matching is exact Place-ID pair only (`loadFixedPriceForRoute`), guarded by triggers `pricing_rules_require_place_ids_when_active`, `pricing_rule_prevent_bidirectional_conflict`.
- `addresses` — pickup/dropoff area charges, matched by Place ID then fuzzy label substring (`loadAreaSurcharges`). No radius; label fallback is the fragile text matching the brief flags.
- `surcharges` — full schema (`charge_type`, `amount`, `applies_to`, `vehicle_id`, `starts_at/ends_at`, `days_of_week`, `time_from/to`, `active`) but **only admin CRUD in `admin.functions.ts`; never read by the pricing engine.** No priority.
- `coupons` — full schema (`discount_type`, `discount_value`, `min_booking_amount`, `usage_limit`, `used_count`, `starts_at/expires_at`, `applicable_vehicle_classes`, `active`) but **only admin CRUD; not referenced anywhere in quote/booking flow.** Confirmed by search: no coupon read outside `admin.functions.ts`.
- `hourly_rates` — per-hour + min/max hours only. No daily rate, no included/extra mileage.
- `site_settings` — `tax_enabled`, `tax_percentage`, `tax_label`, plus child-seat/meet-greet/return fees and cancellation policy percentages. Tax is exclusive-only; no inclusive mode, no effective date.
- No table anywhere for: location/radius pricing, percentage/date/day modifiers as first-class rules, events, availability rules. Confirmed missing.

Supporting infra that already exists and should be reused:
- `place_coords` (Place ID → lat/lng, cached) via `src/lib/place-coords.server.ts` — the correct basis for all radius maths.
- `route_distance_cache` + Google Routes wrapper.
- Activity logging: `log_admin_action()` trigger already on `pricing_rules`, `surcharges`, `coupons`, `addresses`, `vehicles`, `vehicle_classes`, `hourly_rates`, `bookings`, `site_settings`; plus `activity_logs` insert helper used by `set_booking_status`.
- Bulk import machinery already built for SEO: `src/lib/seo/import-parser.ts` (CSV/TSV/JSON/XLSX via papaparse + xlsx, `reportToCsv`) and `src/lib/seo/import.functions.ts` (`validateImport` → `commitImport` pattern) with UI at `cabs-booking-pannel/seo.import.tsx`. This is the template for the new generic bulk system.
- Admin nav: `src/components/admin/SidebarNav.tsx` (`NavGroup`/`NavItem`), 40 route files under `src/routes/_authenticated/cabs-booking-pannel/`, gated by `_authenticated/route.tsx`.
- Existing pricing preview: `pricing-preview.tsx` already calls `adminPreviewQuote`, but takes manual Place IDs and a manual distance override, and shows only the mileage/fixed snapshot.

## B. Extend, don't rebuild
- Keep `runPricingEngine` maths and `computeVehicleQuote` as the single funnel; add stages around it rather than a parallel engine.
- Extend `pricing_rules` (radius, priority, class) instead of a new fixed-route table.
- Extend `surcharges` (priority, class, location scope) and finally **read** it in the engine.
- Wire existing `coupons` in; no new coupon table.
- Extend `hourly_rates` with daily/mileage fields; route hourly through the shared funnel.
- Reuse `place_coords` for all geo; reuse `import-parser.ts` for bulk.
- Reuse `log_admin_action` triggers for new tables.

## C. Database changes (migrations)
1. `vehicle_classes` linkage: add `vehicle_class_id` (FK) to `vehicle_pricing_profiles`, `hourly_rates`, `pricing_rules`, `surcharges`; backfill from `vehicle_classes.pricing_vehicle_id`. Keep `vehicle_id` for compatibility so existing behaviour is unchanged; class becomes the preferred key, vehicle the operational override.
2. `pricing_rules`: add `from_radius_miles`, `to_radius_miles`, `from_lat/from_lng/to_lat/to_lng` (backfilled from `place_coords`), `priority int not null default 100`, `valid_for_return boolean`. Relax the "active requires exact place ids" trigger to "active requires (place id) or (coords + radius)".
3. New `location_pricing_rules`: place_id/label/lat/lng, `radius_miles`, `included_distance_miles`, `price_type` (fixed|base), `price`, `extra_per_mile`, `scope` (pickup|destination|either), `vehicle_class_id`, `priority`, `active`, timestamps + updated_at trigger + `log_admin_action`.
4. New `pricing_modifiers`: name, `modifier_type` (percent|fixed), `value`, scope columns (`vehicle_class_id`, `service_type`, `place_id`/lat/lng/`radius_miles`, `scope`), `date_from/date_to`, `days_of_week smallint[]`, `time_from/time_to`, `stackable boolean`, `priority`, `active`.
5. New `discount_rules`: name, `discount_type` (fixed|percent), `value`, `basis` (radius|vehicle_class|location|event), event fields (`event_name`, place/lat/lng/`radius_miles`, `starts_at`, `ends_at` timestamptz), `vehicle_class_ids uuid[]`, `service_types text[]`, `scope` (pickup|destination|either), `max_discount`, `stackable`, `priority`, `active`. No hard-coded events — all rows are admin data.
6. `coupons`: add `applies_to_service_types text[]`, `max_discount`, `per_customer_limit`, `stackable boolean default false`. New `coupon_redemptions` (coupon_id, booking_id, email, amount, created_at) so `used_count` is auditable and enforceable.
7. `hourly_rates`: add `daily_price`, `included_miles_per_hour`, `included_miles_per_day`, `extra_mile_rate`, `vehicle_class_id`, `priority`.
8. VAT: add to `site_settings` → `tax_mode` (`exclusive`|`inclusive`), `tax_effective_from date`. Default `exclusive` so current behaviour is identical.
9. New `availability_rules`: `rule_scope` (global|service|vehicle_class|vehicle), `vehicle_class_id`, `vehicle_id`, `service_types text[]`, `effect` (block|allow), `date_from/date_to`, `days_of_week smallint[]`, `time_from/time_to`, location scope (place_id/lat/lng/radius/scope), `reason text`, `priority`, `active`.
10. New `bulk_import_jobs`: entity, filename, row counts, status, `error_report jsonb`, actor, created_at — for auditing bulk ops.
11. `bookings`/`quote_calculations`: add `pricing_source text` (fixed_route|location|mileage|hourly|daily) and `applied_rules jsonb` so a booking explains itself forever. Existing rows untouched.
All new public tables get GRANTs (`authenticated` + `service_role`; `anon` SELECT only where the public quote path needs it — location pricing, modifiers, discount rules, availability rules, coupons validation is server-side only), RLS enabled, admin-write / read policies mirroring `pricing_rules`, `set_updated_at` trigger and `log_admin_action` trigger. `ENGINE_VERSION` bumps once per behaviour-changing phase.

## D. Server / business logic changes
- New `src/lib/pricing-rules.server.ts`: pure, unit-testable matchers — `matchFixedRoute()`, `matchLocationPricing()`, `matchModifiers()`, `matchDiscounts()`, `validateCoupon()`, `haversineMiles()`. Geo input is always coords resolved from `place_coords` (`resolvePlaceCoords`), never address text.
- `pricing-helpers.server.ts`: replace `loadFixedPriceForRoute` with a richer loader returning matched-rule metadata + non-match reasons; add loaders for location pricing, modifiers, discounts, availability; extend `loadQuoteSettings` with `taxMode`/effective date.
- `computeVehicleQuote()` gains optional stages (source selection, modifiers, discounts, coupon, VAT mode) and returns `pricing_source`, `applied_rules[]`, `unmatched_reasons[]` in the snapshot. Defaults reproduce today's numbers exactly.
- `src/lib/pricing.ts`: add inclusive-VAT handling (`taxMode`) and modifier/discount line kinds to `BreakdownLine`. Inclusive mode derives net = gross / (1+rate) and never adds tax on top.
- `calculateQuotes` / `createBooking`: pass the new stages; `createBooking` validates and records coupon redemption transactionally and stores `pricing_source`/`applied_rules`.
- Hourly: `hourly.functions.ts` calls the shared funnel for surcharges/modifiers/discounts/VAT instead of raw multiplication; adds daily-rate and included/extra-mileage handling.
- `assertAvailability()` new server helper called by `calculateQuotes` (soft: marks classes unavailable + reason) and `createBooking` (hard: rejects with reason).
- New `src/lib/bulk.functions.ts` + `src/lib/bulk/schemas.ts`: `bulkValidate` (parse+zod+dry-run diff), `bulkCommit` (transactional via a `SECURITY DEFINER` RPC or batched upsert with rollback), `bulkExport`, `bulkTemplate`. All admin-only, all logged to `bulk_import_jobs` + `activity_logs`.
- Booking status logic is left alone; the known `updateBooking` bypass is documented, not changed, in this project.

## E. Admin UI / navigation
New sidebar group **Pricing & Rules**: Mileage Profiles (existing), Fixed Routes (upgraded `pricing.tsx` with radius/priority/class), Location Pricing (new), Hourly & Daily (upgraded `hourly-rates.tsx`), Surcharges & Fees (existing, now labelled as live), Modifiers (new), Discounts & Events (new), Coupons (existing + scope/limits + redemption log), VAT & Tax (in `settings.tsx`).
New group **Availability**: Rules list, plus an availability calendar/grid page (month grid × vehicle class, cell shows blocked/allowed + reason, click for the winning rule).
New group **Data**: Bulk Import/Export (single page, entity picker, template download, Upload → Parse → Validate → Preview diff → Confirm → summary + failed-row CSV), reusing the SEO import UI patterns.
Upgraded **Pricing Preview**: Place autocomplete instead of raw Place IDs, booking-type toggle (transfer / hourly / daily), extras, coupon field, date/time; result panel shows route distance/time, chosen pricing source, matched fixed-route/location rule ids, mileage tiers, modifiers, discounts, coupon, VAT net/VAT/gross, availability verdict, and a "why not matched" list. Uses the same server fn path as customers.

## F. Pricing precedence & stacking (needs your approval)
Proposed order, reconciled with current code:
1. Validate inputs → resolve Place IDs to coords → Vehicle Class.
2. Route distance/time (Google Routes, cached).
3. Availability check (soft on quotes, hard on booking).
4. **Base price source, first match wins:** exact fixed route (Place-ID pair) → radius fixed route → location/radius pricing → mileage tiers (today's default). Within a category: highest `priority`, then most specific (smallest radius), then lowest price. This preserves today's "fixed overrides mileage".
5. Add-ons on top of the base source (unchanged behaviour): via stops, stop fees/parking/scenic, additional pickups, waiting, airport fee, child seat/meet & greet/return.
6. `surcharges` table rules matching date/day/time/class — additive, sorted by priority.
7. Modifiers — percentage applied to (base + add-ons + surcharges); non-stackable modifiers: only the highest-priority match applies; stackable ones apply sequentially in priority order.
8. Discounts: **best-single-discount by default** across radius/class/location/event rules; a rule flagged `stackable` may combine with other stackable rules. Coupon applies after rule discounts, capped so total discount never exceeds the pre-VAT subtotal.
9. VAT last: exclusive → add rate to subtotal; inclusive → subtotal already contains VAT, display net/VAT/gross only (never double-tax).
10. Vehicle count multiplier last (as today, after tax).
Decisions I want confirmed: (a) location pricing ranks below fixed route but above mileage; (b) discounts default to best-single, not stacking; (c) coupon can stack with one rule discount; (d) `tax_mode` defaults to `exclusive` to preserve current totals.

## G. Availability precedence
Specificity ladder, most specific wins: individual vehicle > vehicle class > service > global. Within the same specificity: `block` beats `allow`, then highest `priority`, then narrowest window. The resolver always returns the single winning rule id + reason (surfaced in admin and as a customer-safe message); overlapping equal-specificity rules are reported as a conflict in the admin UI rather than silently resolved.

## H. Bulk import/export
- Entities: vehicle classes, vehicles, models, mileage profiles + tiers, fixed routes, location pricing, hourly/daily rates, surcharges, modifiers, discounts/events, coupons, availability rules, addresses/areas, POIs.
- Per entity: a zod row schema + a template CSV/XLSX generator + a natural key for upsert (e.g. fixed route = from_place_id + to_place_id + class; class = slug; coupon = code).
- Flow: upload → `parseImportFile` (CSV/TSV/JSON/XLSX) → normalise → zod validate row-by-row → resolve references (class slug → id, place id → coords via `place_coords`) → preview diff (create / update / unchanged / error counts, first N rows) → confirm → transactional commit → summary + downloadable failed-row CSV with reasons.
- Export: current filtered admin list → CSV/XLSX with the same column set as the template, so export → edit → re-import round-trips.
- Every validate/commit writes a `bulk_import_jobs` row and an `activity_logs` entry.

## I. Testing & regression risks
- Regression lock first: golden-file tests asserting current totals for representative quotes (mileage-only, fixed route, area surcharge, via stops, tax on/off, vehicle count) so no phase silently changes prices. Existing `tests/pricing-engine.test.ts`, `fixed-price-place-id.test.ts`, `multi-stop-quote.test.ts`, `stop-charges.test.ts`, `create-booking.test.ts`, `admin-pricing-active-guard.test.ts` must stay green.
- New unit tests: haversine/radius matching, precedence resolution, modifier stacking, discount best-single vs stackable, coupon validation + usage limits, inclusive vs exclusive VAT, availability specificity, bulk row validation and rollback.
- Risks: (1) precedence change accidentally altering live prices — mitigated by defaults-off flags per phase; (2) `pricing_vehicle_id` proxy modelling — mitigated by keeping `vehicle_id` populated; (3) extra DB reads per quote — mitigated by parallel loads and existing caches; (4) coupon double-spend — mitigated by redemption table + unique constraint; (5) historical snapshots — new columns are additive, snapshots stay immutable.

## J. Phased order
1. Foundations: class linkage columns, `pricing_source`/`applied_rules`, regression golden tests, matcher module with unit tests. No behaviour change.
2. Fixed routes + location/radius pricing (schema, matchers, precedence, admin pages).
3. Surcharges/fees actually wired into the engine + waiting/airport/additional-pickup/connecting-job fees.
4. Modifiers + discounts/events + coupons wired into quote & booking, with stacking policy.
5. VAT modes (inclusive/exclusive, effective date) + net/VAT/gross display everywhere.
6. Hourly & daily through the shared funnel.
7. Availability engine + admin calendar/grid.
8. Bulk import/export for all entities + audit.
9. Pricing Preview upgrade as the central debugger, then full regression + production verification.
Each phase ends with tests green and a status report before the next begins.

## K. Questions to resolve before coding
1. Confirm the section F precedence and stacking decisions (a)–(d).
2. Should pricing keys migrate fully to `vehicle_class_id` (deprecating the `pricing_vehicle_id` proxy over time), or keep the proxy indefinitely?
3. "Connecting-job discount" — define the trigger: same customer/date within X minutes, or admin-linked bookings?
4. Waiting charges — free minutes then per-15-min rate, per class or global?
5. Daily pricing — is a "day" a fixed hour count (e.g. 10h) with extra-hour rate, or a calendar day?
6. Should availability blocks hide a class from customer quotes entirely, or show it as "on request"?
7. Bulk import: allow deletes/deactivations via import, or create/update only?
8. VAT inclusive mode: apply globally, or per pricing rule?
