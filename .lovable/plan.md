# CabsLink Tours Integration — Audit & Phased Plan

## 1. Audit — what already exists

### Database (reused as-is)

- **`scenic_route_templates`** — `id, name, slug, origin_place_id, origin_label, destination_place_id, destination_label, description, service_type, bidirectional, active, featured, default_order_locked, optimisation_allowed, tour_fee_pence, seasonal_note, display_order, timestamps`.
- **`scenic_route_template_pois`** — join: `route_template_id, poi_id, stop_order, recommended, default_selected, recommended_visit_minutes`.
- **`points_of_interest`** — `place_id, name, slug, short_description, category, latitude, longitude, address_label, image_url, recommended/minimum/maximum_visit_minutes, stop_fee_pence, parking_fee_pence, admission_note, opening_hours_note, active, featured, scenic_score, admin_priority`.
- **`bookings`** — already has `scenic_template_id, selected_pois (jsonb), route_legs (jsonb), stops_fingerprint, planned_stop_duration_seconds, driving_duration_seconds, total_journey_seconds, service_type, original_service_type, pricing_snapshot`. Tour data path is ready.
- **`quote_calculations`** — mirrors the same fields plus `classification_reason, final_service_type, direct_distance_miles`.

### Server functions (reused)

- `calculateMultiStopQuote` (`src/lib/scenic-quote.functions.ts`) — authoritative multi-stop pricing engine already returns direct-vs-scenic metrics, per-stop breakdown, tour fee, tax, classification.
- `listPoisForRoute` (`src/lib/pois.functions.ts`) — POI + template lookup by pickup/dropoff Place IDs. Used today by `/book`.
- `scenic-admin.functions.ts` — admin CRUD (`listPois`, `upsertPoi`, `deletePoi`, `listScenicTemplates`, `setScenicTemplateActive`, `getTourSettings`, `updateTourSettings`).
- `createBooking` + snapshot logic already persists `scenic_template_id`, `selected_pois`, `route_legs`, `stops_fingerprint`.

### Client (to be replaced or refactored)

- `src/routes/tours.tsx` — 393 lines of hardcoded Tour arrays + images + prices. **Replace**.
- `src/components/site/TourBookingDialog.tsx` — generic contact form. **Retire for bookable routes** (keep only for custom/tailored enquiries).
- `src/routes/book.tsx` — already handles `scenic_template_id`, POI selection, multi-stop quote and snapshot. Needs one new inbound param path (`templateSlug` → template ID) and draft-restore awareness.

### Gaps requiring migration

The schema is 90% ready. Missing fields we need:

- `scenic_route_templates`: `hero_image_url text`, `short_description text`, `included jsonb`, `excluded jsonb`, `recommended_vehicle_categories text[]`, `recommended_start_time text`, `theme text`, `long_day boolean`, `published boolean default false`, `admin_notes text` (private), `direct_distance_miles_cache numeric`, `direct_duration_seconds_cache integer`, `starting_price_pence_cache integer`, `starting_price_calculated_at timestamptz`, `starting_price_vehicle_id uuid`.
- Unique index on `lower(slug)` for `scenic_route_templates`.
- Publish-guard trigger: require origin/destination Place IDs + slug + at least one active POI when `published=true`.
- Public SELECT policy filtered to `active=true AND published=true`. Admin policy unchanged.
- `place_coords` cache already exists — reuse.

### Data-contract risks discovered

- Hardcoded `TOURS` in `src/routes/tours.tsx` includes fabricated prices ("From £220") — must go.
- `TourBookingDialog` writes to `contact_messages`, bypassing booking pipeline — routes with a real template must not use it.
- No slug lookup path on public side today.

## 2. Route & URL structure

```text
/tours                     -> DB-driven listing (published + active)
/tours/$slug               -> SSR tour detail (loader by slug)
/tours/custom              -> keeps TourBookingDialog for tailored enquiries
/book?...&templateSlug=... -> booking flow preloads template
```

Sitemap adds one entry per published template.

## 3. Public data contract (frozen projection)

`PublicTourListItem`: `slug, name, short_description, hero_image_url, origin_label, destination_label, direct_distance_miles, direct_duration_seconds, recommended_stop_count, starting_price_pence | null, currency, featured, theme, seasonal_note, long_day`.

`PublicTourDetail` adds: `description, included[], excluded[], recommended_vehicle_categories[], recommended_start_time, pois: PublicPoiCard[], related_slugs[]`.

`PublicPoiCard`: `id, name, slug, short_description, category, image_url, recommended_visit_minutes, min/max_visit_minutes, admission_note, opening_hours_note, stop_fee_pence, parking_fee_pence, default_selected, recommended, stop_order`. Admin-only fields (`admin_priority`, `scenic_score`, cost basis, notes) are stripped in the server projection.

## 4. Pricing flow (unchanged authority)

Starting-price cache is a server-side snapshot computed by:

1. Template's origin + destination Place IDs → `route-distance.server`.
2. Add default-selected POIs with their `recommended_visit_minutes` and stop/parking fees.
3. Feed through the existing pricing engine using the **lowest-priced active vehicle profile** that meets `recommended_vehicle_categories` (fallback: cheapest active).
4. Persist `starting_price_pence_cache` + `starting_price_vehicle_id`. Invalidate on template/POI/pricing/site_settings change (SQL trigger sets cache to NULL; nightly `refreshTourStartingPrices` recomputes).

If cache is NULL the UI shows "Price calculated after selecting date & vehicle" — never a fabricated number.

Every customisation change re-calls `calculateMultiStopQuote` (debounced 400ms). React never sums prices.

## 5. Booking integration

`/book` accepts `templateSlug`. Server function `resolveTourTemplate({slug})` returns `{templateId, pickup, dropoff, defaultPois, allowedPoiIds}`. `createBooking` already validates `stops_fingerprint`; we extend the validator to reject POIs outside `allowedPoiIds ∪ corridor suggestions` when a template is selected and to reject removal of mandatory (`recommended AND NOT optional`) stops.

Booking snapshot already stores everything needed (`scenic_template_id`, `selected_pois`, `route_legs`, `service_type`). No new booking columns.

## 6. Security posture

- No new anon writes.
- Public SELECT policies scoped to `active=true AND published=true`; admin-only fields excluded at projection.
- Client sends only IDs + durations; all pricing/validation server-side.
- Existing rate-limit + idempotency + fingerprint checks remain the gate.

## 7. Phases & deliverables

### Phase 2A — Data contract + migration + public server fns

Migration:
- Add columns listed in §1, unique-slug index, publish-guard trigger, public SELECT policy, cache-invalidation triggers.
- Backfill `published=true, hero_image_url` for the two seeded templates so /tours isn't empty.

New files:
- `src/lib/tours.functions.ts` — `listPublishedTours`, `getPublishedTourBySlug`, `resolveTourTemplate`, `refreshTourStartingPrices`. Uses server publishable client for public reads; frozen projections.
- `src/lib/tours-pricing.server.ts` — `computeStartingPrice(templateId)` reusing existing engine.

Tests: `tests/tours-public-projection.test.ts`, `tests/tours-publish-guard.test.ts`, `tests/tours-starting-price.test.ts`.

### Phase 2B — DB-driven listing + detail pages

- Rewrite `src/routes/tours.tsx` as listing that consumes `listPublishedTours` via loader + `useSuspenseQuery`. Empty state honest.
- New `src/routes/tours.$slug.tsx` — SSR loader by slug, notFound on miss, full head() incl. canonical + `TouristTrip` JSON-LD + `og:image` from `hero_image_url`.
- Keep `TourBookingDialog` at `/tours/custom` only.
- Sitemap: `src/routes/sitemap[.]xml.ts` adds one URL per published slug.

Tests: SSR route test asserts title + itinerary render; empty & not-found states.

### Phase 2C — POI customisation + live quote

- New `src/components/tours/TourItinerary.tsx` (timeline, cards, sticky summary desktop, mobile bottom bar). Reuses existing tokens.
- Debounced calls to `calculateMultiStopQuote`. Loading skeleton on price panel.
- Restore-recommended action; long-day warning when `total_journey_seconds > site_settings.long_day_threshold`.

Tests: quote recompute on toggle, mandatory stop cannot be removed, duration clamped.

### Phase 2D — /book handoff + snapshot

- Extend `/book` loader to resolve `templateSlug` via `resolveTourTemplate` (server fn) and hydrate the wizard.
- Extend `createBooking` validation: allowed-POI whitelist, mandatory-stop enforcement, template-vs-place-id consistency, fingerprint reverify.
- Draft persistence updated to include `templateSlug` (safe identifier only).

Tests: end-to-end booking with template selects vehicle, produces snapshot containing `scenic_template_id`, POI diff and route metrics; standard airport transfer still passes existing tests.

### Phase 2E — Admin validation, SEO, E2E

- Extend `scenic-admin.functions.ts` with `publishTemplate` (runs same server-side validators as the DB trigger, returns actionable errors).
- Admin scenic-routes page: add publish toggle + validation feedback + hero image upload (uses existing `vehicle-images`-style bucket or reuses storage).
- Playwright suite `tests/e2e/tours.spec.ts`: listing → detail → toggle POI → price updates → continue → /book → vehicle → submit; and standard airport transfer regression.
- Rescan sitemap + SEO metadata for new routes.

## 8. Reporting after each phase

- Files changed, migration summary, tests added, `bun test` results, typecheck, production build, bundle-secret scan. Playwright only in 2E.

## 9. Explicitly out of scope this phase

Payment capture, email provider swap, automatic POI discovery, waypoint optimisation, driver dispatch, dynamic opening-hours filtering.

---

Approve to proceed with **Phase 2A** (migration + public server fns + contract tests). Nothing else will run until 2A is green.
