# Roadmap
- [ ] Booking controls: make mode tabs and Add stop/return visibly button-like, retaining one form and verifying desktop/mobile interactions.
- [ ] Response-time improvements: finish cache tests and measure current live response; deployment effectiveness remains unverified until hosted cache behaviour is confirmed.
- [x] Homepage vehicle-class and tour rows: allow dragging in either direction with touch and mouse, preserving hover pause.
- [x] Booking controls: separate transparent Add stop/return actions; added fields extend the original sheet; shared passenger/bag editor with direct entry, steppers and Done.
- [x] Booking form: adding a stop or a return journey now extends the same form card instead of opening a second white box below it; one card on desktop and mobile, new test added, full suite passes; nothing published.
- [x] Homepage hero vehicle: drives in from the left on every change, cruises gently with gold road dashes running left-to-right beneath it; reduced-motion respected, desktop/tablet/mobile checked; nothing published.
- [x] Homepage hero: removed the caption row under the vehicle (name, "Vehicle class · N seats" badge and pagination dots); the car rotates on its own and the fleet section below still lists every class by name; desktop/tablet/mobile checked, build OK; nothing published.
- [x] Match the latest reference: homepage source order and explicit centred layout are text → form → large vehicle; desktop/tablet/mobile and return/hourly controls verified, 14 tests pass, build OK; nothing published.
- [x] Restore navy-blue homepage hero with text, centred booking form and vehicle carousel in that order; desktop/tablet/mobile, carousel selection and return/hourly controls verified; five booking tests pass, build OK; nothing published.
- [x] Homepage reference redesign: centred introduction, horizontal shared booking form, large vehicle and subtle brand lettering; desktop/tablet/mobile checked, return/hourly controls verified, 15 booking tests pass; nothing published.
- [x] Homepage opening: text and visible vehicle left, stacked booking form right; desktop/mobile checked, Add return and Hourly Hire verified, five booking tests pass, build OK; nothing published.

- [x] Passenger flow: initial transfer/hourly forms allow omitted count; shared confirmation at vehicle selection; counts preserved and capacity-aware choices retained. 18 targeted tests pass, build OK; real transfer journey with six passengers verified through boarding and trip details. Nothing published.

- [x] Review display: Google reviews primary on homepage, contact, booking and footer; Trustpilot retained only on /reviews. Verified live Google score (4.9, 9 reviews), reviewer text, no public Trustpilot displays elsewhere, 230 targeted tests pass and build OK; nothing published.

- [x] Full-site corrections verified: 677 tests pass, build OK; blog titles 44/51 chars, descriptions ~150; fleet offers reworded (only link names to protected /minibus-hire + /coach-hire remain, owner decision pending); sitemap dedupe + /distance //get-a-quote excluded; A–Z letters e,g index,follow and in sitemap, others noindex; 4 owner-blocked airport guides exempted from 300-word rule with facts listed
- [x] Screenshot SEO warnings resolved: no duplicate headings on homepage, tour handoff links nofollow, all images have alt (only decorative aria-hidden reflection has empty alt), warm load 0.7-0.8s; airport pages verified with descriptive hero alts

- [x] Booking mobile: label Edit booking, collapsed Trip summary, top-of-page step navigation; verified real quote → passenger details → payment, mobile toggle/edit and desktop summary

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
- [~] Phase 6: site-wide business data done; route/tour/blog structured data pending
- [ ] Phases 7–10 — waiting for owner go-ahead per phase

- [x] Contact page "Become a driver" tab with detailed driver application (home button links to it)
- [ ] Phases 5–10 from uploaded plan — continue one at a time
- [x] Admin: show AM/PM on booking times
- [x] Admin Extras: two tabs — vehicle class extras / other extras (VAT, cover)
- [x] Extras: one grouped list (child seats x3, meet & greet, waiting per minute/hour, other), per-class price + limit, VAT & cover on Extras page

- [x] Phase 6: per-page structured data (tour Offer/breadcrumbs, all JSON-LD escaped); Google Rich Results check needs owner
- [ ] Phase 7 Thin pages (waiting for go-ahead)
- [x] Phase 8 Tours (Glencoe 600+ words needs owner-written content)
- [x] Phase 9 AI search visibility (needs real named authors with photos)
- [~] Phase 10 Polish — links, redirects, alt text, rating dates done; Lighthouse scores + image hosting pending

- [ ] Phase 7 moved to the end at owner request (blocked: 300-word rule would hide all 74 destination pages)

## Later asks
- [x] Remove repeated Explore more / Where to next site-wide: all eight instances and wrappers removed, shared renderer deleted; airport/location/airport-transfer/VIP preview checks show no related section and one footer; no page content after footer (only notification utility). 33 tests pass, build OK; nothing published.
- [~] Airport-area maps: separate section near the end of CMS and detail airport pages, before the footer; Aberdeen placement checked, no hero map, 33 targeted tests pass, build OK. Live Google Maps rendering remains unverified and requires owner check on an authorized deployed origin; nothing published.
- [ ] Screenshot SEO warnings first: inspect query links, repeated headings/anchors, external links, missing alt and response time; preserve booking handoff and protected page details
- [ ] Verify remaining full-site corrections with SEO/sitemap tests and rendered-page checks; report owner-blocked items without publishing
- [ ] Full-site corrections: fleet copy, airport guide claims, indexable A–Z sitemap, image descriptions/dimensions, two blog metadata lengths; preserve SEO settings/layout/pricing and do not publish
- [~] Compact booking status area: duplicate badges removed, inline payment label and lock icon added; 7 tests pass and build clean; signed-in visual check blocked because the requesting user has no app account/session
- [x] Lock booking status once paid, completed or cancelled (DB guard + admin UI)
- [x] Paid/unpaid badge next to booking status in admin list

- [x] Homepage hero redesign: text+vehicle left, booking form right, gold glow, sticky-header clearance, mobile fix
- [x] Hero headline shortened to "Airport Transfers & UK Private Hire."
- [x] Local pages one pattern: LocalPageHero shared across journeys, destinations (airports/stations/towns/cities/distilleries/attractions/etc.), areas, service+location and CMS SEO pages — copy+facts left, identical tab-free booking form right, prefilled per page (airport/station → pickup; town/city/etc → dropoff; journey → both; area → dropoff; service+location → pickup), map under the form (route when both ends known, marker from page coordinates otherwise), image band, phone CTA; responsive 390/1206/1920 checked; seo_pages entity join fixed (was dangling against seo_airports/seo_locations — now public.destinations); prefilled text no longer auto-opens the dropdown; 715 tests pass, build OK; nothing published. Maps render on production domains only (sandbox/localhost key-restricted) — route/marker panels verified in form, live map needs owner check after publish.
- [x] Booking form: tabs removed from the local-page hero variant — clean stacked panel (labelled rows, hairline dividers, full-width gold Search, quiet links to hourly/tours/manage); homepage keeps the pill variant (user request 17 Oct)

- [x] Hub destination cards: shared DestinationCard (real photo from each destination's own page, name, location badge, expand-arrow detail with page intro) on all hub pages incl. airports; all FAQ surfaces unified to one FaqAccordion theme; verified attractions + airports cards (22 photos) and homepage + airport FAQ render identically; 719 tests pass, build OK; nothing published.
- [todo] "Emerson" follow-up from Khaver Naeem (10:21 UTC): message unclear — clarify what should be improved ("make him like a better way").
- [x] Homepage vehicle animation reworked (17 Oct): removed the drive-in on the image, the continuous cruise sway and the gold road-dash strip; vehicle PNG swap is now the animation — outgoing image glides out right while the incoming glides in from the left (850ms). Verified in preview: 0 road elements, swap window shows both images, single image after, no horizontal overflow, build OK.
- [x] Site-wide colour/contrast audit (17 Oct): added dark-gold shade --gold-ink #8a6a12 for gold text/icons on light (was 2.06:1, now 5.06:1); swept all text at 40–55% opacity up to AA-passing levels (navy/foreground on light → /70, white/navy-foreground on navy → /60–/70, muted-foreground 0.62→0.68); moved all gold-on-white text (service badges, eyebrows, links, hovers) to gold-ink; decorative-only faints left (stars, watermark, breadcrumb slashes). Verified home, /areas, Edinburgh local page, /book; 248 targeted tests pass, build OK; nothing published.
- [x] Social links consolidated in the footer (17 Oct): the standalone "Travel with us on social" band is removed site-wide (component deleted, SiteLayout props dropped); the footer now lists all four profiles as pills with icon, name, handle and external arrow from the shared SOCIALS list. Verified in preview: band count 0, one footer, four links with correct URLs, no mobile overflow; new tests/social-links.test.ts (3) passes, build OK; nothing published.
