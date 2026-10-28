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
- Booking list status presentation uses BookingStatusCell to keep booking state, payment state and lock indication in one compact row without duplicating payment labels in the price column.
- A–Z letter indexes stay noindex and excluded from sitemap output; robots restrictions cover every explicit crawler group, keeping directory crawl decisions consistent.
- Primary review surfaces share Google review query options and the existing cached server feed; unavailable data shows a Google profile link without fallback scores or other-platform reviews.
- Passenger count is optional in initial booking handoffs; transfer quotes require explicit passenger confirmation, and tour vehicle selection gates continuation on confirmation and capacity without changing server pricing validation.
- Blog media and FAQ compatibility use shared browser-safe schemas in the editor and save validation, so legacy asset paths and question/answer records remain editable without losing text.
- Blog publication accepts active non-empty individual or team bylines; biography/photo are optional, and the database guard is covered with transaction-local regression tests so existing authors are never replaced with invented identities.
- The homepage uses one shared BookingWidget instance in text–booking–vehicle source order and explicit home-scoped grid areas; this keeps visual and keyboard order consistent without duplicating booking state or altering local-page forms.
- Every local page (journeys, destinations, areas, service+location, CMS SEO pages) renders through the shared LocalPageHero: page-specific copy/facts/image from src/lib/local-page.ts on the left, the identical `variant="hero"` BookingWidget in the same spot on the right (prefilled via label props resolved to place IDs), and the map panel under the form (route map when both ends known, marker map from page coordinates otherwise). Template files must not build their own heroes.
- seo_pages entity links resolve against public.destinations (name, display_name, type, slug, lat, lng — no hero image column); loadEntity in src/lib/seo-public.functions.ts is the only place that join happens.
- Local booking maps use page coordinates independently of address resolution; airport templates disable hero maps and use the shared AirportMapSection after page content, so airport-area maps stay separate from booking.
- Public page content stays inside SiteLayout before its footer; automated explore-link sections are removed rather than appended outside the layout to prevent duplicate closing content.
- Every FAQ surface on the site renders through the single shared FaqAccordion (numbered gold list, display-font questions, circular plus/minus toggle); FaqBlock and FaqSection are thin wrappers so no page builds its own FAQ list.
- Every hub destination grid (attractions, distilleries, airports, stations, cruise ports, universities, hospitals, corporate, guides) renders through the single shared DestinationCard (photo, name, location badge, expand-arrow detail); hub list functions enrich destinations with their linked page's image and intro via attachPageData, never invented copy.

- BookingWidget layouts share one PassengerEditor for passenger and bag counts so controls and limits remain consistent across transfer, hourly and local-page forms.
- Booking mode and secondary action buttons use the shared bookingDark/bookingLight Button variants; homepage layout CSS must not override their backgrounds or borders, keeping selected, hover and keyboard states consistent.

- Homepage vehicle and tour loops share DraggableMarquee, which scrubs the existing CSS animation through pointer events and suppresses link activation after dragging.
- Social profiles render only in the footer, driven by the shared SOCIALS list; no standalone social band section is mounted in SiteLayout, so follow links live in exactly one place.
- Shared dialogs use viewport-constrained widths and dynamic-height scrolling; BookingWidget passenger editing uses this modal shell so controls remain visible and focus-managed on phones.
- Related-pages links render inside page content through RelatedLinks and contextual PlaceGuideBlock links; server-side selection returns compact published-only results ranked by verified topics/themes, with self-links excluded and no duplicate tour sections.
- Response policy combines canonical origin/path normalization in one application redirect and clones headers for security coverage on redirects/errors; hosting-owned forwarding and assets require separate live verification.
- Public HTML caching bypasses session-bearing requests and private/session-setting responses, caps per-isolate memory by bytes and age, and schedules refreshes through the execution context so booking data is never shared.
- Sitemap sources paginate public-only reads, surface failures rather than publish partial XML, and deduplicate canonical HTML entries so crawlers see complete content lists.
- Pricing writes use the active pricing-schemes handlers; do not restore retired standalone profile, location/modifier, or legacy admin CRUD handlers, which had no application callers.
- Shared quote-settings and rule loaders fail closed on query errors; authoritative quotes and new bookings must propagate that failure instead of substituting empty rules or zero settings.
- Public layouts own editorial surface styling and the single closing FinalCta; homepage and About use BOOKING_STEPS so shared booking overviews cannot drift.
