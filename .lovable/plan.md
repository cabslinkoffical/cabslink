## Goal

Turn the Book page into a stepped flow with a proper POI upsell, and rebuild the Tours page around real UK airport-based tours (with famous stops in between) that customers can book directly.

## Book page — stepped flow

Convert `src/routes/book.tsx` into a wizard with a top progress bar and Back/Next buttons.

Steps:
1. **Route** — pickup, destination, date/time, passengers/luggage. (Same inputs as today.)
2. **Extras** — one combined page containing:
   - **Famous points between the area** (the POI upsell). Cards like the Viator-style reference: image, name, "1h 30m for £X" (included time + extra-time charge), + button to add. Selecting a stop updates the running quote using existing `calculateMultiStopQuote` (stop fee + parking + overrun × price_per_extra_15min). "Skip stop selection" is available.
   - **Add-ons**: meet & greet, child seat, extra luggage (toggles with fees pulled from `site_settings`).
3. **Vehicle** — pick from the vehicles returned by the live quote (each card shows updated total).
4. **Passenger details** — name, email, phone, flight number, notes.
5. **Payment & policy** — cancellation policy tiers (Non-refundable / Standard / Flexible) matching the reference image, then payment/confirmation.

POI source: existing `points_of_interest` table. Filter server-side by a simple bounding-box around the pickup→destination straight line (haversine, ≤ ~15 miles off route), only `active = true` and `category = 'attraction'`. New server fn `listPoisNearRoute` in `src/lib/pois.functions.ts`.

Wizard state is kept in URL search params (`step`, `stops`, `extras`, `vehicle`, `policy`) using `validateSearch` + `fallback` so refresh/back preserves selection. Existing `calculateMultiStopQuote` is called on every stops/route change via TanStack Query.

## Tours page — real UK airport tours

Rebuild `src/routes/tours.tsx` to list curated tours grouped by originating UK airport, focused on **Edinburgh Airport (EDI)**, plus London Heathrow, Manchester, Glasgow.

For each tour show:
- Hero image, title, airport start point, end point, duration, distance
- Ordered list of famous stops in between with thumbnail, name, suggested time
- Price = mileage-tier price for the full route (uses existing pricing engine — no bespoke tour fee unless admin set one on the scenic template)
- "Book this tour" button → deep-links into `/book` with pickup, destination and pre-selected stops filled in via search params, dropping the user on step 2 (Extras) so they can confirm/adjust.

Data source: existing `scenic_route_templates` + `scenic_route_template_pois`, but ship a seed migration that inserts a curated set of Edinburgh-airport-based tours (Edinburgh Old Town, Rosslyn Chapel, Stirling Castle, Loch Lomond, St Andrews, Glencoe/Highlands day tour) plus one from each other airport, with their POIs (creating the POI rows too, all with real Google Place IDs — a placeholder set marked `active = false` until admin adds Place IDs, so they don't break the active-template guard). Admin can toggle activation from the existing scenic-routes admin page.

New server fn `listPublicTours` returns active templates joined with their ordered POIs and a computed price using the existing pricing engine.

## Technical notes

- All quoting continues to go through `calculateMultiStopQuote` — no new pricing math.
- Wizard uses `Route.useSearch()` + `useNavigate` (no `useState` for step data that should survive refresh).
- Payment step is a UI-only policy selector for now (writes chosen policy onto the booking); it does not change the existing payment integration.
- POIs proximity filter: haversine radius from midpoint of pickup→destination, radius = distance/2 + 15mi. Cheap, no extra Google calls.
- Seed migration only inserts rows that don't already exist (`ON CONFLICT DO NOTHING` on `slug`/`place_id`).

## Files

- `src/routes/book.tsx` — rewrite as wizard shell with 5 step components
- `src/components/booking/StepRoute.tsx`, `StepExtras.tsx`, `StepVehicle.tsx`, `StepDetails.tsx`, `StepPayment.tsx`, `WizardProgress.tsx`, `PoiUpsellCard.tsx`, `PolicyCard.tsx`
- `src/lib/pois.functions.ts` — add `listPoisNearRoute`
- `src/lib/tours.functions.ts` (new) — `listPublicTours`
- `src/routes/tours.tsx` — rewrite around real tours + stops
- `supabase/migrations/<ts>_seed_uk_airport_tours.sql` — POI + scenic template seeds

## Out of scope

- No changes to admin fleet, pricing, or payment provider integration.
- No new pricing rules; tour price = mileage engine + any admin-set scenic fee.
