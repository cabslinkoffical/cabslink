# Roadmap
- [ ] Uploaded UI consistency audit: verify reported issues against current site; unify public page surfaces/closing CTA, restore old legal/booking URLs with canonical redirects, verify blog links/dates, fix corporate labels, shared steps, fleet labels and tour grammar, check genuine photos/reviews and desktop/mobile pages. Preserve brand, fleet images, real dates and existing policies; no publishing.
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
