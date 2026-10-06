# Roadmap

- [x] Standardize destination hubs: exact H1s, Destinations menu, `/areas` tabs/order, benefit-card order, `/` breadcrumbs, navy heroes
- [x] Redesign `/areas`, region directories, and individual location pages with the selected navy editorial travel direction

- [x] Admin: Changes & Refunds list for amendment requests (top-ups / refunds)
- [x] Fix admin status change not applying (invalid-transition block)
- [x] Remove Cancelled tab from Bookings; all cancelled data under Cancellations & Refunds
- [x] Bookings: essential-only status list + clearer tabs (New / Awaiting payment / Confirmed / Driver assigned / On the road)
- [x] Manage booking: cancelled/rejected/completed lookup shows a clear notice + "Book a new journey"
- [x] Fix database permission blocking admin booking status changes
- [x] Simplify Cancellations & Refunds so requests are easy to review and action
- [ ] Deep end-to-end test of every public + admin flow (in progress)
- [x] Media Library: one shared image library with picker on every admin image field
- [x] Media Library: auto-catalogue all website images, show usage, and optimize new images once
- [x] Dispatch link: signed automatic booking feed + restricted dispatch logins that can assign drivers
- [~] Connect Cabslink Luxury Travel to CabsLink Dispatch Board with working dispatch login and secure live data access — Cabslink activation flow ready; Dispatch Board role guard and live email confirmation pending in the separate project
- [x] Redesign Scenic Routes admin page for clearer daily management
- [x] Scenic Routes: list-first selection, edit/save one route, and Add New action at top
- [x] Remove divider bars below Our Services on the homepage
- [ ] Production booking autocomplete: replace obsolete server-function validators, publish, and validate repeated cabslink.com requests
- [x] Drivers admin: two panels (dispatch drivers + website applications), linked by email/phone
- [x] Booking location fields: make the focused typing/selection indicator visible and square-edged
- [ ] Booking widget: full UI + behaviour review (no overlapping fields, popover closes, validation on both tabs)
- [x] Corporate booking page: add more detail and sections
- [ ] Security: full review and hardening pass across the site
- [x] Fix live admin sign-in loop by removing the fresh-session server-function race from the admin route guard
- [x] Google Maps: load maps with the account's own browser key (custom-domain support)
- [ ] Google Maps: create one fresh user-owned connection — both old links removed; workspace connection deletion awaits user action in Connectors
- [x] Tour builder: suggest stops from the map inside the hour's mileage radius, and show chosen stops on a map
- [x] Tour booking page (/book/tour): simplify the flow — lighter, clearer, easier to follow
- [x] Tour booking: fewer steps (4), custom-tour option shown alongside ready-made tours
- [x] SEO: optimise /book/hourly and hourly tour pages for "edinburgh hourly hire", "glasgow hourly car"

- [ ] Redesign /book/tour for clarity and ease of use (user request 14 Sep)
- [x] Performance 1/3: responsive WebP delivery for homepage service cards, fleet cards, and logo
- [x] Bulk pricing import: resolve typed From/To locations to Google Place IDs and coordinates
- [x] Bulk pricing import: match coordinate-resolved routes per vehicle class and update existing two-way routes without false conflicts
- [x] Add RatingFacts (ratingfacts.com) as a live review channel on /reviews
- [x] Remove the ADMIN label from the public site header (admin panel stays reachable by URL)
- [x] Own first-party analytics + admin tabs (Own analytics / Bookings & revenue / Google Analytics)

## SEO strategy (uploaded plan, 26 Sep) — phased
- [x] Phase 1: technical fixes (brand "Cabslink", footer H3, /contact links, lowercase + trailing-slash 301s, /book/tour in sitemap, clean /book links, noindex thin region/blog-category pages)
- [ ] Phase 1 leftover: homepage title/H1 and conflicting facts (needs owner confirmation of vehicles/prices)
- [~] Phase 2: 57 location pages moved to branded design (hero, drive times, pickup, no boilerplate) — "from £X" live fares from pricing rules added; pending owner: real photos, Edinburgh Airport meeting point/waiting/luggage facts
- [ ] Phase 3: restore 10 thin blog posts (needs original text)
- [~] Phase 4: homepage images optimised; route/destination structured data and tour control accessibility corrected; broader accessibility review remains
- [ ] Phase 5-6: keyword + content plan pages
- [ ] Off-site (owner): backlinks, Google Business Profile, reviews, resubmit sitemap in Search Console
- [x] Fix: lowercase redirect no longer catches the site's background requests (was breaking quotes/data)

## Cabslink fix plan (uploaded 4 Oct)
- [x] Phase 2B: payment/lookup holes (APP_ENV, URL-only host, partial refund status, lowercase emails, shared limiter everywhere, repeat-safe migrations)
- [x] Phase 3: admin and auth hardening (public image storage blocked by workspace setting)
- [x] Phase 4: one source of truth for business facts (owner TODOs listed)
- [x] Phase 5: head tags, redirects, sitemap, robots, self-hosted fonts
- [ ] Phases 6–10 — waiting for owner go-ahead per phase

- [x] Contact page "Become a driver" tab with detailed driver application (home button links to it)
- [ ] Phases 5–10 from uploaded plan — continue one at a time
