## Phase 1 — Secure & Correct Quote / Booking Flow

This plan is scoped to Phase 1 only. No design changes, no payment work, no admin/SEO redesign, no touching `/distance`'s working behaviour beyond extracting shared code.

---

### 1. Remove all fake-distance fallbacks

Files touched: `src/lib/pricing-helpers.server.ts`, `src/lib/pricing.ts`, `src/lib/pricing.functions.ts`.

- Delete `stubDistanceMiles` and every hash/random/estimate path.
- Quote engine must call the real Google Routes helper. On failure (network, timeout, no route, upstream 4xx/5xx) it returns a typed `{ ok: false, error: "route_unavailable" | "route_not_found" | "route_timeout" | "rate_limited" }`.
- `/book` UI shows friendly retry message; addresses/vehicle preserved; Retry button re-invokes.
- `createBooking` refuses to insert if the fresh authoritative quote fails.

### 2. One hardened autocomplete component

New: `src/components/site/PlaceAutocomplete.tsx` — based on the tested `LocationAutocomplete`, exposing:

```ts
export type SelectedPlace = { placeId: string; label: string };
type Props = {
  value: SelectedPlace | null;
  onChange: (v: SelectedPlace | null) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
};
```

Behaviour: UK-only (`includedRegionCodes: ["gb"]`), 300 ms debounce, min 2 chars, AbortController + monotonic seq, dedup normalized queries, edit-invalidates-placeId, ARIA combobox, keyboard nav, single "Powered by Google" attribution (skipped if the parent renders one).

Migrations:
- `BookingWidget` → replaces `AddressAutocomplete` for pickup, dropoff, and each stop.
- `/book` "Edit trip" dialog → same.
- `/distance` `DistanceCalculator` → migrated from `LocationAutocomplete` to the shared component.
- Admin pricing-rule form → uses it to pick `from_place_id` / `to_place_id`.

Old files deleted **after** every usage compiles: `src/components/site/AddressAutocomplete.tsx`, `src/components/site/LocationAutocomplete.tsx`.

### 3. Carry Place IDs end-to-end

`BookingWidget` submits a URL search containing:
`pickupPlaceId`, `pickupLabel`, `dropoffPlaceId`, `dropoffLabel`, `stops` (array of `{placeId,label}` JSON-encoded), plus existing date/time/pax/luggage/return.

`/book`:
- Zod-parses the search params.
- If pickup or dropoff placeId missing/invalid → renders an "Enter your journey first" panel with a link back to `/#booking`. No quote call.
- Changing either location clears the loaded quote and the selected vehicle; refetch is required.

### 4. Server-side validators

Shared Zod schema in `src/lib/place-id.ts`:

```ts
export const placeIdSchema = z.string()
  .trim()
  .min(1)
  .max(255)
  .regex(/^[A-Za-z0-9_-]+$/, "invalid place id");
```

Applied in `calculateQuotes` and `createBooking` inputValidators:
- pickup + dropoff placeIds required and distinct.
- Optional stops[] each validated independently.
- Any body field named `distanceMiles`, `price*`, `mileageRate`, `fixedPrice`, `discount`, `surcharge`, `tax` on the client payload is **ignored** — server always recomputes from Place IDs.
- `createBooking` re-runs the authoritative quote server-side; the client-supplied total is compared and rejected if it differs from the server total (tolerance £0.01).

### 5. Shared route-distance helper

Extract from `src/lib/route-distance.functions.ts` a pure helper `computeRoute({ originPlaceId, destinationPlaceId, waypointPlaceIds? })` in `src/lib/route-distance.server.ts` returning `{ distanceMeters, distanceMiles, durationSeconds }` or throwing typed errors (`RouteTimeoutError`, `RouteNotFoundError`, `RouteUpstreamError`).

- 10 s AbortController timeout.
- FieldMask `routes.distanceMeters,routes.duration`.
- Success cache: 10 min in-memory (already present, per-Worker comment retained).
- Failures not cached (except 60 s negative cache for 429 to avoid hammering).

Both `/distance`'s server fn and the new quote engine call this helper.

### 6. Fixed-price rule — exact Place-ID matching

Migration `add_place_ids_to_pricing_rules`:

```sql
ALTER TABLE public.pricing_rules
  ADD COLUMN from_place_id text,
  ADD COLUMN to_place_id text,
  ADD COLUMN from_place_label text,
  ADD COLUMN to_place_label text,
  ADD COLUMN bidirectional boolean NOT NULL DEFAULT false;

CREATE INDEX pricing_rules_place_pair_idx
  ON public.pricing_rules (from_place_id, to_place_id)
  WHERE from_place_id IS NOT NULL AND to_place_id IS NOT NULL;
```

- No data deleted. Existing rows keep their legacy text fields.
- Server matches ONLY on `(from_place_id, to_place_id)` exact pair (plus reverse when `bidirectional = true`).
- Rows without both Place IDs are **never** matched at runtime — they show a "Requires location re-selection" pill in the admin list.
- Admin form uses `PlaceAutocomplete` to populate `from_place_*` / `to_place_*`.

### 7. Protect `createBooking`

- Sliding-window rate limit: **10 attempts / 10 min / IP** (in-memory, per-Worker; comment noting future distributed store). Friendly HTTP 429 message.
- `bookings.idempotency_key text unique` column via additive migration; server validates key shape (UUIDv4) and returns the existing row on repeat.
- Frontend generates one UUID per booking attempt (kept in ref) — reused for retries, regenerated only on a fresh form.
- All state-changing validation via Zod; internal errors logged server-side, client sees generic message.
- Insert only after server quote succeeds.

### 8. Autocomplete endpoint hardening

- Remove `src/routes/api/places-autocomplete.ts` (unprotected HTTP route) — replace with a single hardened `placesAutocomplete` `createServerFn` in `src/lib/places.functions.ts`.
- Enforce: min 2 / max 100 chars, UK region, 8 s timeout, 60 s cache of identical normalized queries, per-IP sliding limit (60/min).
- Update the `PlaceAutocomplete` component to call the server fn.

### 9. Contact form protection

- Zod schema (already partially present) + `website` honeypot field (must be empty).
- Per-IP sliding limit: 5 submits / 10 min.
- Duplicate submit blocked by client `inflight` ref + server hash of `(email, message)` in last 5 min.
- Generic error surface.

### 10. Bundle-scan test correctness

`tests/bundle-scan.test.ts`:
- Runs `bun run build` (production client) into a temp `dist/` before scanning, OR fails hard with a clear message if the dir is absent.
- Injects deterministic dummy secret values via env just for the build, then asserts neither the credential **names** nor the dummy **values** appear in any `dist/client/**/*.{js,css,html}` file. Real secret values are never printed.

### 11. Tests to add

All under `tests/`:

- `booking-widget-requires-place-ids.test.tsx`
- `booking-widget-free-text-blocks-submit.test.tsx`
- `place-autocomplete-edit-invalidates.test.tsx`
- `booking-widget-stale-response.test.tsx`
- `book-route-empty-state.test.tsx`
- `quote-route-failure-no-dummy.test.ts`
- `booking-route-failure-no-insert.test.ts`
- `quote-ignores-client-distance.test.ts`
- `quote-ignores-client-price.test.ts`
- `fixed-price-place-id-exact.test.ts`
- `fixed-price-label-injection.test.ts`
- `quote-rejects-identical-places.test.ts`
- `create-booking-double-click.test.ts`
- `create-booking-idempotency-replay.test.ts`
- `create-booking-rate-limit.test.ts`
- `places-autocomplete-rate-limit.test.ts`
- `contact-rate-limit-honeypot.test.ts`
- `bundle-scan-requires-build.test.ts` (meta-test for #10)
- Existing `bundle-scan.test.ts` upgraded to enforce dummy-value absence.

### 12. Preservation guarantees

- No changes to admin auth, admin booking list, mobile layouts, marketing design, `/distance` UX or its 4 existing test files.
- All migrations are additive (`ADD COLUMN` / `CREATE INDEX` only). No drops.
- Old `AddressAutocomplete` / `LocationAutocomplete` deleted only after every import migrates.

### 13. Verification report

Final message will list: files changed, migration filenames, deleted files, Place-ID data flow, confirmations for fake-distance removal & free-text rule removal, rate-limit config, idempotency behaviour, test names, `vitest` count + result, `bun run build` result, and any remaining known issues (e.g. per-Worker in-memory limiter is not distributed).

---

### Technical notes

- Rate limiter + cache stay in `route-distance.server.ts`-style modules with the existing per-Worker comment; a shared `src/lib/rate-limit.server.ts` will house the sliding-window primitive used by bookings / contact / autocomplete.
- Idempotency key column requires an additive migration; PostgREST GRANTs re-issued in the same migration.
- The `AddressAutocomplete` component currently used by `BookingWidget` will be removed; if any admin route imports it, it is migrated in the same batch.

Please confirm and I will proceed.
