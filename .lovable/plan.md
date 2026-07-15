
# CabsLink Production-Readiness — Phase 1

Focused hardening pass on top of the current app. Nothing about the pricing engine, booking creation, snapshots, HMAC tokens, admin permission model, replay/idempotency, or existing tests changes.

## Phase A — Secure public form submissions

Reuse the pattern already in `src/lib/contact.functions.ts` (Zod → rate-limit → honeypot → dup-hash → generic error → activity log). Create parallel server functions for the two direct-write routes.

Files to add:
- `src/lib/corporate.functions.ts` — `submitCorporateInquiry` server fn
- `src/lib/driver-application.functions.ts` — `submitDriverApplication` server fn
- `src/lib/public-form-guard.server.ts` — shared honeypot + fingerprint + generic-error helper (extracted from contact where useful)

Files to modify:
- `src/routes/corporate-booking.tsx` — call server fn via `useServerFn`, remove direct `supabase.from('contact_messages').insert(...)`, add hidden honeypot field
- `src/routes/drive-with-us.tsx` — same treatment

DB:
- Reuse `contact_messages` (both flows already write here); add a `submission_type` value (`corporate` / `driver_application`) via server-set field, never client-supplied. Client payload allowed keys strictly whitelisted in the validator.
- No schema change needed; `metadata` jsonb already exists on contact_messages for form-specific extra fields.

## Phase B — Fleet page reliability

Files to modify:
- `src/routes/fleet.tsx` (verify path) — switch initial data to a public server fn read (SSR-friendly), keep realtime as progressive enhancement only.
- `src/lib/fleet.functions.ts` — add `listPublicVehicles` server fn using publishable-key server client + narrow public SELECT (returns only: id, slug, name, description, image_url, passengers, luggage, features[], display_order). No admin fields (cost, margins, driver notes, etc.).

Loader pattern: `ensureQueryData` → `useSuspenseQuery`. Add explicit empty/error UI + skeleton. Each card gets a "Get a quote" button linking to `/book?vehicle=<slug>`. Alt text: `"{vehicle.name} — chauffeured {passenger_capacity}-seat vehicle"`.

## Phase C — Honest public claims

Copy-only changes; no logic removed. Deliverable includes the full changelog table.

Preliminary claim changes (to be finalized in the diff report):
| Location | Before | After | Reason |
|---|---|---|---|
| Book widget step 1 CTA | "Book now" | "See vehicles & prices" | No booking created yet at that step |
| Book confirmation copy | "Confirmation email sent" | "Booking confirmation displayed on screen" | Email adapter is a stub |
| Homepage "Secure payment" badge | "Secure payment" | "Secure booking" | Card capture is not live |
| Header "Book a Ride" | scroll-to-widget on `/`, else `/book` | same, but always resolves to `/book` on other pages | Currently a text-only anchor on some routes |
| Availability strip | "Chauffeurs available now" | "24/7 booking" | No live driver-presence signal |
| Hourly tab (if not fully wired) | active tab | hidden or "Coming soon" badge | Prevents dead flow |
| Return-journey toggle (if server pricing not verified) | free-form toggle | disabled with "Contact us for return pricing" | Avoid client-side price fiction |
| Add-stop button (if not persisted) | active | disabled + tooltip | Same reason |
| Instant-payment confirmation | any wording | remove or replace with "We'll email you to confirm" | |

Exact set will be finalized after I re-verify each claim's runtime behaviour and reported alongside the diff.

## Phase D — Site-wide public issues

- `src/components/site/Footer.tsx` — split merged phone numbers with proper `tel:` links; replace `#` social links with `rel="noopener"` real URLs or hide until provided; add legal-page links.
- `src/routes/contact.tsx` — hide the honeypot field with `sr-only` + `aria-hidden` + `tabIndex={-1}` + `autoComplete="off"`.
- Fix "5 tour s" typo (grep and correct).
- `src/components/site/Header.tsx` — "Book a Ride" always resolves: if on `/`, scroll to `#book`, else `navigate({ to: '/book' })`.
- `src/routes/sitemap.xml.ts` — include: `/`, `/book`, `/tours`, `/fleet`, `/services`, `/contact`, `/corporate-booking`, `/drive-with-us`, `/privacy`, `/terms`, `/cookies`, `/booking-policy`, `/refund-policy`, `/accessibility`.
- Add `<link rel="canonical">` per public route via head().
- Replace `href="#"` / dead buttons on Services with `<Link to="/book">` or remove.
- Homepage primary CTA: scroll to `#book` on `/`, navigate to `/book` elsewhere.

## Phase E — Legal & policy pages

Files to add (all public routes, semantic HTML, matching site design tokens, using existing SectionHeader / Footer patterns):
- `src/routes/privacy.tsx`
- `src/routes/terms.tsx`
- `src/routes/cookies.tsx`
- `src/routes/booking-policy.tsx`
- `src/routes/refund-policy.tsx`
- `src/routes/accessibility.tsx`

Each page:
- Real head() metadata (title, description, canonical)
- Clearly-marked `[ADMIN: complete this — company registration / VAT / ICO / etc.]` placeholders instead of invented facts
- Last-updated date pulled from a per-page constant
- Footer link added

## Phase F — Admin stub cleanup (non-destructive)

- Hide non-functional topbar Search input in `src/components/admin/AdminTopbar.tsx` (or equivalent) behind a comment marker, OR render disabled with "Coming soon" tooltip.
- Same for Notification bell.
- Remove Google Maps API key input from Settings page; add note "Configured via environment (`GOOGLE_MAPS_API_KEY`)".
- Content Blocks: audit references first. If unused end-to-end, hide the admin route link only (leave DB table + files). Report findings.
- Legacy pricing columns on `vehicles`: enumerate call sites in a section of the final report; no DB change this phase.

## Phase G — Booking draft resilience

Files to add:
- `src/lib/booking-draft.ts` — pure utility: `saveDraft(partial)`, `loadDraft()`, `clearDraft()`, `DRAFT_TTL_MS`. Uses `sessionStorage` with schema-validated (Zod) shape. Never stores name/email/phone/notes/tokens.

Files to modify:
- `src/routes/book.tsx` — hydrate wizard state from URL `?q=` (existing) merged with sessionStorage draft on mount; write draft on step transitions (debounced); clear on successful booking creation.
- Whitelisted draft fields: `pickupPlaceId`, `pickupLabel`, `dropoffPlaceId`, `dropoffLabel`, `date`, `time`, `passengers`, `luggage`, `vehicleSlug`, `stops[]` (placeId, label, durationMin), `extras{}`, `returnJourney` (bool + return time only).

## Phase H — Tests

New Vitest specs (colocated under `src/**/__tests__` following existing conventions):
- `corporate.functions.test.ts` — schema rejects bad input; honeypot triggers 200 silent; rate-limit trips after N; duplicate hash rejected.
- `driver-application.functions.test.ts` — same battery.
- `fleet.functions.test.ts` — `listPublicVehicles` projects only public fields; excludes inactive; sort order.
- `fleet.route.test.tsx` — empty state and error state render.
- `booking-draft.test.ts` — round-trip, TTL expiry, PII filter (name/email/phone/notes never persisted).
- `sitemap.test.ts` — asserts each public route present.
- `public-cta.test.tsx` — header/home CTAs resolve to a real route.
- `bundle-secret-scan.test.ts` — greps `dist/` output for `SUPABASE_SERVICE_ROLE_KEY`, `sb_secret_`, `BOOKING_TOKEN_SECRET`, `GOOGLE_MAPS_API_KEY` value patterns; fails if found.

Run after each phase: `bunx vitest run`, `bunx tsgo --noEmit`, production build (`bun run build`), plus bundle secret scan.

## Risks to existing booking flow

- Draft hydration must NEVER override server-authoritative price snapshots or the HMAC-signed token payload. Draft only feeds inputs; every quote recompute still goes through `calculateQuotes` server fn. Confirmed by keeping draft strictly to input fields.
- Return-journey / add-stop UI disable is copy-and-attribute only — the underlying handlers stay; a follow-up phase can re-enable once server pricing is verified end-to-end.
- Fleet server fn is read-only anon; RLS policy audit before enabling to avoid exposing draft/inactive vehicles.

## Execution order

1. Plan approval
2. Phase A (forms) + tests
3. Phase B (fleet) + tests
4. Phase C (honest copy) + report
5. Phase D (site-wide fixes)
6. Phase E (legal pages)
7. Phase F (admin cleanup + legacy-columns report)
8. Phase G (draft) + tests
9. Phase H final full test/typecheck/build/bundle-scan sweep + summary

After each phase I'll post: files changed, tests added, test/typecheck results, remaining limitations. Nothing about scenic routes / intelligent tour expansion is touched in this task.
