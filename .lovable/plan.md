# Phase 1 completion plan

Scope: finish the production-readiness pass before any Tours / scenic-route work. Nothing about the pricing engine, HMAC tokens, snapshots, admin permission model, replay/idempotency, or existing tests changes.

---

## 1. Booking draft — harden the /book integration

The utility and a first pass are already wired. Remaining work:

- **URL wins over draft**: current mount effect only hydrates when `q` is empty — keep that, but also skip hydration when the URL provides any pickup/dropoff PlaceId. Add a one-shot `didHydrateRef` so navigation-driven `q` changes never re-trigger hydration (prevents Back/Forward loops).
- **Downgrade invalid drafts**: after hydration, run a lightweight validity pass — if `vehicleSlug` no longer maps to a `listPublicVehicles` result, drop it silently; if pickup === dropoff, drop both.
- **Persist selected step**: extend `BookingDraft` with `step` (whitelisted enum), `selectedStops`, `meetGreet`, `childSeatCount`, `routeMode`. Update `stripForbidden` + tests.
- **Debounce persistence**: replace the current effect with a 300 ms debounced write to avoid write-per-keystroke on numeric fields.
- **Start again**: add a subtle "Start again" ghost button in the wizard header that calls `clearDraft()`, resets local state, and `navigate({ search: { q: "" }, replace: true })`.
- **Never persist server prices**: audit — only inputs go in; `chosen` stays as `vehicleSlug` id only, no fare fields.

Tests to add (`tests/booking-draft-integration.test.tsx`, jsdom):
1. Hydrates wizard from stored draft on refresh.
2. Non-empty URL `q` wins over stored draft.
3. Draft cleared after successful `createBooking` (mock server fn).
4. `vehicleSlug` pointing at an unknown vehicle is dropped, other fields kept.
5. Expired draft (TTL+1ms) is ignored.
6. PII keys attempted via `saveDraft` are stripped (extend existing).
7. Restored journey triggers exactly one `calculateQuotes` call (not duplicated by hydration).
8. "Start again" clears session + URL + local state.

## 2. Public functionality + copy audit (runtime, not source-only)

Runtime harness: a Playwright script that walks each flow against `http://localhost:8080`, captures screenshots and the resulting `bookings` row shape via `supabase--read_query`. For each flow the outcome is one of *operational*, *hide from public*, or *relabel*.

Flows tested end-to-end:

- **Standard one-way** — must remain operational (regression check).
- **Hourly** — check tab, min-duration guard, quote, submit, snapshot `journey_type`, admin visibility. If any step fails → hide the Hourly tab behind a "Coming soon" pill.
- **Return journey** — check return date/time validation, pricing source, snapshot fields, admin display. If return pricing is not server-authoritative end-to-end → disable the toggle with "Contact us for return pricing".
- **Add stop / POI stops** — verify recalculation, snapshot preserves stop list, admin itinerary shows stops. Document POI vs freeform stop divergence.
- **Confirmation email claims** — grep every `email`/`confirmation` string; replace any "we've emailed you" wording with on-screen confirmation copy where notifications adapter is `not_configured`. Admin notification logs stay untouched.

Deliverable: a claim → route → runtime status → action → final wording table in the completion report.

## 3. Missing server-function tests

Add three suites (Vitest, no jsdom needed):

- `tests/corporate-functions.test.ts` — valid submit, invalid email, missing required fields, honeypot silent-200, rate-limit trip, dup-hash rejection, generic error surface, allowlist enforcement (bonus keys ignored), plus a static grep asserting `corporate-booking.tsx` contains no `supabase.from(` write.
- `tests/driver-application.test.ts` — same battery, plus licence-format validation, plus grep on `drive-with-us.tsx`.
- `tests/fleet-functions.test.ts` — only `active=true` returned, only public-safe columns present (assert no `cost`/`margin`/`internal_notes`/etc.), stable `display_order` sort, DB error returns `[]` (already the code path — lock it in), empty result path.

Mocking: stub `@supabase/supabase-js` `createClient` per suite so we don't hit the live DB.

## 4. Content Blocks audit → decide A or B

Enumerate every read/write of `content_blocks` and every consuming route. Given prior scans suggest zero public consumption, default recommendation is **Outcome B**:

- Remove the "Content Blocks" link from admin sidebar.
- Keep the route file and DB table (no schema change).
- Add a top-of-page banner on the route itself: "Experimental — not wired to public site."

If the audit finds actual public consumers, switch to Outcome A: introduce a `getContentBlock(key)` server fn with typed keys + safe fallbacks and wire only those keys.

## 5. Legacy vehicle pricing columns audit

For each of `base_fare`, `per_mile_rate`, `waiting_charge`, `price_per_hour`, plus any siblings surfaced by grep:
- read sites, write sites, migration usage, admin form binding, whether production pricing depends on it.

Report only in this task; produce a migration plan document at `.lovable/legacy-pricing-migration.md` covering: backfill, compatibility window, read-path removal step, write-path removal step, validation queries, rollback, final drop migration. **No columns dropped this phase.**

## 6. Fleet SSR + SEO verification

- Build with `bun run build`, curl the built `/fleet` route via `stack_modern--invoke-server-function`, grep the HTML for each vehicle `name` and `alt=` text, assert `<a href="/book?vehicle=…">` is present.
- Add `tests/fleet-ssr.test.ts` that renders the route with a stubbed query client seeded via `ensureQueryData` and asserts vehicle names appear in server-rendered markup.
- Confirm error/empty states never leak DB error messages (audit the catch block).
- Lock the public projection: add a compile-time `satisfies` check on `PublicVehicle` so accidental column expansion in `listPublicVehicles` fails typecheck.

## 7. Legal-page discoverability + launch guard

- Footer links: verified present; add a test asserting each of the 6 legal routes is linked from `Footer.tsx`.
- Sitemap: already includes them; add explicit assertion in `sitemap-routes.test.ts`.
- Canonicals: switch each legal route's `<link rel="canonical">` to a **relative** path so preview vs production domain is resolved at request time (matches sitemap/robots guidance). Do the same for other public routes that currently hardcode a domain.
- `[ADMIN TO COMPLETE]` markers: grep, ensure only inside legal pages, and render them in a visibly-styled `<mark>` so nobody mistakes them for finalized copy.
- Add a small `LegalReadinessBanner` component shown only inside `_authenticated/admin` when any legal page still contains `[ADMIN TO COMPLETE]`, listing which pages are incomplete. Not shown on the public site. Not a deploy blocker technically, but a persistent admin warning.

## 8. Validation

After each phase: `bunx tsgo --noEmit`, `bunx vitest run`, `bun run build`, and the existing bundle-secret scan (`tests/bundle-scan.test.ts`).

Manual runtime checklist (executed via Playwright, screenshots saved under `/tmp/browser/phase1/`): standard one-way, hourly, return, add-stop, refresh at each step, Back/Forward, successful booking clears draft, expired draft ignored, corporate form, driver application, fleet SSR HTML dump.

## Risks

- Runtime tests may reveal that hourly / return / stops need to be hidden. That is the intended outcome — we ship honest UI, not a rebuild.
- Debouncing draft writes could race with `clearDraft` on submit — mitigation: `clearDraft` cancels the pending debounce timer.
- Adding `step` to the draft could resurrect a stale wizard state after a schema change — mitigation: on hydration, always reset to `"vehicle"` if `chosen` cannot be recovered from `vehicleSlug`.

## Order of execution

1. Draft hardening + tests
2. Server-fn tests (corporate, driver, fleet)
3. Runtime audit of hourly / return / stops → hide or relabel
4. Confirmation-email copy sweep
5. Content Blocks decision + admin hide
6. Legacy-pricing audit doc
7. Fleet SSR check + legal discoverability + launch guard
8. Full validation sweep + final report

Per-phase report: files changed, tests added, test/typecheck/build results, remaining limitations. No scenic-routes / Tours work touched.

## Decisions needed before I start

- **Content Blocks**: OK to default to Outcome B (hide from admin nav, keep table) unless the audit surfaces public consumers?
- **Hourly / Return / Stops**: if runtime tests show they are not fully server-authoritative, OK to hide/disable them with honest copy rather than fix them in this phase?
- **Legal launch guard**: admin-only warning banner acceptable, or do you want a hard deploy check (would require build-time script + workflow change)?
