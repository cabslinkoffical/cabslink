# Vehicle Classes Architecture Refactor

Move CabsLink from "book a specific vehicle" to "book a vehicle class" (Blacklane / Addison Lee model). Pricing follows the class; models become informational examples of what may be dispatched.

## Scope guarantee

Existing pricing engine, Google Routes/Places, quote logic, booking flow, snapshots, and server functions are preserved. Only the entity a customer picks changes: `vehicle_id` → `vehicle_class_id`. Historical bookings keep their snapshotted vehicle text unchanged.

---

## Phase 1 — Database (single migration, reversible)

New tables:

- `vehicle_classes` — name, slug, hero_image, gallery jsonb, short/long description, passengers, large_luggage, cabin_bags, hand_luggage, child_seats_supported, wheelchair_accessible, fuel_type, recommended_for jsonb (airport/corporate/long_distance/tours/weddings/executive), featured, badge, display_order, active, seo_title, seo_description, seo_keywords, `pricing_profile_id` (FK), `quote_on_request` bool, timestamps.
- `vehicle_models` — vehicle_class_id (FK), name, manufacturer, active, notes, display_order, timestamps. No pricing, no mileage profile.

Extend existing tables (non-breaking, additive):

- `vehicles.vehicle_class_id` nullable FK (kept for backwards compat during migration window; existing `vehicles` rows become "representative examples" mapped into a class).
- `bookings.vehicle_class_id` nullable FK + `vehicle_class_name_snapshot` text.
- `quote_calculations.vehicle_class_id` nullable FK.
- `pricing_rules.vehicle_class_id` nullable FK (optional per-class override, alongside existing `vehicle_id`).

Seed 14 default classes with representative models (Economy Saloon → Electric MPV/Van, per spec). Plus one `Unclassified` class for review.

Data migration inside the same migration:

1. Match each existing `vehicles` row to a class by name/heuristics (e.g. "E-Class"/"5 Series" → Executive Saloon; "V-Class"/"Vito" → Premium MPV or 8-Seater Van; Sprinter → Executive Minibus; Coach/Tourismo → Coach). Unmatched → Unclassified.
2. Copy each vehicle's `pricing_profile_id` up to its class (first vehicle wins; conflicts logged into `activity_logs`).
3. Insert each existing vehicle as a `vehicle_models` row under its class (so admins see current models as representative examples).
4. Backfill `bookings.vehicle_class_id` from `bookings.vehicle_id` → class mapping; keep existing `vehicle_type` text snapshot untouched.

Grants + RLS: public SELECT on `vehicle_classes` (active) and `vehicle_models` (active), admin-only writes via `has_role`. `updated_at` triggers via existing `set_updated_at`.

Reversibility: no destructive drops in this migration. A follow-up cleanup migration will remove the legacy `pricing_profile_id` from `vehicles` only after everything is green in production.

## Phase 2 — Server functions & pricing

- New `src/lib/vehicle-classes.functions.ts` — `listVehicleClasses`, `getVehicleClass(slug)`, admin CRUD.
- New `src/lib/vehicle-models.functions.ts` — admin CRUD scoped to a class.
- Pricing: `src/lib/pricing.functions.ts` reads `pricing_profile_id` from `vehicle_classes` instead of `vehicles` when a `vehicle_class_id` is passed. The math, mileage tiers, surcharges, snapshot writing — untouched.
- Quote/booking server fns accept `vehicle_class_id` (preferred) and fall back to `vehicle_id` → class lookup for older clients.

## Phase 3 — Customer-facing UI

- Homepage fleet section (`src/routes/index.tsx`): swap vehicle carousel for class cards — hero image, class name, pax/luggage chips, 3–4 representative model names, "View Class" + "Get Quote".
- Fleet page (`src/routes/fleet.tsx` or equivalent): one large section per class — hero, description, spec table (pax, large luggage, cabin bags, child seats, airport/corporate/tours, fuel, accessibility), representative vehicles chips, class disclaimer.
- Booking page (`src/routes/book.tsx`): vehicle picker becomes class picker (hero image, class name, pax, luggage, short desc, representative models, Select). Existing sticky price bar, extras, pricing sidebar unchanged.
- Booking allocation disclaimer component reused on selection, review, confirmation, and ticket views.
- Confirmation / invoice / email / dashboard: display `Vehicle Class: Executive Saloon` + representative models block + allocation note. Historical bookings keep their original `vehicle_type` snapshot.

## Phase 4 — Admin

- New route group `/admin/fleet/classes` — full CRUD, image upload to existing `vehicle-images` bucket, pricing profile assignment, SEO fields, display order drag, featured toggle.
- New `/admin/fleet/models` — CRUD nested under class, operational-only fields.
- Existing `/admin/fleet` (vehicles) becomes read-only "Legacy vehicles" with a "Migrate to model" action, then hidden once empty.
- Pricing profiles admin now shows "used by class" instead of "used by vehicle".

## Phase 5 — Validation

- Typecheck, production build, secret scan.
- Manual booking smoke: quote → book → confirm across three classes (Executive Saloon, Premium MPV, Coach = quote-on-request path).
- Verify existing bookings still render (snapshotted `vehicle_type` intact).
- Verify pricing parity: same origin/destination/date returns the same price before and after for the mapped class.

## Technical details

Files added:

```text
src/lib/vehicle-classes.functions.ts
src/lib/vehicle-models.functions.ts
src/components/site/VehicleClassCard.tsx
src/components/site/VehicleAllocationNotice.tsx
src/routes/fleet.$slug.tsx           # class detail
src/routes/admin/fleet/classes.tsx
src/routes/admin/fleet/classes.$id.tsx
src/routes/admin/fleet/models.tsx
```

Files modified:

```text
src/routes/index.tsx                 # hero fleet -> class cards
src/routes/fleet.tsx                 # class-section layout
src/routes/book.tsx                  # class picker + disclaimer
src/lib/pricing.functions.ts         # resolve profile via class
src/lib/quotes.functions.ts          # accept vehicle_class_id
src/lib/bookings.functions.ts        # write vehicle_class_id + snapshot
src/routes/admin/fleet.*             # split classes vs models
```

Booking snapshot fields written on create: `vehicle_class_id`, `vehicle_class_name_snapshot`, existing `vehicle_type` (kept as human label for continuity), `price`, `distance_miles`. Pricing engine input remains `{ pickup, dropoff, date, extras, profile }`; the profile is now sourced from the class.

Deferred to a future turn (architecture only, no code): dispatch module, driver allocation, per-region fleet visibility, maintenance scheduling. The class/model split and nullable `actual_vehicle_id` slot on `bookings` (added in phase 1) make these drop-in later.

## Rollout order

1. Phase 1 migration (awaits your approval before running).
2. After migration + regenerated types: phases 2–4 land in one batch of edits.
3. Phase 5 validation + a short manual QA pass before we clean up legacy `vehicles.pricing_profile_id`.

Approve to proceed with the Phase 1 migration.
