<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Protected-route navigation reads the persisted browser session to avoid transient remote-check redirect loops; server functions still validate bearer tokens and roles for private operations.
- Booking wizards share a step-change scroll hook; summary disclosure uses responsive visibility so mobile starts collapsed while desktop stays visible.
- Install the query adapter's SSR readiness compatibility through a separate helper after query integration; this preserves streaming and avoids coupling route type inference to the adapter wrapper.
- Destination hubs use the shared navy `PageHero`/`HubPage` language, while area directories and location pages use one navy-led editorial system so navigation remains consistent.
- A–Z letter indexes stay noindex and excluded from sitemap output; robots restrictions cover every explicit crawler group, keeping directory crawl decisions consistent.
- Region hubs and blog categories decide indexability through one shared rule each (src/lib/seo/region-content.ts, src/lib/blog-category-seo.ts) used by both the page head and the sitemap, so robots tags and sitemap entries never disagree.
- Primary review surfaces share Google review query options; the feed is one saved snapshot (google_reviews_snapshot, src/lib/google-reviews.server.ts) refreshed hourly by a token-protected scheduler route and by page reads when over an hour old, so every server instance shows the same newest reviews and Google outages fall back to the last saved copy, never invented scores or other-platform reviews.
- Passenger count is optional in initial booking handoffs; transfer quotes require explicit passenger confirmation, and tour vehicle selection gates continuation on confirmation and capacity without changing server pricing validation.
- Blog media and FAQ compatibility use shared browser-safe schemas in the editor and save validation, so legacy asset paths and question/answer records remain editable without losing text.
- Blog publication accepts active non-empty individual or team bylines; biography/photo are optional, and the database guard is covered with transaction-local regression tests so existing authors are never replaced with invented identities.
- The homepage uses one shared BookingWidget instance in text–booking–vehicle source order and explicit home-scoped grid areas; this keeps visual and keyboard order consistent without duplicating booking state or altering local-page forms.
- seo_pages entity links resolve against public.destinations (name, display_name, type, slug, lat, lng — no hero image column); loadEntity in src/lib/seo-public.functions.ts is the only place that join happens.
- Public page content stays inside SiteLayout before its footer; automated explore-link sections are removed rather than appended outside the layout to prevent duplicate closing content.
- Related-pages links render inside page content through RelatedLinks and contextual PlaceGuideBlock links; server-side selection returns compact published-only results ranked by verified topics/themes, with self-links excluded and no duplicate tour sections.
- Response policy combines canonical origin/path normalization in one application redirect and clones headers for security coverage on redirects/errors; hosting-owned forwarding and assets require separate live verification.
- Public HTML caching bypasses session-bearing requests and private/session-setting responses, caps per-isolate memory by bytes and age, and schedules refreshes through the execution context so booking data is never shared.
- Sitemap sources paginate public-only reads, surface failures rather than publish partial XML, and deduplicate canonical HTML entries so crawlers see complete content lists.
- Pricing writes use the active pricing-schemes handlers; do not restore retired standalone profile, location/modifier, or legacy admin CRUD handlers, which had no application callers.
- Shared quote-settings and rule loaders fail closed on query errors; authoritative quotes and new bookings must propagate that failure instead of substituting empty rules or zero settings.
- Public layouts own editorial surface styling and the single closing FinalCta; homepage and About use BOOKING_STEPS so shared booking overviews cannot drift.
- Customer submission tables accept inserts only from privileged server paths; coupon redemption is a service-role-only locking routine using the real redemption schema.
- Booking payment state is derived from the payments ledger (amount minus refunded_amount over paid/partial/refunded rows) against the current fare via payment-ledger helpers; checkout, webhooks, cancellation refunds (spread across card charges) and amendment settlements all reconcile through it (amendment top-up/refund amounts come from src/lib/amendment-money.ts against the ledger, and a new change closes earlier open ones), staff cash rows are never deleted, and replayed sessions never rewrite ledger rows.
- Dated tour bookings reserve capacity and insert in one service-role-only Postgres routine holding the vehicle-class row lock; tour quoting enforces class/template eligibility and rejects unresolved or unroutable stops.
- Sightseeing-stop journeys use one pricing path (computeStopEconomics + priceStoppedVehicle) for quote and booking, so rules and coupons apply once and saved matches shown; stop-pricing failure blocks booking.
- Journey coordinate lookups throw on failure; pricing fails closed only when an active radius rule needs coordinates, while suggestion features use the soft resolver.
- Admin totals/reports read complete data via fetchAllPages (stable order); revenue is net of refunds and dated by paid_at, else created_at, via shared revenue helpers.
- Multi-table admin saves (settings + credentials, blog post + tags, extra + class links) run in one admin-checked Postgres function so a failed step leaves the previous configuration intact; omitted fields mean unchanged.
- Dispatch drains claim one event at a time via a leased service-role function (expired leases reclaimed, completion writes fenced to the lease, stable event IDs); scheduler and receiver read the drain token from private settings, never code or migrations.
- Subdirectories may have their own AGENTS.md (staff console routes, src/components/site — booking form, local-page hero, maps, dialogs, footer socials); read it before changing files there.
- Page photos live in src/content/page-images.ts (one unique CDN-hosted, credited Commons photo per path); LocalPageHero and DestinationCard prefer it over template images, and the credits page lists it, so a page never falls back to a shared photo.
- The header menu is driven only by the grouped MENU list in src/lib/site.ts (typed route paths, no redirect targets); Header renders desktop panels and phone folding sections from it so both stay in sync.
- Site-wide FAQ answers live in src/content/faq-bank.ts (keyed to the owner's question-bank numbers) and are built only from FACTS, live vehicle classes and existing booking features; unanswerable questions stay out rather than being guessed.
- Hourly hire (/book/hourly) and day tours (/book/tour) render one shared DayBookingWizard with a kind flag and save through the same reservation routine, so both share rates and capacity locking while hourly hire stays its own product without ready-made tours.
- Ready-made tour prices are manual or automatic per tour; automatic prices are computed server-side (hourly rate × hours + measured route miles × mile rate), saved with the tour settings in one admin-checked routine, refreshed when rates change, and those route miles count as included at quote time so they are never charged twice.
- Child seats are catalogue extras in the child_seat category, priced per seat; src/lib/child-seats.ts derives the saved per-type list, its label (booking page, emails, admin) and the one-seat-per-passenger limit, so form, server and messages agree.
- Sightseeing-stop quotes and bookings send one merged stop list (src/lib/trip-stops.ts: typed stops first, then sightseeing stops); loops with the same start and finish are routed through their stops, never as a zero-stop trip.
- What a tour price covers (hours, miles, per vehicle, tickets, extra hours) is derived only in src/lib/tour-price-covers.ts from the same template/class/tier data buildQuote uses, for the vehicle the From price comes from; unset values are omitted, so page text never disagrees with checkout.
- Cancellation cover price change, labels and refund promise live in src/lib/cancellation-cover.ts; bookings save the chosen cover and its amount, changes re-apply it, and Manage Booking refund advice follows it, so checkout, emails, admin and refunds agree.
- Customer pickup dates/times are UK wall-clock values: convert them with src/lib/uk-time.ts (ukLocalToMs, ukDate, ukClock) for cut-offs, notice periods, timed rules and form "today", never with UTC parsing or the server/browser clock, so checks stay right in both GMT and BST.
- Route head()/loader code ships in the main script, so head/schema helpers live in `*.head.ts` modules and destination loading in src/lib/destination-loader.ts; never import page layouts from route options or shared SEO/data modules (tests/main-script-split.test.ts).
- HTML cache headers are decided only in applyResponsePolicy: anonymous query-free 200 pages that pass isCacheablePageRequest get a 5-minute shared cache, everything else no-store, so private pages can't be shared.
- Vehicle capacity (passengers, large bags, cabin bags) is mapped from vehicle_classes and checked only through src/lib/vehicle-capacity.ts, so the fleet page and booking validation can never disagree.
