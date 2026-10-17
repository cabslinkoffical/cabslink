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
- A–Z sitemap inclusion shares the letter-page threshold helper and the same active/name/tier filters, so advertised directory pages match their existing robots settings.
- Primary review surfaces share Google review query options and the existing cached server feed; unavailable data shows a Google profile link without fallback scores or other-platform reviews.
- Passenger count is optional in initial booking handoffs; transfer quotes require explicit passenger confirmation, and tour vehicle selection gates continuation on confirmation and capacity without changing server pricing validation.
- Blog media and FAQ compatibility use shared browser-safe schemas in the editor and save validation, so legacy asset paths and question/answer records remain editable without losing text.
- The homepage uses one shared BookingWidget instance in a width-constrained column; container queries preserve its stacked layout without duplicating booking state or altering other forms.
- Every local page (journeys, destinations, areas, service+location, CMS SEO pages) renders through the shared LocalPageHero: page-specific copy/facts/image from src/lib/local-page.ts on the left, the identical `variant="hero"` BookingWidget in the same spot on the right (prefilled via label props resolved to place IDs), and the map panel under the form (route map when both ends known, marker map from page coordinates otherwise). Template files must not build their own heroes.
- seo_pages entity links resolve against public.destinations (name, display_name, type, slug, lat, lng — no hero image column); loadEntity in src/lib/seo-public.functions.ts is the only place that join happens.
- Local booking maps use page coordinates independently of address resolution; airport templates disable hero maps and use the shared AirportMapSection after page content, so airport-area maps stay separate from booking.
