# CabsLink — Final  SEO System, Local Content, Internal Linking and Interactive Coverage Map

## Project context

CabsLink already has a working application and local-page system.

The following systems already exist and must remain:

- Root-level service URLs

- `/areas`

- `/areas/$slug`

- `/areas/region/$slug`

- `/airports/$iata`

- `/universities/*`

- `/hospitals/*`

- `/cruise-ports/*`

- `/corporate/*`

- `/distilleries/*`

- `/attractions/*`

- `/stations/*`

- `/guides/*`

- `/blog/*`

- Existing destination records

- Existing area templates

- Existing airport pages

- Existing route logic

- Existing booking flow

- Existing server-side pricing

- Existing Google Places integration

- Existing Google Routes integration

- Existing fleet and vehicle-class logic

- Existing SEO quality evaluation

- Existing index/noindex controls

- Existing sitemap logic

- Existing security protections

- Existing tests

- Existing premium CabsLink design system

Do not rebuild these systems.

Do not create another location-page framework.

Do not create one React file for every city or town.

Do not replace the existing booking, pricing, Google API or vehicle-allocation logic.

This task is to implement the complete CareRank-style SEO model on top of the existing CabsLink system.

---

# Primary objective

Implement a structured commercial SEO system consisting of:

1. National transport-service pages

2. Travel Solution/customer-need pages

3. Existing city and town pages

4. Selected service + location pages

5. Selected Travel Solution + location pages

6. Draft-only three-way combinations

7. Supporting guides

8. Popular route pages

9. Excellent contextual internal linking

10. Controlled indexing

11. An interactive coverage map

12. Clear quote and booking conversion paths

13. Strong foundations for SEO, local SEO and answer-focused search

Do not guarantee rankings.

The objective is to build the strongest possible foundation for:

- Google Search

- Local commercial searches

- Answer engines

- AI-assisted search experiences

- User trust

- Crawlability

- Topical authority

- Internal-link authority

- Quote generation

- Completed bookings

---

# Stage 1 — Confirm and resolve existing audit findings

Before implementing new pages, verify the following audit findings:

- Root-level service URLs are already used.

- Combination pages must follow `/{service}/{location}`.

- Existing page-type routes must remain.

- Destination sub-sitemaps are currently empty because no destination has `seo_tier = 1`.

- `HOME_TO_HUBS` links to `/routes`, but `/routes` does not currently exist.

- `/locations/$slug` duplicates `/areas/$slug`.

- Ten published guides already exist and should support commercial pages.

Return a concise confirmation of which findings remain correct.

Then implement the corrections below.

---

# Stage 2 — Establish one source of truth

The existing database must remain authoritative for:

- Location identity

- Destination ID

- Name

- Display name

- Slug

- Type

- Parent region

- Parent council

- Country

- Latitude

- Longitude

- Google Place ID

- Operational status

- Publication status

- SEO tier

- Existing geographic relationships

- Existing airport relationships

- Existing route relationships

Do not duplicate these fields in independent TypeScript datasets.

Editorial content may be stored in an existing suitable table or a typed content registry only when it contains information not already represented in the database.

Editorial fields may include:

- Unique page introduction

- Service-location summary

- Curated local facts

- Customer-specific content

- Visible FAQs

- Content source references

- Review status

- Page-specific internal-link selections

- Content verification date

Every editorial record must be connected to the canonical database record by destination ID or canonical slug.

The database remains authoritative when identity or relationship information conflicts.

Inspect whether the existing `seo_pages` structure can safely store this content before creating a migration.

Do not create a migration unless it is genuinely required.

---

# Stage 3 — Add content verification and source tracking

Every factual local statement used on an indexable page must have a traceable basis.

Support the following verification statuses:

- Verified from the database

- Verified from application configuration

- Verified from Google Places

- Verified from Google Routes

- Verified from an official external source

- Inferred from verified relationships

- Unverified

- Requires human review

Store or document where appropriate:

- Source type

- Source organisation

- Source URL

- Date verified

- Verification status

- Content review status

Do not publish unverified information as confirmed fact.

Never invent:

- Local offices

- Customer numbers

- Passenger numbers

- Search volume

- Airport permissions

- Local partnerships

- Reviews

- Ratings

- Awards

- Journey prices

- Journey durations

- Operating hours

- Road restrictions

- Licensing claims

- Availability promises

Where a fact is not verified, omit it from published copy or mark it for human review.

---

# Stage 4 — Fix duplicate location URLs

Use `/areas/$slug` as the canonical city and town route.

Implement one-hop permanent redirects:

`/locations/{slug}` → `/areas/{slug}`

Requirements:

- Use HTTP 301 or 308

- Update all internal links to use `/areas/{slug}`

- Remove `/locations/*` from every sitemap

- Use `/areas/{slug}` in canonical tags

- Prevent redirect loops

- Prevent redirect chains

- Preserve only safe and necessary query parameters

- Do not preserve invalid price or booking-state parameters

- Add automated redirect tests

Do not leave both URLs returning HTTP 200.

---

# Stage 5 — Establish the canonical service URL registry

Create one canonical service registry.

Each service record should contain:

- Service ID

- Display name

- Canonical slug

- Canonical URL

- Existing route status

- Local child URL pattern

- Supported locations

- Related Travel Solutions

- Search aliases

- Redirect aliases

- Publication status

Use the same canonical slug for national and local pages.

Example:

National page:

`/corporate-travel`

Local page:

`/corporate-travel/edinburgh`

Do not create:

`/corporate-transfers/edinburgh`

when the national canonical is `/corporate-travel`.

Search aliases may support natural wording, on-site search and genuine legacy redirects, but must not create duplicate indexable pages.

Potential aliases include:

- Chauffeur service

- Executive car service

- Executive driver

- Corporate transfer

- Business transfer

- Airport taxi

- Airport cab

- Private car

- Private transfer

Before broad implementation, produce a canonical URL table containing:

- Service

- Existing URL

- Final canonical URL

- Local child pattern

- Duplicate or alias URLs

- Redirect recommendation

- Cannibalisation risk

---

# Stage 6 — Complete the national service pillar

Audit and create, complete, merge or consolidate the following service pages where their intent is genuinely distinct:

- `/airport-transfers`

- `/private-hire`

- `/executive-transfers`

- `/vip-transfers`

- `/corporate-travel`

- `/long-distance-transfers`

- `/group-transfers`

- `/minibus-hire`

- `/coach-hire`

- `/cruise-transfers`

- `/university-transfers`

- `/hospital-transfers`

- `/golf-transfers`

- `/wedding-transport`

- `/event-transport`

- `/hourly-hire`

- `/tours`

- `/football-transfers`

- `/stadium-transfers`

- `/team-sports-travel`

- `/vip-sports-hospitality`

Do not publish pages merely because they appear in this list.

Audit overlap between:

- Executive Transfers and VIP Transfers

- Group Transfers and Minibus Hire

- Event Transport and Stadium Transfers

- Team Sports Travel and Group Transfers

- VIP Transfers and VIP Sports Hospitality

- Tours and general Sightseeing terminology

- Corporate Travel and Executive Transfers

- Hourly Hire and Executive Transfers

Where two pages give substantially the same answer:

- Choose one canonical page

- Merge overlapping content

- Reposition the secondary page around a distinct need

- Redirect a genuine duplicate route where appropriate

Every published national service page must contain:

1. Breadcrumbs

2. Premium hero

3. Unique H1

4. Concise direct-answer introduction

5. Who the service is designed for

6. Service use cases

7. How booking works

8. Relevant Travel Solutions

9. Suitable vehicle classes

10. Main operational features

11. Popular served locations

12. Popular routes

13. Related airports or transport hubs

14. Related service pages

15. Supporting guides

16. Visible FAQs

17. Quote or booking CTA

18. Unique metadata

19. Correct structured data

20. Interactive service coverage map where sufficient verified locations exist

---

# Stage 7 — Build the Travel Solutions pillar

Create:

`/travel-solutions`

Navigation label:

`Travel Solutions`

Create national pages for distinct customer and journey needs:

- `/travel-solutions/business-travel`

- `/travel-solutions/student-travel`

- `/travel-solutions/family-travel`

- `/travel-solutions/group-travel`

- `/travel-solutions/cruise-travel`

- `/travel-solutions/golf-travel`

- `/travel-solutions/healthcare-travel`

- `/travel-solutions/wedding-travel`

- `/travel-solutions/event-travel`

- `/travel-solutions/tourism-and-sightseeing`

- `/travel-solutions/whisky-and-distillery-travel`

- `/travel-solutions/vip-travel`

A Travel Solution page must focus on the customer’s needs rather than repeat a transport service page.

## Business Travel

Cover:

- Airport collection

- Corporate journeys

- Executive vehicle needs

- Hotels

- Offices

- Business parks

- Conferences

- Railway connections

- Group coordination

- Hourly hire

- Business-focused routes

## Student Travel

Cover:

- Airport arrival

- University transfer

- Accommodation arrival

- Family arrivals

- Group arrivals

- Luggage

- Railway pickup

- Return journeys

- Relevant universities

- Student-focused routes

## Family Travel

Cover:

- Passenger count

- Luggage planning

- Suitable vehicle classes

- Child-seat requests where supported

- Airport collection

- Door-to-door transport

- Return bookings

- Group size

## Group Travel

Cover:

- MPV

- Minibus

- Coach

- Passenger capacity

- Luggage capacity

- Events

- Airports

- Universities

- Cruises

- Golf groups

- Tours

## Cruise Travel

Cover:

- Airport-to-port transfers

- Port-to-hotel travel

- Cruise terminals

- Group luggage

- Executive travel

- Return transfers

- Related routes

## Golf Travel

Cover:

- Golf luggage

- Suitable vehicles

- Group travel

- Airport collection

- Golf resorts

- St Andrews

- Gleneagles

- North Berwick

- Gullane

- Multi-day travel

- Relevant routes

Apply the same level of useful specificity to every published Travel Solution.

A Travel Solution page must remain draft when it cannot offer a distinct answer from an existing service page.

---

# Stage 8 — Preserve existing city and town pages

Existing pages such as:

- `/areas/edinburgh`

- `/areas/glasgow`

- `/areas/livingston`

- `/areas/st-andrews`

- `/areas/stirling`

- `/areas/perth`

- `/areas/dundee`

- `/areas/falkirk`

remain the broad local transport pages.

Do not rebuild or replace them.

Do not perform a major redesign of `AreaLocationPage`.

Use a low-risk additive approach.

Allowed improvements:

- Add breadcrumbs where missing

- Add contextual service links

- Add service-location links

- Add Travel Solution location links

- Add popular route links

- Add airport links

- Add guide links

- Improve empty states

- Improve spacing and accessibility

- Remove genuinely duplicated sections

- Add a compact nearby coverage map where useful

Do not:

- Replace the loader without demonstrated need

- Replace stable queries

- Rewrite the complete page architecture

- Change booking behaviour

- Add heavy client rendering

- Fetch the full location database

- Add large animations or carousels

- Perform an unrelated visual redesign

Each area page remains responsible for broad intent such as:

- Private hire in the location

- Airport transfer options

- Executive travel

- Group travel

- Nearby areas

- Relevant airports

- Popular routes

- Main services

- Travel planning

- Booking

A service-location page must target a narrower intent.

---

# Stage 9 — Create selected service + location pages

Use the existing root-level URL architecture:

`/{service}/{location}`

Examples:

- `/airport-transfers/edinburgh`

- `/airport-transfers/livingston`

- `/executive-transfers/glasgow`

- `/corporate-travel/edinburgh`

- `/university-transfers/st-andrews`

- `/cruise-transfers/edinburgh`

- `/golf-transfers/north-berwick`

- `/minibus-hire/dundee`

Do not create every service for every location.

Use an explicit approved combination matrix.

Every combination record must contain:

- Canonical service ID

- Canonical location ID

- Canonical URL

- Search intent

- Page type

- Publication status

- Unique H1

- Unique title

- Unique meta description

- Unique introduction

- At least three verified local facts or relationships

- At least three unique visible FAQs

- Related routes

- Related pages

- Relevant vehicle classes

- Booking or quote CTA

- Content source references

- Review status

- Quality result

A combination page may only be generated from this approved matrix.

Do not automatically publish a combination merely because the service and location records both exist.

---

# Stage 10 — Initial service-location scope

Use only locations currently present and verified in the database.

## Airport Transfers

Potential priorities:

- Edinburgh

- Glasgow

- Livingston

- St Andrews

- Stirling

- Perth

- Dundee

- Dunfermline

- Falkirk

- Kirkcaldy

- Linlithgow

- Bathgate

## Executive Transfers

Potential priorities:

- Edinburgh

- Glasgow

- St Andrews

- Stirling

- Perth

- Dundee

- Livingston

## Corporate Travel

Potential priorities:

- Edinburgh

- Glasgow

- Livingston

- Dunfermline

- Falkirk

- Stirling

Business parks such as Edinburgh Park, Gogarburn and Eurocentral should continue using the correct corporate entity system rather than being forced into city routes.

## University Transfers

Potential priorities:

- Edinburgh

- St Andrews

- Glasgow

- Dundee

- Stirling

- Perth

## Cruise Transfers

Potential priorities:

- Edinburgh

- Leith

- South Queensferry

- Rosyth

- Greenock

- Glasgow

## Golf Transfers

Potential priorities:

- St Andrews

- Gleneagles

- North Berwick

- Gullane

- Edinburgh

- Perth

## Minibus and Group Travel

Potential priorities:

- Edinburgh

- Glasgow

- St Andrews

- Stirling

- Perth

- Dundee

- Livingston

Report locations missing from the database.

Do not silently create new records or invented facts.

---

# Stage 11 — Create selected Travel Solution + location pages

Use:

`/travel-solutions/{solution}/{location}`

Examples:

- `/travel-solutions/business-travel/edinburgh`

- `/travel-solutions/business-travel/glasgow`

- `/travel-solutions/student-travel/st-andrews`

- `/travel-solutions/student-travel/edinburgh`

- `/travel-solutions/cruise-travel/edinburgh`

- `/travel-solutions/golf-travel/st-andrews`

- `/travel-solutions/group-travel/glasgow`

- `/travel-solutions/healthcare-travel/edinburgh`

- `/travel-solutions/vip-travel/edinburgh`

Each page must be materially different from:

- The general area page

- The national service page

- The national Travel Solution page

- The service-location page

- A route page

Example:

`/travel-solutions/student-travel/st-andrews`

should focus on:

- Student arrival

- University of St Andrews

- Edinburgh Airport

- Glasgow Airport

- Leuchars station

- Student accommodation

- Luggage

- Family arrivals

- Group arrivals

- Suitable vehicle classes

- Return travel

- Student-specific FAQs

It must not be a copied version of `/university-transfers/st-andrews`.

---

# Stage 12 — Keep three-way combinations draft-only

Service + Travel Solution + Location pages must remain:

- Draft

- `noindex`

- Excluded from sitemaps

- Excluded from main navigation

- Excluded from priority internal-link promotion

Examples:

- Student airport transfers in St Andrews

- Corporate executive transfers in Edinburgh

- Golf airport transfers in St Andrews

- Cruise airport transfers in Edinburgh

- Group airport transfers in Glasgow

Create an opportunity dataset or report where useful.

Do not create empty public pages.

Do not publish these pages without explicit future approval.

---

# Stage 13 — Resolve the `/routes` problem

Audit existing route data.

Inspect:

- Route records

- Published status

- Origin and destination

- Slugs

- Distance

- Duration

- Google Place IDs

- Route metadata

- Booking behaviour

- Internal-link status

- Indexability

- Quality status

If enough real route data exists, create a useful `/routes` hub containing:

- Popular routes

- Airport routes

- City-to-city routes

- University routes

- Cruise routes

- Golf routes

- Search or filter functionality

- Links to origin pages

- Links to destination pages

- Quote CTAs

Do not show empty categories.

If there is not enough content for a useful route hub:

- Temporarily remove or replace the broken `/routes` link

- Do not publish an empty page

- Report what data is required

The final implementation must contain no broken `/routes` link.

---

# Stage 14 — Interactive coverage map

## Main map placement

Create the primary interactive coverage map on:

`/areas`

Place it directly after the hero and location-search section.

Recommended page order:

1. Header

2. Hero

3. Location search

4. Interactive coverage map

5. Popular locations

6. Browse by region or council

7. Browse alphabetically

8. Browse by location type

9. Popular routes

10. Related services

11. Booking CTA

12. Footer

Do not put the map above the main search or booking action.

The map must support user discovery, not replace the crawlable location directory.

## Map objective

The map should show every verified location where CabsLink services are genuinely available.

When the user clicks a location marker:

- Display a compact location information panel

- Show the location name

- Show its type

- Show its region or council

- Show available relevant services

- Show the nearest relevant airport where verified

- Show a “View location” button

- Link to the canonical location URL

Example:

`/areas/edinburgh`

Do not open a duplicate URL.

Do not use `/locations/{slug}`.

## Map data source

Use the existing database as the authoritative source.

A location may appear on the public map only when:

- It is active

- It is genuinely served

- It has valid latitude and longitude

- It has a canonical public destination

- It is not archived

- It is not a duplicate

- It is not a search alias

- It is not an obsolete redirect record

Do not manually hardcode map coordinates when verified database coordinates exist.

Do not invent coordinates.

## Map behaviour

Support:

- Marker selection

- Pan and zoom

- Fit bounds to visible results

- Marker clustering at wider zoom levels

- Filter by region

- Filter by council area

- Filter by city or town

- Filter by service where service availability is verified

- Search by location name

- Reset filters

- “View all locations” state

- Mobile-friendly interaction

- Keyboard-accessible location result controls

When a user filters by service, display only locations connected to that service through approved service coverage or published service-location records.

Do not infer service availability merely because the location exists.

## Marker click interaction

A marker click must:

1. Select the location.

2. Display a compact information panel.

3. Highlight the corresponding result in the accessible list.

4. Offer a normal crawlable link to the canonical page.

5. Allow the user to start a quote where safe.

6. Preserve server-authoritative quote calculations.

Map marker interaction itself may use JavaScript, but the location link must be a real `<a href>` or framework link.

## Accessible fallback

The map must have an equivalent server-rendered location list.

This list must contain:

- Location name

- Location type

- Region or council

- Available service labels where verified

- Canonical location link

The site must remain fully usable when:

- JavaScript is disabled

- The map library fails

- Google Maps fails

- A network request fails

- The user uses keyboard navigation

- The user uses a screen reader

Do not hide important SEO links exclusively inside map markers.

## Map performance

Do not load the map library on the first critical render.

Requirements:

- Render the location search and textual directory in SSR HTML

- Lazy-load the interactive map after user interaction or when it approaches the viewport

- Show a lightweight placeholder before loading

- Do not block LCP

- Do not fetch all unnecessary entity types

- Load only verified serviceable map records

- Use marker clustering

- Avoid rendering hundreds of individual DOM markers simultaneously

- Cache stable public coordinate data where appropriate

- Do not expose private or admin-only data

- Do not expose API keys that are not intended for browser use

- Apply correct browser key restrictions where a browser map key is required

Do not reuse the server-only Routes API key in the browser.

## Map privacy

Do not request the user’s live location automatically.

Do not require geolocation permission to use the map.

A separate optional “Use my location” feature must not be added during this implementation unless it already exists and is compliant with the current privacy and consent system.

## Map SEO rules

The map itself is a user-interface enhancement.

It does not replace:

- Server-rendered links

- Regional hubs

- Council hubs

- A–Z navigation

- Location search

- Internal linking

- Sitemaps

- Breadcrumbs

Do not create indexable map-filter URLs.

Filter states should not create crawlable duplicate pages through query parameters unless explicitly approved later.

Canonical URLs must remain clean.

---

# Stage 15 — Smaller contextual maps

Do not repeat a large map on every page.

Add a smaller contextual map only where it improves the page.

## Suitable pages

A compact service coverage map may appear on:

- `/airport-transfers`

- `/executive-transfers`

- `/corporate-travel`

- `/cruise-transfers`

- `/university-transfers`

- `/golf-transfers`

- `/minibus-hire`

The map should display only locations verified for that service.

Clicking a marker should link to:

`/{service}/{location}`

when an approved published service-location page exists.

When no published service-location page exists, link to:

`/areas/{location}`

Do not link users to draft or noindex combination pages from major service maps.

## Area-page compact map

A compact nearby-area map may appear on a major `/areas/$slug` page when it has enough verified nearby locations.

It may show:

- Current location

- Nearby served towns

- Nearby airports

- Nearby stations where useful

Clicking a nearby town should link to its canonical `/areas/{slug}` page.

Do not add a map to every minor area page.

## Airport-page map

An airport page may show a limited map of popular served locations where verified.

Clicking a location should link to:

- An approved airport-transfer service-location page, where available

- Otherwise its canonical area page

- Or a real route page where that is the clearest user intent

Do not create new pages only to supply map links.

---

# Stage 16 — Internal linking architecture

Implement contextual internal links across the complete SEO system.

All important links must:

- Be server rendered

- Produce real `<a href>` elements

- Use descriptive anchor text

- Point to canonical URLs

- Exclude drafts

- Exclude broken pages

- Exclude obsolete aliases

- Remain within sensible section limits

## Homepage links to

- Main services

- Travel Solutions

- Locations We Cover

- Major cities

- Major airports

- Popular routes

- Fleet

- Tours

- Guides

Do not display hundreds of location links on the homepage.

## `/areas` links to

- Major cities

- Major towns

- Council hubs

- Regional hubs

- A–Z location navigation

- Location-type hubs

- Main services

- Popular routes

- Map-linked canonical location pages

## Area page links to

- Parent region or council

- Nearby areas

- Relevant national services

- Approved service-location pages

- Approved Travel Solution location pages

- Airports

- Stations

- Routes

- Fleet

- Guides

- Booking CTA

## National service page links to

- Approved service-location pages

- Related Travel Solutions

- Relevant airports

- Relevant routes

- Suitable vehicle classes

- Supporting guides

- Booking CTA

## Travel Solution page links to

- Related services

- Approved local solution pages

- Routes

- Vehicle classes

- Guides

- Booking CTA

## Service-location page links to

- Parent national service

- Main area page

- Parent region or council

- Related Travel Solution

- Relevant routes

- Nearby approved service-location pages

- Vehicle classes

- Guides

- Booking CTA

## Travel Solution location page links to

- Parent Travel Solution

- Main area page

- Relevant service

- Relevant service-location page

- Routes

- Nearby relevant locations

- Guides

- Booking CTA

## Route page links to

- Origin page

- Destination page

- Relevant airport

- Relevant service

- Relevant service-location page

- Related routes

- Vehicle classes

- Guide

- Booking CTA

## Guide links to

- Main relevant service

- Relevant Travel Solution

- Relevant area page

- Relevant service-location page

- Relevant route

- Booking CTA

## Link caps

Use sensible caps:

- Nearby locations: maximum 6

- Service-location links: maximum 6

- Travel Solution links: maximum 4

- Popular routes: maximum 8

- Guides: maximum 4

- Vehicle classes: maximum 4

- Local place links per category: maximum 6

Add “View all” links to proper hubs where additional records exist.

Every indexable page must have:

- A parent link

- At least one inbound contextual link

- At least four useful outbound internal links

- Breadcrumbs

- A clear path to quote or booking

Report every orphaned indexable page.

---

# Stage 17 — Production content requirements

Do not create empty page shells.

Every published combination page must contain:

1. Breadcrumbs

2. Premium hero

3. Unique H1

4. Unique direct-answer introduction

5. Specific service and location explanation

6. At least three verified local facts or relationships

7. Relevant airport or transport connections

8. Relevant routes

9. Suitable vehicle classes

10. Passenger and luggage guidance

11. Pickup or travel-planning guidance

12. Nearby relevant locations

13. Related national service

14. Related Travel Solution

15. Related area page

16. Supporting guides

17. At least three unique visible FAQs

18. Quote CTA

19. Booking CTA

20. Unique metadata

21. Correct structured data

Render only sections containing useful data.

Never show:

- Empty cards

- Empty headings

- Placeholder paragraphs

- Mock records

- “Coming soon”

- Repeated city-name copy

- Fake reviews

- Fake ratings

- Fake prices

- Unsupported local claims

---

# Stage 18 — Content quality and indexing gates

A page may become `index, follow` only when:

1. The service is genuinely supported.

2. The location is genuinely covered.

3. Search intent is distinct.

4. The page has a unique H1.

5. The page has a unique title.

6. The page has a unique meta description.

7. The introduction is original.

8. At least three verified local facts exist.

9. Relevant route, airport or transport information exists.

10. At least four internal links resolve.

11. At least one inbound contextual link exists.

12. At least three useful visible FAQs exist.

13. The quote or booking CTA works.

14. The canonical is correct.

15. Structured data matches visible content.

16. There are no unsupported claims.

17. There are no duplicated paragraphs.

18. No stronger page already targets the same intent.

19. The page has passed review or the existing quality system.

When a page fails:

- Keep it `noindex, follow` or draft

- Exclude it from sitemaps

- Exclude it from priority navigation

- Exclude it from primary service maps

- Report the missing requirements

Do not redirect incomplete pages to unrelated pages.

---

# Stage 19 — Fix SEO tiers and sitemap output

The audit found no destination currently has `seo_tier = 1`.

Do not promote everything automatically.

Evaluate candidate pages using the quality gates.

After evaluation:

- Promote approved complete pages to Tier 1

- Retain incomplete pages at lower tiers

- Keep incomplete pages noindex

- Exclude lower-quality pages from sitemaps

- Report why each rejected page failed

Generate sitemap entries from pages that pass publication and quality checks.

Include:

- Approved national service pages

- Approved Travel Solutions

- Tier 1 area pages

- Published service-location pages

- Published Travel Solution location pages

- Published route pages

- Published guides

- Approved entity pages

Exclude:

- Drafts

- Tier 3 pages

- Noindex pages

- Three-way draft pages

- Search results

- Preview URLs

- Redirect URLs

- `/locations/*`

- Filter states

- Map query states

- Booking-state URLs

- Duplicate aliases

Verify:

- Every sitemap URL returns HTTP 200

- Every sitemap URL is indexable

- No sitemap URL redirects

- Every URL uses the production canonical

- Canonical and sitemap URL match

- No duplicate URL appears across sub-sitemaps

Return sitemap totals by page type.

---

# Stage 20 — Metadata and structured data

Every indexable page must have:

- Unique SEO title

- Unique meta description

- One H1

- Self-referencing canonical

- Correct robots directive

- Open Graph title

- Open Graph description

- Open Graph URL

- Twitter metadata

- Visible breadcrumbs

- Sitemap inclusion

Use only accurate structured data:

- `WebPage`

- `Service`

- `Place`

- `BreadcrumbList`

- `FAQPage`, only for visible FAQs

- `ItemList`, only for a genuine visible list

- `Organization`, using one consistent CabsLink identity

- `GeoCoordinates`, where verified

Do not create a local `LocalBusiness` entity for every city.

Do not imply that CabsLink has an office in each location.

Do not add:

- Fake addresses

- Fake telephone numbers

- Fake branches

- Fake ratings

- Fake reviews

- Unsupported prices

- Invented opening hours

- Unsupported offers

Validate all JSON-LD.

Prevent conflicting duplicate `Organization` entities.

---

# Stage 21 — SEO, AEO and answer-focused content

Every suitable page should clearly answer relevant customer questions.

Use visible sections such as:

## Quick answer

Explain the service and location clearly in approximately 40–70 words.

## How booking works

Explain the actual working booking flow.

## Common journeys

Show verified relevant routes.

## Choosing a vehicle class

Explain passenger and luggage capacity.

## Pickup and journey planning

Provide practical, verified information.

## Frequently asked questions

Give short direct visible answers.

## Key considerations

Where relevant, address:

- Passenger count

- Luggage

- Flight information

- Return travel

- Group requirements

- Child-seat requests where supported

- Accessibility requirements where supported

- Golf luggage

- Cruise luggage

- Student arrival needs

Do not create hidden AI-only copy.

Do not stuff pages with unnatural questions.

Do not create separate pages for every synonym such as:

- Taxi

- Cab

- Airport taxi

- Airport cab

- Private car

- Private hire

- Executive taxi

- Premium transfer

Group terms representing the same intent naturally on one strong page.

---

# Stage 22 — Conversion tracking

Inspect whether a real analytics provider already exists.

When a provider exists:

- Use the existing provider

- Respect existing consent rules

- Use the existing event naming approach

- Avoid PII

- Do not include prices in URLs

- Store source page type and slug

Track where appropriate:

- SEO landing-page view

- Map interaction

- Map location selection

- Location-page click from map

- Service-filter selection

- Quote CTA click

- Booking CTA click

- Route-card click

- Vehicle-class click

- Quote start

- Quote completion

- Booking completion

When no analytics provider is configured:

- Create a typed analytics interface

- Use a safe no-op adapter

- Mark it clearly as `not_configured`

- Do not claim events are being received

- Do not install an unapproved third-party tracker

---

# Stage 23 — Routing implementation safety

Dynamic child pages may require converting current route leaves to index siblings.

Before changing any route family:

1. Inventory affected route files.

2. Record current route IDs.

3. Record existing links.

4. Identify layout behaviour.

5. Identify dynamic-route collisions.

6. Confirm existing URLs remain unchanged.

7. Create a rollback plan.

Implement one representative family first:

`/airport-transfers`

Then add selected:

`/airport-transfers/{location}`

After implementation:

- Regenerate routes

- Run typecheck

- Run tests

- Run production build

- Open the national page

- Open a local child page

- Refresh the local child page directly

- Verify metadata

- Verify layout behaviour

- Verify no 404 regression

- Verify booking prefill

- Verify internal links

Only then reuse the proven approach for additional service families.

Do not convert all route families simultaneously.

---

# Stage 24 — Performance requirements

The new SEO system and map must not create a performance regression.

Requirements:

- Primary content in SSR HTML

- Important internal links in SSR HTML

- Load only the current page record

- Load capped related records

- Do not load the full combination matrix into the browser

- Do not fetch the full location database on every detail page

- Add database indexes when required

- Prevent N+1 queries

- Lazy-load maps

- Use marker clustering

- Do not load Google Routes in the browser

- Do not expose server API keys

- Avoid unnecessary client JavaScript

- Use route-level code splitting

- Reserve image dimensions

- Avoid layout shifts

- Cache stable public data safely

- Preserve booking performance

- Preserve server-side pricing

Report:

- Main bundle-size impact

- Route bundle impact

- Query impact

- Map loading impact

- Hydration status

- Any performance regression

Do not claim arbitrary performance scores without measuring them.

---

# Stage 25 — Accessibility requirements

Target WCAG 2.2 AA.

Verify:

- One H1 per page

- Logical heading hierarchy

- Keyboard-accessible navigation

- Keyboard-accessible map alternatives

- Visible focus states

- Sufficient contrast

- Descriptive links

- Meaningful image alt text

- Form labels

- Touch-friendly controls

- Reduced-motion support

- No information communicated only through colour

- Accessible map fallback list

- Appropriate live announcements for filter-result changes

The interactive map must not prevent keyboard or screen-reader users from reaching any location.

---

# Stage 26 — Automated testing

Add tests for:

## Publication quality

- Tier 1 requires all quality conditions

- Failed pages remain noindex

- Failed pages remain outside sitemaps

- Draft three-way pages remain unpublished

- Duplicate intent is rejected

- Duplicate canonical is rejected

- Duplicate title is rejected

- Duplicate H1 is rejected

- Fact count is enforced

- FAQ count is enforced

- Inbound-link requirement is enforced

## Routing

- Existing national services remain accessible

- Local child routes return HTTP 200

- Dynamic routes do not become accidental layouts

- `/locations/{slug}` redirects to `/areas/{slug}`

- Redirects are one hop

- No redirect loops

- No route collisions

- `/routes` does not remain a broken link

## Map

- Only active serviceable locations appear

- Invalid coordinates are excluded

- Archived records are excluded

- Duplicate markers are prevented

- Marker links use canonical URLs

- Service filters use verified service relationships

- Draft combination pages are not linked

- Map failure leaves the SSR location list functional

- Location search and map filtering remain consistent

- No private fields are exposed

- Map browser key is correctly separated from server credentials

## Internal links

- Parent links resolve

- Service links resolve

- Area links resolve

- Route links resolve

- Guide links resolve

- Draft pages are excluded

- Every indexable page has an inbound link

- Links render as real anchors

- Link caps are respected

- No orphan pages remain

## Sitemap

- Only indexable pages appear

- No redirecting URL appears

- No noindex page appears

- No duplicate URL appears

- Every sitemap URL returns HTTP 200

- Empty sub-sitemaps are not emitted unnecessarily

## Structured data

- Schema matches visible content

- Visible FAQs match FAQ schema

- `ItemList` matches visible lists

- Only one consistent Organization identity is emitted

- No fake local branch schema exists

- JSON-LD is valid

## Booking safety

- Service hints are validated

- Location hints are validated

- No price is trusted from URL parameters

- Server-side pricing recalculates

- Standard booking remains functional

- Invalid prefill values fail safely

## Content

- No mock content

- No placeholder content

- No empty published sections

- No unsupported claims

- No repeated city-name substitution content

- No near-duplicate published pages

---

# Stage 27 — Playwright browser verification

Test at least:

1. Homepage

2. `/services`

3. Existing service pillar

4. Converted service pillar

5. Service-location page

6. `/travel-solutions`

7. Travel Solution page

8. Travel Solution location page

9. `/areas`

10. Main interactive coverage map

11. Map service filter

12. Map location selection

13. Map canonical page navigation

14. Map failure fallback

15. Major Tier 1 area

16. Tier 3/noindex area

17. `/locations/{slug}` redirect

18. `/routes` or its corrected replacement

19. Airport page

20. Guide page

21. Quote CTA

22. Booking prefill

23. Mobile navigation

24. Mobile map experience

25. Desktop map experience

26. Keyboard navigation

27. Browser refresh on a dynamic service child

28. Console errors

29. Hydration

30. Canonical

31. Robots directive

32. Structured data

33. Sitemap inclusion

Capture before-and-after screenshots for:

- `/areas` desktop

- `/areas` mobile

- One major area page

- One national service page

- One service-location page

---

# Stage 28 — Implementation order

Follow this order exactly.

## Phase A — Resolve current blockers

- Confirm audit

- Establish canonical service registry

- Resolve `/locations/$slug`

- Resolve `/routes`

- Audit SEO tiers

- Audit sitemap eligibility

- Identify duplicate intent

- Confirm source-of-truth model

## Phase B — Build the coverage map

- Add verified coordinate query

- Add map data endpoint or server loader

- Add SSR location fallback

- Add filters

- Add marker clustering

- Add canonical marker links

- Add lazy loading

- Add tests

- Add map to `/areas`

Do not continue when the map creates security, hydration or performance regressions.

## Phase C — Representative service family

- Complete `/airport-transfers`

- Add approved airport-transfer location children

- Add editorial content

- Add source records

- Add internal links

- Add service map

- Add sitemap entries

- Run full tests

## Phase D — Remaining approved service pillars

Reuse only the proven route and content pattern.

## Phase E — Travel Solutions

Implement the hub, distinct national pages and approved local pages.

## Phase F — Existing guide integration

Connect the 10 published guides to:

- Services

- Travel Solutions

- Areas

- Routes

- Booking CTAs

Do not rewrite guide content merely to add keywords.

## Phase G — Final audit

Run the full production, SEO, accessibility, security, performance and browser audit.

---

# Required final report

Return:

1. Audit findings confirmed or corrected

2. Files changed

3. Database changes

4. Source-of-truth decisions

5. Canonical service URL table

6. Duplicate URLs redirected

7. `/locations/*` redirect coverage

8. `/routes` resolution

9. Tier 1 page count before implementation

10. Tier 1 page count after implementation

11. Lower-tier page counts

12. National service pages published

13. Travel Solution pages published

14. Service-location pages published

15. Travel Solution location pages published

16. Three-way draft opportunities

17. Content source coverage

18. Facts requiring human verification

19. Map location count

20. Locations excluded from map and reasons

21. Map service-filter coverage

22. Map fallback behaviour

23. Map security configuration

24. Interactive-map performance impact

25. Internal-link coverage

26. Orphan-page report

27. Sitemap counts by page type

28. Canonical coverage

29. Metadata coverage

30. Structured-data coverage

31. Analytics configuration status

32. Tests added

33. Final test count

34. Playwright checks completed

35. Performance impact

36. Accessibility findings

37. Remaining Critical issues

38. Remaining High issues

39. Remaining Medium issues

40. Remaining Low issues

41. Recommended next content and location batch

Do not mark this implementation complete when:

- Duplicate URLs still return HTTP 200

- `/routes` remains broken

- Sitemaps remain empty unexpectedly

- Published pages have no inbound links

- Published content is unverified

- Map markers point to drafts or duplicate URLs

- Map functionality has no accessible fallback

- Server-only API credentials are exposed

- Analytics is presented as working when unconfigured

- Empty page shells exist

- Mock data remains

- Dynamic route families are not browser tested

- Existing booking or pricing behaviour has regressed

Start with Phase A.

Return the confirmed audit, canonical URL map, source-of-truth decision and implementation plan before performing broad route conversions or destructive database changes.