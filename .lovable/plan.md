
# Phase 2B-2 — Route POIs, Sightseeing Stops, Tour Conversion

Delivered in 3 turns so each is reviewable and costs less to iterate on than one giant PR. Every rule from your spec is respected — nothing is dropped, only sequenced.

## Scope decisions locked in

- **POI discovery**: curated only. The `points_of_interest` table + curated route templates drive suggestions. Google **Search Along Route** is scaffolded as a server function stub behind a `poi_discovery_enabled` site setting (default off) and wired in a later phase. Reason: matches how you'll seed Edinburgh→Fort William, avoids per-quote Google cost, and every test in your spec still passes against curated data.
- **Edinburgh→Fort William seed**: migration inserts the template + 7 POI rows as `active=false` with empty `place_id`. A DB trigger blocks activation until every `place_id` is a valid Place-ID string (reuses your existing `placeIdSchema` shape via a CHECK). Admin resolves each through the POI page's Google PlaceAutocomplete, then flips `active=true`.
- **No Resend, no payments, no coupons, no hourly.** No frontend money. Additive migrations only. Existing Google Places connector, Routes integration, Place-ID validation, pricing engine, snapshots, idempotency and confirmation tokens all preserved.

## Turn 1 — Data model + engine + server + tests (this PR)

**Migrations (additive)**
1. `points_of_interest` — full schema from spec, with CHECK: `active=true ⇒ place_id ~ '^[A-Za-z0-9_\-:.=@]+$'`. GRANTs: `SELECT` to `anon` (active only, via RLS), full to `authenticated` admin, all to `service_role`. Trigger `log_admin_action` attached.
2. `scenic_route_templates` + `scenic_route_template_pois` join. Partial unique index on `(origin_place_id, destination_place_id)` where `active`. Bidirectional matching handled in the matcher, not the schema.
3. `site_settings` extension: `sightseeing_threshold_minutes` (default 30), `tour_threshold_minutes` (120), `tour_threshold_stops` (3), `max_selected_stops` (8), `max_detour_miles`, `max_detour_minutes`, `poi_discovery_enabled` (false), `allowed_stop_duration_minutes` (int[] default `{15,30,45,60,90,120}`), `included_stop_minutes`, `price_per_extra_15min_pence`.
4. `quote_calculations` + `bookings.pricing_snapshot` schema bump to `engine_version = "2026.07.2"`. Additive columns: `direct_distance_miles`, `direct_duration_seconds`, `driving_duration_seconds`, `planned_stop_duration_seconds`, `total_journey_seconds`, `route_mode` (`direct|scenic|optimised`), `original_service_type`, `final_service_type`, `classification_reason`, `selected_pois jsonb`, `route_legs jsonb`, `polyline_ref text`, `stops_fingerprint text` (SHA-256 of ordered `place_id|minutes` pairs — invalidates on any stop/order/duration change).
5. `bookings`: `service_type`, `original_service_type`, `tour_conversion_ack_at`, `stops_fingerprint`.
6. Seed migration: Edinburgh→Fort William template + 7 POI rows (Kelpies, Falkirk Wheel, Stirling Castle, Doune Castle, Callander, Lochearnhead, Glencoe), all inactive with empty `place_id`.

**Engine (`src/lib/pricing.ts` + `pricing-helpers.server.ts`)**
- New line kinds: `stop_fee`, `stop_time`, `parking`, `scenic_fee`.
- Total = existing driving/mileage/fixed + Σ(per-stop base fee) + Σ(planned-time charge above `included_stop_minutes`) + parking + scenic/tour fee + surcharges + tax.
- `plannedStopSeconds` computed separately; `runPricingEngine` returns `drivingDurationSeconds`, `plannedStopDurationSeconds`, `totalJourneySeconds` — never merged.
- Classification helper `classifyService(stops, plannedMinutes, thresholds)` returns `{ service_type, reason }`. Server-only.

**Server functions (`src/lib/pois.functions.ts`, `scenic-routes.functions.ts`, extends `pricing.functions.ts`)**
- `listPoisForRoute({ pickup_place_id, dropoff_place_id })` — matches curated template by exact Place-ID pair (bidirectional flag respected), returns template + curated POIs ranked by `admin_priority DESC, scenic_score DESC, detour ASC`. No template ⇒ returns POIs whose `place_id` is a stopover on the direct route by re-running Routes API with each candidate as intermediate and filtering by `max_detour_miles / max_detour_minutes`. Cached 10 min.
- `calculateMultiStopQuote({ vehicle_id, pickup_place_id, dropoff_place_id, stops: [{ place_id, minutes }], route_mode })` — validates stops (min/max minutes, `≤ max_selected_stops`, no duplicate consecutive, all Place-IDs valid), calls Routes API with `intermediates` + `optimizeWaypointOrder` when `route_mode='optimised'` and template isn't locked, builds full snapshot, returns quote + fingerprint. Reuses `computeRoute` (extended to accept waypoints — already supported) and existing rate limiter.
- `previewScenicOrderStub` — Search Along Route stub gated by `poi_discovery_enabled`.
- Admin fns (`admin.functions.ts` additions): `upsertPoi`, `deactivatePoi`, `upsertScenicTemplate`, `reorderTemplateStops`, `updateTourSettings`. All `.middleware([requireSupabaseAuth])` + `has_role('admin')` check + Zod + activity log.
- Booking creation extended: rejects if `stops_fingerprint` in submitted quote doesn't match server recomputation; requires `tour_conversion_ack_at` when `original_service_type != final_service_type` and final is `sightseeing_transfer|private_tour`.

**Tests (`tests/`)** — 30 tests covering every item in spec §18. Files: `poi-matching.test.ts`, `scenic-template-match.test.ts`, `multi-stop-quote.test.ts`, `classification.test.ts`, `stops-fingerprint.test.ts`, `poi-admin-authz.test.ts`, plus extends to `pricing-engine.test.ts` and `create-booking.test.ts`.

## Turn 2 — Admin UI

Routes under `src/routes/_authenticated/admin/`:
- `pois.tsx` — CRUD, PlaceAutocomplete for `place_id`, image upload to `vehicle-images` bucket (reused), all fields from schema, activate/deactivate, "Preview affected routes" panel.
- `scenic-routes.tsx` — origin/destination via PlaceAutocomplete, POI multi-select + drag reorder (`@dnd-kit` — already in deps? if not, added via `bun add`), lock-scenic-order toggle, tour fee, seasonal notes, preview panel calling `calculateMultiStopQuote`.
- `tour-settings.tsx` — thresholds, max stops, max detour, included stop minutes, price per 15 min, allowed duration increments (chip editor), poi_discovery_enabled toggle.
- Sidebar nav entries added.

## Turn 3 — Customer UI + tour conversion UX

- `BookingWidget.tsx`: after direct quote returns, render "Enhance your journey" section — curated POI cards (checkbox, image or neutral placeholder, name, category, description, recommended duration, `+X min / +Y mi` detour, price delta). Selecting reveals duration segmented control from `allowed_stop_duration_minutes`.
- Order chooser: `Recommended scenic` / `Fastest` / `Direct` (Fastest hidden when template is order-locked).
- Live itinerary panel: driving time, planned visits time, total journey — three separate rows, no merged number.
- Conversion banner appears when `final_service_type` changes; blocks "Book Now" until the acknowledgement checkbox is ticked; ack timestamp captured and sent with booking.
- `book.tsx` receives the snapshot including `stops_fingerprint`; server re-verifies before creating booking.

## Technical details

**Route matching order**: (1) exact Place-ID pair on active template, (2) reversed pair when `bidirectional=true`, (3) proximity fallback disabled by default (config flag), (4) no match ⇒ curated POIs only. Never substring match.

**Fingerprint**: `sha256(pickup|dropoff|route_mode|stop1_place_id:stop1_min|stop2…)`. Written into snapshot, checked at booking. Any change ⇒ 409 with "quote expired, please refresh".

**Detour calc**: `detour = route_with_stop.miles - direct_route.miles`. Same for seconds. Computed via Routes API, not straight-line.

**Optimisation**: passes `optimizeWaypointOrder: true` only when `route_mode='optimised'` AND template `default_order_locked=false`. Reads `optimizedIntermediateWaypointIndex`, reorders `stops` in the returned snapshot, UI shows the reorder before confirm.

**Cost control**: (a) curated-first — no Google POI call for the common case; (b) SAR gated off by default; (c) Routes API responses cached by fingerprint 10 min in existing `route-distance.server.ts` cache; (d) rate limiter reused; (e) strict `X-Goog-FieldMask` on any Places calls added later.

**Bundle safety**: all Google/server-role code lives in `*.server.ts` or handler bodies inside `*.functions.ts`. `tests/bundle-scan.test.ts` extended to assert new POI/scenic files don't leak `GOOGLE_MAPS_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` into the client bundle.

**Files created (Turn 1)**
- `src/lib/pois.functions.ts`, `src/lib/scenic-routes.functions.ts`, `src/lib/classification.ts`, `src/lib/stops-fingerprint.ts`
- extends: `src/lib/pricing.ts`, `src/lib/pricing-helpers.server.ts`, `src/lib/pricing.functions.ts`, `src/lib/admin.functions.ts`, `src/lib/booking.functions.ts`, `src/lib/route-distance.server.ts` (waypoints support already partial)
- 6 new test files, 2 extended

## Confirm to proceed

Reply **"go"** and I start Turn 1 immediately. Reply with edits if you want a different split (e.g. include admin UI in Turn 1, or wire live Search Along Route now — adds ~1 turn of work and per-quote Google cost).
