# Roadmap
- [x] Cancellation cover window (14 Nov): cover choices only when the tour date is more than two UK days after booking; form hides the choice and resets to standard, server forces standard cover for near dates; rule tests pass (45 checks), build OK. Live-form check blocked by sandbox Google key; nothing published.
- [x] Page filters (14 Nov): Tours gains a length filter (only options with matching tours shown, 11 of 22 full-day verified), Blog gains in-page search + topic chips (4 articles found for "airport"), Fleet gains a seats-needed chip row beside existing class tabs; 8 tour-search checks pass, build OK, no page errors. Nothing published.
- [ ] Uploaded flyers review (14 Nov): 17 flyers checked against 22 published tours. Already live: Outlander Classic, Outlander Castles, Harry Potter, Highlands Escape, Glencoe, Safari, airport transfers, golf/whisky landing pages. Missing: hot air ballooning, archery & shooting, axe throwing, zip line Aberfoyle, Knockhill racing, Craigluscar adventure, horse riding, alpine coaster — build as tours where venue data allows.
- [x] Capacity recommendations (14 Nov): immediate vehicle-count recommendation beside passenger/luggage inputs and explicit counts on combination choices; real capacities unchanged. Two/three-vehicle passenger and luggage rules tested (20 checks pass); live Highlands form recommends Executive Minibus + Electric Saloon for 17 passengers/16 suitcases. Preview build OK; nothing published.
- [x] Short-screen summary (14 Nov): full available-height desktop panel, flexible map and compact details on shorter screens; verified at owner's 1206×639 size (80–575px, scrollHeight equals clientHeight), no 390px horizontal overflow, no runtime errors, preview build OK. Live map remains subject to authorized-origin verification; nothing published.
- [x] Suggested-place limit (14 Nov): four choices initially; remaining suggestions under More places in both day-booking lists; concrete rule test passes.
- [x] Premade tour improvements (14 Nov): suggested/custom stops, automatic allowed duration and authoritative price, transfer catalogue extras and cover; real Outlander flow verified 8→10h, £280→£380→£390 with Meet & Greet, unpaid reservation saved and read back with extras, then test booking removed; 81 relevant checks pass across final runs. No payment or publication.
- [~] Follow-up panel design (14 Nov): stored tour-stop map before pickup, price tier at top, compact no-scroll summary; Highlands panel fits 1974×987 and no page overflow at 390px, no page errors. Map rendering remains unverified because Google Maps is restricted in the sandbox; validate on an authorized origin.
- [x] Latest panel correction (14 Nov): price tier replaces awaiting-route text, no internal scrollbar, compact map/summary; final preview build OK. Nothing published.
- [x] Tour/hourly booking form simplified (13 Nov): ready-made tours skip the stops step and the hour picker; numbered Start → stops → Finish list with miles/time per leg; stops auto-kept in driving order with Undo; vehicles filtered by seats and suitcases; unpriced vehicles shown as price on request. Checked ready-made, custom (390px) and hourly flows to the price step; 1,258 tests pass. Not submitted/paid; map tiles can't load in the sandbox. Nothing published.
- [x] Owner 13 Nov factual correction: Loch Ness landing reuses published blog's destination-specific 170mi/3.5h estimates; Skye reuses published guide's 230mi/11h return guidance and existing multi-day-on-request offering. Return booking copy corrected, airport FAQ now explicitly paid Meet & Greet, MPV bag claim corrected. Shared cancellation summaries and legal pages match current cover/Manage Booking advice rather than stale 12h/half-fare promises; booking calculations unchanged. 63 focused tests pass; four public pages verified, no runtime errors. No publication; not a full-site/admin audit.
- [~] Blog form sizing and heading alignment updated: wider sidebar, paired date/time with narrow-phone stacking, shorter fields, viewport-safe sticky panel and centred heading/breadcrumbs/byline. Desktop and 320/375px visual checks show no page overflow; five booking regression tests pass and build OK. Browser control interaction remains unverified because the preview's client script is not activating; no publication.
- [x] Tour finder correction: removed oversized nested panel and duplicate inline itinerary editor; labelled search and theme selector use category-aware filtering and enabled category ordering; custom actions open /book/tour. Verified real catalogue: 22 total, history search 6, category 5, unmatched search 0, reset 22; full custom page opened, no phone overflow at 320/375/430 or page errors. 18 targeted tests pass, build OK. Pricing unchanged; no booking submitted or publication.
- [x] Booking edge-case pass: failed/loading/unavailable scenic quotes and unacknowledged conversions block all continuation paths and submission; inactive scenic data ignored. Return toggle opens enabled return fields and cancellation stays one-way; Start again clears extras/cover/payment/acknowledgement; edits reset incompatible child seats/stops/acknowledgement. Browser reproduced failed quote → blocked payment → remove stop → payment restored, immediate return fields/cancel, and 5 cabin bags correctly require 3 Saloons. Full suite excluding build-performing bundle scan: 1,201 passed/120 files; build OK. No booking submitted or publication; this is not a complete website bug audit.
- [x] Return-journey edits: quote requests/cache now include return context and schedule; vehicle fares show both legs without duplicating checkout totals; equal/earlier times rejected and both-leg availability checked. Real Edgware–Edinburgh journey verified adding/removing/re-adding and mobile editing (£814.85 one way / £1,629.70 return); 53 targeted tests pass, build OK. No booking submitted or publication.
- [x] Grouped header menu: Home, Services (Transfers / Groups & occasions / Business), Destinations (Travel hubs / Places), Fleet, Tours, Company (About / Help), Contact; desktop panels and phone folding sections checked at 1024/1280/1440/390, no page errors.
- [x] AI search readability: every public page gets real text, clear headings and structured data; report pages still thin. (venue FAQs extended from page data; thin list reported; owner facts still needed for 11 thin pages)
- [x] Logic audit High items: all 17 corrected (B01 B02 B03 B06 P01 P02 P03 P05 D01 A01 A03 A05 A07 A08 A12 W01 W02) with regression tests; database saves dry-run verified as admin and rolled back; live stop quote checked. Not run live: real booking/payment/refund/contact submissions and signed-in admin screens (no admin session). Admin lists now load complete data but still load everything at once (page-by-page browsing not added). Found, not fixed: round-trip tours (same start and end) fail to price on tour pages (pre-existing); choosing scenic stops drops typed via stops from the booking (pre-existing); stale review-display test (T01). Nothing published.
- [x] Urgent security/payment fixes: source audit confirms first-party booking/contact inserts use service-role server paths; no quote insert caller exists. Revoked anon/authenticated INSERT and four policies, verified all six denied grants. Coupon email/amount routine repaired and service-only; count failures block. Shared checkout/verification use paginated paid rows for partial balance and preserve cash/reference-null rows. Real £5 coupon booking paid £34.62 in Stripe sandbox; both booking pages displayed £10 amendment balance and sandbox top-up confirmed £44.62 total in two paid rows. Temporary customer test data removed. Found/fixed private mileage-tier read permission regression during actual quote verification. Final suite: 816 passed, 0 skipped/failed, 78 files; bundle scan passes. No publication.
- [~] Uploaded prompt 1 addition: exposed dispatch drain token replaced with a 64-character private-setting token, scheduler and preview receiver read private settings; verified token exists without exposing it. Published receiver still uses old code until owner authorises publication, so scheduled delivery may reject the new token meanwhile. Historic migration retained per owner instruction; old exposed token no longer used by updated scheduler/receiver. Remaining uploaded prompts 3–7 are queued, not implemented in this turn.
- [~] Tour safeguards implemented: capacity/count errors fail closed, service-role-only reserve_tour_booking locks class + capacity rows and inserts atomically while retaining defaults. Shared quote/server insert enforce class passenger/luggage/hour bounds and active/published/bookable templates; missing coordinates/unroutable stops reject. 13 quote safety tests + 11 real database reservation tests passed, including capacity rejection and retained transaction lock. Full simultaneous last-slot insertion test could not run with shared isolated fixtures due database schema permissions; transaction-local capacity/lock tests passed instead. Updated deployed handler requires owner-authorised publication; nothing published.
- [x] Uploaded UI consistency audit implementation: shared public alternate surfaces/navy editorial bands and one closing CTA applied; duplicate CtaBand mounts removed with supporting copy retained; six tested 301 aliases added (existing legal pages retained, not duplicated); corporate label/8 FAQs, shared homepage/About 3-step overview, About spacing, fleet labels, singular tour stop, review-text filtering and blog image spacing corrected. Edinburgh area uses credited castle photo and Edinburgh airport card uses actual aerial photo; fleet imagery untouched. Actual CMS article dates retained. Verified 63 desktop/mobile page checks including all 13 blog posts/footer destinations, no page errors/overflow/broken loaded images or duplicate closing CTAs; airport toggle and closing /book link pass; 783 tests/75 files pass, 0 skipped/failed; build OK. No publication or database edits.
- [~] Photo audit follow-up: other airport/destination records still contain generic stock photos; exact location-by-location replacement remains pending the existing real-photo batch work. Do not claim all airport photos verified as their named airports. Existing policy/accessibility content was preserved, not legally certified.
- [x] Pricing failure safeguards: settings/extras and all six rule reads now reject returned query errors and rejected requests with the requested friendly message; removed authoritative quote fallback that dropped availability rules. Eight regression cases reproduced unsafe quotes before the fix, then verified no quote computation, insert, reference generation or notifications on failure. Full suite: 777 passed, 0 skipped/failed, 74 files including bundle scan; build OK. Pricing calculations/numbers unchanged; no live outage injected or publication performed.
- [x] Requested cleanup verified: eslint-config-prettier installed; npm run lint executes with 16,408 errors/66 warnings (not mass-fixed). All named candidates confirmed without application callers and removed; exclusive validators and 10 obsolete tests removed. Fleet functions, booking-ref, drizzle and 117 backend migration files retained; uses listed in cleanup report. Full suite including bundle scan: 769 passed, 0 skipped/failed, 74 files; build OK; homepage/hourly/cruise render smoke checks pass. No publication or database changes.
- [ ] Separate dependency advisories: post-install read-only scan reported 26 advisory rows across production dependency chains; compatibility/security updates are outside the approved cleanup scope.
- [~] Deep read-only review findings list delivered: 778 tests/74 files passed; five initial public screens returned 200 with no page errors (tour options still loading in captured screen); confirmed retired hourly/indexing code, unused handlers, dashboard customer bug, error/cap/analytics issues and SEO writer-reader mismatch (48/112 entity IDs unmatched, classification pending). ESLint blocked by missing eslint-config-prettier. Detailed report saved; cleanup, behavioral end-to-end checks and fresh Security scan remain pending approval/access. No application code/data/photos changed or publication performed.
- [~] Remaining SEO upload: canonical application redirects combined; immutable-header-safe HSTS/static cache policy added; all 22 airports indexable and all 190 live sitemap URLs returned 200 with no duplicates; letter indexes blocked/noindex and removed from preview sitemap; all 22 tours and 13 articles have three related links, contextual guide links use verified locality/themes; compact server-selected link payload, privacy-safe byte/age-bounded HTML cache verified. 779 full-suite tests passed, final 63 relevant tests passed and public desktop/phone checks show no runtime errors. Remaining: hosting www redirects are 302 (one hop), deployed header/cache effectiveness and under-1.5s target; 186 live text-ratio warnings require broader presentation work, not fabricated text; inbound-link coverage/Semrush health targets need rescan after authorised publication. Nothing published.
- [~] Blog save/publish author blocker corrected: active team bylines accepted, no invented identity or mandatory bio/photo; real draft publication passed in a rolled-back transaction (draft unchanged), 40 tests pass including 8 database-trigger cases, build OK. Signed-in admin save flow remains unverified because requesting-user session mint failed (no matching app account); no article or website published.
- [~] Mobile optimisation: shared viewport-bounded scrollable dialogs, focus-managed passenger editor with larger touch controls, tour CTA stacking, tour navigation wrapping, saved-trip wrapping, Manage Booking spacing, admin sidebar containment and analytics tab scrolling applied; 15 public pages audited at 375px, controls checked at 320/375/430/768/1280, 745 tests pass and build OK. Signed-in admin and complete payment/cancellation journeys remain unverified: no requesting-user app account/session available; nothing published.
- [x] Homepage vehicle lettering: Cabslink is outlined with 32% opacity behind the vehicles; phone vehicle scale reduced so the entire car fits, screenshots verified at 320px and desktop, build OK.
- [x] Refine booking buttons: subtle navy/gold tonal finishes, circular icon accents and selected-state depth; desktop/mobile checked, stop/return/hourly interactions pass, no overflow or runtime errors; six booking tests pass and build OK.
- [x] Booking controls: shared bordered buttons with gold selected state; desktop/mobile interaction checks passed for Transfers, Hourly Hire, Add stop and Add return; one form retained, no overflow or runtime errors; 13 targeted tests pass, build OK.
- [~] Response-time improvements: 7 cache tests pass, including warm hits, five-minute refresh, unavailable cache and error exclusion; live homepage still measured 7.18s/6.06s. Hosted cache effectiveness remains blocked on confirming the deployed version and cache operation; no publication requested or performed.
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
- [x] Google Maps: connection linked and owner confirmed maps work on the live site (3 Nov)
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
- [x] Phase 7 Thin pages (waiting for go-ahead)
- [x] Phase 7 batch 24 Oct: all 22 airports now have 300+ word unique guides — 4 thin ones expanded (Heathrow 290→387, Birmingham 292→377, Belfast International 225→328, Belfast City 213→334) and 7 new guides added (Bristol 332, Cardiff 351, East Midlands 340, London City 344, Luton 314, Southampton 334, Stansted 324) using only page data + FACTS/site-facts (no £ prices, no invented distances); uniqueness ≤40% and no-hardcode tests pass, build OK; needs-owner-fact lists recorded per airport; nothing published.
- [x] Phase 7 batch 3 (24 Oct): PlaceGuideBlock wired into AreaLocationPage (renders after page content, before footer) and 15 new area guides written (7 cities + 8 towns, 310–396 words each; St Andrews left for next run): Edinburgh 396, Glasgow 335, Aberdeen 315, Dundee 312, Inverness 338, Perth 326, Stirling 324, Ayr 317, Dunfermline 310, Falkirk 321, Fort William 346, Kirkcaldy 329, Livingston 335, Oban 348, Pitlochry 333. Facts only from each page's own row (name, council, region) + well-known public geography + site-facts (payment/cancellation/fleet, in wording variants so no two pages share >40% text). needsOwnerFact on every area page: meeting arrangements + published routes with distances/times/fares. Uniqueness, no-price and facts tests pass (23), Oban verified rendering in preview, build OK; nothing published.
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

## SEO audit fix prompts (uploaded 22 Oct, 5 prompts)
- [x] Prompt 1 — policy text, schema, social tags: airport waiting corrected to 60 min free from actual landing on every airport pickup (journeys.ts now reads FACTS); meet & greet wording unified to FACT_TEXT.meetGreet; refund policy now labels transfer rules and adds a Tours section matching booking policy; ONE business node (#business, LocalBusiness+TaxiService) declared only in business-graph.ts and referenced by @id everywhere (index, about, SeoPageRenderer, auto-seo, schema.ts, ServicePillarPage, SolutionPage, travel-solutions, tours, blog, journeys, guides, service-location); one WebSite node; area FAQ now built by shared buildAreaFaqs used for both visible list and FAQPage JSON-LD; Speakable removed; fare Offer nested inside Service node without priceValidUntil/availability; 1200x630 public/og-image.jpg created from homepage hero and set as default og:image (+width/height/locale) and schema image; ServicePillarPage "4.7/5" replaced by live Google rating with profile link (hidden when no feed data). 745 tests pass, build OK; geo coordinates of registered office still TODO(owner); nothing published.
- [ ] Prompt 2 — sitemaps, indexing, broken admin sections route, maintenance mode, host redirects, robots.txt
- [ ] Prompt 3 — page speed (fonts, lazy maps, imagetools, edge cache, root beforeLoad, bfcache, motion)
- [ ] Prompt 4 — templates, breadcrumbs, footer directory SSR, tour links, button→Link, vehicle claims, homepage title (note: conflicts with "no chauffeur" brand rule — resolve with owner), raw errors
- [ ] Prompt 5 — blog TOC/rehype-slug, pagination, article schema, guide dates; analytics dedupe, /booking token privacy, hourly quote events, server-side purchase

## Dead code audit (24 Oct, report only — awaiting owner approval)
- [done 25 Oct] Cleanup applied: deleted 8 unused files (PricingEditors, FeatureStepsDemo, TrustpilotSection/Strip, hourly.functions, internal-links.functions, seo-quality.functions, ui/feature-section), removed 28 unused npm packages, deleted leftover drizzle/ folder + drizzle.config.ts. Updated 2 tests that referenced deleted files. All 745 tests pass, build OK, key pages verified live. Env var names left alone (auto-managed).

## Payments (25 Oct)
- [x] Lovable built-in Stripe payments enabled (test environment created). Seller country UK confirmed; recommendation = Stripe (real-world transport service, not Paddle-eligible).
- [x] Webhook handler moved to the required path src/routes/api/public/payments/webhook.ts (?env=sandbox|live, signature-verified, sandbox rejected on production hosts); old src/routes/api/public/stripe-webhook.ts deleted.
- [x] End-to-end test card payment verified in preview: booking CL-261015-WEV7K99M, £160.41, visa 4242, processor succeeded; booking confirmed + payment row recorded (booking/request/payment test data restored afterwards).
- [x] Tax: no tax automation added — fares are quoted inclusive and VAT registration is unconfirmed (owner-blocked); adding automatic tax would change advertised totals and break the amount-match verification.
- [ ] Go-live (owner action): claim Stripe account and complete onboarding in the Payments tab to accept real money; live keys provision automatically after.
- [x] Related links: shared "Related pages" block (nearby airports, areas, tours) on airport, area, destination, CMS and tour pages; SSR-rendered, test added; not published

- [ ] Replace destination/area page photos with real place photos (Wikimedia, credited), batches; fleet photos untouched. Service photos done.
- [x] Quote-on-request vehicle classes now sort last in the booking vehicle list (after every priced class), so priced classes lead; verified in the live booking flow.
- [x] Fleet class cards: vehicle photo sits on the same pale cream backdrop as the rest of the card, with the class name moved into the card body; the navy block behind the vehicles is gone. Fleet photographs themselves unchanged.
- [x] Booking left rail: fixed the reason it never stayed in place (an overflow-hidden wrapper), capped its height so all of it is reachable, and led it with a live navy "Fares for this journey" panel — lowest to highest fare, classes priced / priced on request, plus a gold progress bar tracking how many classes you've scrolled past. Fare figures come only from the quotes already on screen.
- [x] Booking left trip panel fits visible screen height on laptop/desktop, no inner scroll
- [x] Booking left rail: "Fares for this journey" panel and the gold "seen X of Y classes" progress bar removed at owner request. Rail now holds trip details only — pickup/stops/dropoff, route map, distance and duration, date and time, price once a vehicle is chosen. Why Cabslink and Google reviews sit in their own section below the booking area.
- [x] Maps added to every location page type through one shared section (areas, destinations, service+location pages, and CMS entity pages: stations, attractions, hospitals, universities, distilleries, cruise ports, corporate, guides); airports keep their own map band near the page end. No map inside any navy hero.
- [x] Google Maps live rendering confirmed by owner on cabslink.com (3 Nov)
- [ ] Owner facts, photos and blog copy still outstanding; nothing published.
- [x] A01 finish: record lists (bookings, tour enquiries, cancelled history, refunds, change requests, messages, driver applications, payments, customers, activity logs, dispatch events, media, blog posts) load one page at a time from the server with database-side filters/search/counts; short settings lists show 25 per page. Console split into Dashboard & reports / Bookings & messages / Settings with an All settings page. Verified signed in as admin: 20 console pages, paging through 2,366 log entries and 346 images, no errors. Not paged: extras (grouped by category) and tour routes side list. Nothing published.

## Staff console logic pass (2 Nov)
- [x] Dashboard opens first; two cards lead to Bookings & messages and Settings; area switcher removed from the left menu.
- [x] Console logic fixes: UK dates everywhere, dashboard counts = booking tabs, month chart, payments (paid date kept, refunds, GBP only, card rows protected, searchable booking picker, paid state re-derived), customer "total paid", message counts follow search, status locks (no silent overrides; tour moves limited), stale booking panel, empty-page after delete, honest tour-quote email result, safe CSV, report ranges/filenames, conversion cohort, rejected counted as cancelled, notifications errors/routing/per-item read, load-error states, blocked-dates editor crash, address search paging, tour settings typing, dead general settings removed.

## Full-site redesign + SEO/AEO/GEO (requested 2 Nov)
- [x] Audit every public page (not the homepage) for design/logic/SEO inconsistencies against the homepage design system
- [x] Group 1 shared section heading; Group 2 shared top section (centred / booking-led / reading-width)
- [x] CHECKPOINT 1 — owner said continue (2026-11-02)
- [x] Owner 2026-11-02: one contextual closing action per page (local pages jump to prefilled form, tours to tour booking, policies to contact, driver/business pages to their forms); marketing band hidden on booking/payment/manage pages; repeated FAQ booking buttons and About's double FAQ heading removed; FAQ headings unified; off-brand white/black/blue classes swapped to brand tokens (consent banner untouched). 72 pages re-checked, 901 tests pass.
- [ ] Group 3 spacing/widths, Group 4 cards/buttons, Group 5 cone structure (checkpoint), Groups 6–9 still to do
- [ ] Note for report: area page intro reads "from Edinburgh to Edinburgh" (data-driven copy) — fix in cone/SEO pass
- [ ] Redesign non-home pages to the homepage visual language, page by page, without changing URLs/titles/H1s/protected SEO settings or inventing facts
- [ ] Technical SEO/AEO/GEO pass (metadata, schema, headings, links, images, performance) and verification
- [x] Staff console: Bookings & messages and Settings shortcuts also in the left panel (2 Nov)
- [x] Owner 2 Nov: local-page top section (LocalPageHero, e.g. /cruise-ports/greenock) — intro paragraph on the left with details below it, booking form on the right, other content below; apply on every page using it
- [x] Unified lower-page design (areas, airports, routes, stations, attractions, hospitals, guides, sports, service+location, stored pages): shared bands, fare/fleet/fact tables, link cards, white/cream rhythm; Areas link in main menu and footer
- [x] Every non-fleet page gets its own real, relevant, optimised, CDN-hosted photo (no shared/generic images); fleet page and vehicle photos untouched
- [ ] Owner prompt (13 groups, one at a time, stop after each): 1 payment methods/status wording DONE (pay-another-way choice, received vs confirmed page/email, policy, FAQ; test booking verified then removed); 2 Meet & Greet optional paid default-unticked DONE (3 Nov: unticked by default, no "included" label, 24 airport intros say optional small extra charge); 3 tolls/airport fees included DONE (3 Nov: shared wording on booking total, tours/hourly totals, every location page header, terms, refund policy, booking policy, FAQ); 4 child seat types per seat DONE (3 Nov); 5 tours mandatory column + From price + inclusions DONE (3 Nov: fixed-stop column added and backfilled, From price = engine price, price-covers lines on cards/pages; 4 tours quoted, 3 test bookings saved then deleted); 6 cancellation cover saved DONE (3 Nov: saved choice + amount on booking, shown on confirmation page, emails, Manage Booking, admin booking and cancellation views; refund advice follows cover; changes keep cover); 7 Europe/London times DONE (3 Nov: Manage Booking cut-offs, timed price rules, coupon dates, tour notice/same-day checks and booking-form dates read UK time; tests at 23:30/00:30 in July and January); 8 security DONE (3 Nov: cabslink.com/www/cabslink.lovable.app always live Stripe whatever APP_ENV; Dispatch token read only from private settings, current DB token differs from the exposed one, old value remains only in applied migration history pending owner OK; 0004 effects verified live); 9 privacy DONE (3 Nov: Stripe listed under card payments; "Company registration number: [to be added]" gap — OPEN: owner to supply number); 10 speed caching/Promise.all/lazy; 11 admin pricing preview old rows; 12 untrue wording; 13 final checklist
- [ ] Blog extras: table of contents, paginated article lists, richer Article details for Google
- [ ] Security: full review (quick + deep scan) and update 26 dependency advisories
- [ ] AI/search visibility for every page: text-to-code ratio, missing article/tour structured data; fresh SEO scan after publish
- [ ] Signed-in admin + full booking/payment/cancellation journey checks (needs an admin account/session)
- [x] Use owner's FAQ question bank (Cabslink_FAQ_Question_Bank.xlsx) on relevant pages; answer only from verified facts, list unanswerable questions.

- [ ] FAQ bank: 47 questions wait for owner answers (see Cabslink_FAQ_Question_Bank_status.xlsx); 157 need live fares, new pages or sourced travel facts.

## Search Console SEO fixes (2 Nov)
- [x] Blog category pages working (H1, intro, posts, canonical, 404 if empty, index at 3+ posts); fix "$slug" link; tags noindex
- [x] /index 301 to https://cabslink.com/; canonicals/internal links on apex
- [x] Noindex review: regions and routes with real content indexable + in sitemap; Wales/England stay noindex (Fife, Speyside and other small regions stay noindex until they have more place pages)
- [x] Harry Potter tour: title, description, filming locations, Jacobite, multi-day, FAQ + schema, links from /tours and day-trips guide
- [x] Day trips guide: tour links, "Book this as a private tour" links, 4 FAQs + schema

## Owner requests (2 Nov, evening)
- [x] Hourly hire vs day tours: separate booking pages, same hourly rates; hourly hire has optional stops and no ready-made tours
- [x] Admin: tour price set manually or automatically (hourly rate × hours + route miles) when adding/editing a tour
- [x] Flight tracking confirmed: one shared wording everywhere; no extra promises
- [x] Flight number required for airport pickups (clear message), optional otherwise
- [x] Harry Potter title → "Harry Potter Tour from Edinburgh to Glenfinnan | Cabslink"

## Owner requests (3 Nov)
- [x] Tour pricing: round-trip tours (same start and end) priced as a loop through their stops (Fife tour measured 109.5 mi)
- [x] Typed via stops kept when scenic stops are chosen (typed first, then sightseeing; used for price and booking)
- [x] Part 4: child seat types priced per seat on the booking form, max one per passenger (form + server), types saved on the booking and shown on confirmation page, emails and admin. Open: Manage Booking change requests still edit only the seat total; tours/hourly hire have no child seat option
- [x] Owner list part 10 (speed): public marketing pages send `public, max-age=0, s-maxage=300, stale-while-revalidate=86400`; booking/manage/payment/admin/account/search, cookies, sessions, query strings, errors stay no-store (tests). Airport/CMS page reads run in parallel (sections+place, related links+fares, related-link lookups in two parallel rounds). Page-tag helpers and destination loader moved out of page layouts so route head code no longer drags layouts into the main script; booking-form maps load on demand; page maps fetch Google Maps only when scrolled near. 202 page heads byte-identical before/after; 1,042 checks. Production bundle size not re-measured (needs next build). No publication.
- [x] Owner list part 11 (admin tidy-up): admin test-quote list shows only the 12 real vehicle classes (old unlinked Saloon + Coach Bus rows hidden, not deleted; tests). Additional Pickup extra was found switched ON and was switched off to match the owner's instruction. Signed-in admin page view not checked (no matching admin login for the test browser). No publication.
- [x] Owner list part 12 (untrue wording): fixed the listed sentences on home/About/booking policy/corporate/services/cruise/group/Edinburgh; home Google reviews show each review once (static grid). Browser-checked 8 pages; tests added. Follow-up done: shared waiting sentence and FAQ 39 now say hourly per-vehicle rate shown at booking (per-minute figures removed from facts); route-page 'meet & greet is standard' replaced with the optional-extra sentence; 202-page scan clean. No publication.
- [x] Part 13 final check: ran card (sandbox), cash, tour quote/booking, Meet & Greet, child seats, change up/down and live speed baseline; fixed amendment top-up/refund mismatch, tour default vehicle order, request-only label; checklist PDF delivered; test bookings removed. Open owner decisions listed in checklist. Nothing published.

## Owner requests (3 Nov, late)
- [x] Secure all API keys: no secret keys in code/browser/logs; server keys read only inside server handlers; old Dispatch token unused (rotated). Open (owner): confirm Maps browser key is limited to cabslink.com in Google Cloud; approve removing old token text from historical migration file
- [x] Meet & Greet costs extra: 22 airport notes + Airport Transfers service text updated; home/airport/airport-transfers labels say optional. Open (owner): Google descriptions on airport pages still list 'meet & greet' without 'optional' (protected, not changed)
- [x] Payment methods explained the same way everywhere: card online (Stripe) or cash/bank transfer/other arranged with the team (area/station guides, home, About, closing section, AI summary, saved service details)
- [x] Fleet capacities match booking: all 12 classes accept their advertised maximum and refuse one extra passenger, large bag or cabin bag (shared src/lib/vehicle-capacity.ts; tests). Tours check passengers and large bags only (no cabin-bag input)
- [x] Fleet: model lists on fleet/booking/home say examples only, class guaranteed (FACT_TEXT.modelsTypical); six long class descriptions reworded
- [x] Service pages: one 'Get a fixed price' → /book label in heroes, bodies and closing sections (sports/VIP body no longer send to contact); tours hero 'Plan a tour' → /book/tour
- [x] Contact/business details: structured data and corporate page read SITE/FACTS; all 202 pages show the same phone/email. Open (owner): 'CabsLink' spelling in saved airport page titles (protected)
- [x] SEO audit (owner list 3 Nov): owner approved fixes 3 Nov; /attractions title, /faq and Harry Potter descriptions shortened; breadcrumb markup on /faq and region pages; all tour/blog photos have sizes. Fresh 202-page crawl: no title >60, no description >160, every page except home has breadcrumbs, 0 unsized photos. Open (owner): 'CabsLink' spelling in 9 airport titles; Minibus/Coach Hire pages
- [x] About page already clean (preview + live). Fixed elsewhere: 'meet and greet on request' (executive transfers, airport-transfer location pages), group-travel FAQ '55 in a coach' -> 16. Open (owner): Minibus Hire (8–24 seats) and Coach Hire (25–55 seats) page titles/H1s/body claim vehicles not in the fleet

## Owner requests (3 Nov, night)
- [ ] Minibus Hire page rewritten to match admin vehicle classes (Eight-Seater Van 8, Executive Minibus 16 on request). Coach Hire pending owner answer
- [ ] 'CabsLink' → 'Cabslink' everywhere in saved text (airport titles/descriptions, vehicle SEO, blog, notes)
- [ ] Latest Google reviews appear on the site automatically
- [x] Remove soft glow blobs from page top (hero) sections (owner screenshot image-276)
- [x] Automatic latest Google reviews: saved snapshot, hourly scheduled refresh (starts after publish), page-view refresh when stale, last saved copy on Google outage

## Tours overhaul (owner docs: Scenic Tours strategy + Custom Tour Builder) — owner wants both sides fully correct
- [x] T1 Custom builder correctness: editable passengers/luggage, correct hand-off, working "best route" option (real road-time optimisation, locked start/end, restore my order)
- [x] T2 Custom builder UX: drag to reorder stops, lock stops, quickest-order suggestion with restore; map/distance/notes live in the tour booking steps (map tiles blocked in preview only)
- [x] T3 Custom tour requests: CL-CT reference, request-a-quote when not reliably priceable, secure status lookup, admin queue (new/reviewing/quoted/accepted/rejected/completed) with route + notes
- [x] Owner asked: explain hourly hire & day tours end to end (every phase/step) with the full code
- [x] T4 Multiple vehicles for big groups (tours): suggested combinations, priced per vehicle, capacity locking per class
- [x] T5 Admin tour tools: duplicate tour, tour categories, draft preview, guided create steps

- [x] Tour routes admin: remove left tour list; full-page tour list, clicking a tour opens a full-page editor with Back
- [x] Admin: replace scrolling status/filter tab bars with card grids (bookings + all other admin areas)

- [x] Fresher white site background (alt bg #faf9f6); blog sidebar now has full booking form

- [x] Blog booking panel sticks to one side while the article scrolls (fits at 639px+, scrolls inside itself on shorter screens)

## SEO & AI-search brief (13 Nov 2026)
- [x] 1 Redirect cabslink.lovable.app → cabslink.com (canonical tags already self-reference cabslink.com)
- [x] 7 robots/sitemap/llms.txt (already in place)
- [x] 8a "fixed fare" → "fixed price" wording
- [x] 2 titles/descriptions · 3 structured data · 4 city-centre guide · 5b /stations · 6 seven landing pages
- [x] 5a reviewed · 8b What's included added; [x] CTA wording · [x] 9 Seven-Seater MPV name kept (owner, 13 Nov) · [x] 10 links/alt (alt text already set; route↔guide link added) · [x] 11 390px check (no sideways scroll, 95 links no 404s, small review links enlarged); [ ] 12 site-wide review
- [x] Owner (13 Nov): live SEO checklist + Google preview in page and blog editors; [ ] further admin areas on request — rebuild admin so content can be uploaded SEO-optimised (title/description/H1 length checks, schema, links) with consistent cross-page logic
- [x] Tour content editor: live shared search preview/checklist, 600-word tour target and consistent 155-character description guidance; signed-in live checks and unchanged save/reload verified. Owner reports prior version published; these changes are not published.
- [x] SEO/admin correction pass: unified single/bulk publication rules, checks fail closed on read errors, protected blog metadata preview accurate, intro-only word target removed and stale results hidden. Repaired missing sections Outlet; FAQ editor saves real question/answer items, shared rendering/schema include every complete FAQ section. Signed-in page/blog/tour unchanged saves and reloads verified; temporary FAQ saved on draft, reloaded and deleted; phone editors have no page overflow. 1,239 tests/124 files pass (bundle-building test excluded), build OK. This is a focused SEO/admin correction pass, not a complete replacement or audit of every admin screen. No publication.
- [x] Owner (13 Nov): black-taxi comparison row removed from the city-centre guide; the Cabslink row now names the fleet (Saloon, Estate, MPV, 8-seater). Guide tests pass. Remaining owner facts: exact Edinburgh Airport meeting point and same-day Skye offering.
- [x] Cancellation copy reconciled to current booking cover: standard 24h, flexible 1h, non-refundable after confirmation; Manage Booking also retains the existing 24h booking grace period. No booking-rule change; any future move to 12h needs explicit instruction.
- [x] 13 Nov: 8 Edinburgh Airport route pages (Glasgow, Stirling, Perth, Dundee, Aberdeen, Inverness, Fort William, Glencoe) + family, hotel, late-night service pages; [ ] pet-friendly page awaits owner confirmation of pet policy

- [x] Route pages: add airport pickup info + Google reviews sections
- [x] Edinburgh Airport taxi prices page (check for existing first)
- [x] Semrush audit (13 Nov): internal nofollow removed (TransportComparison), /book + /book/tour noindex,follow + fixed canonical, not in sitemap; 12 weak pages now ≥2 inbound links (src/lib/seo/specialist-links.ts); tour detail reads parallel, display fare inputs memoised 60s, airport fares start with page lookup. HSTS/asset immutable already in place. 1,253 tests pass. Not published.
