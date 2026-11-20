# Crawl caching and search snippets, 20 November 2026

## A. Cache verification

Published asset checked with curl: `https://cabslink.com/assets/index-CFhPOZdR.js`
```http
HTTP/2 200
content-type: text/javascript; charset=utf-8
cache-control: public, max-age=31536000, immutable
```

The existing static response policy already applies one-year immutable caching to JS, CSS, fonts and images, including hashed `/assets/` files. Hosted assets may bypass the app; the published JS response confirms the hosting rule is active.

Preview HTML checked with curl: `http://localhost:8080/routes/edinburgh-airport-to-city-centre`
```http
HTTP/1.1 200 OK
cache-control: public, max-age=0, s-maxage=300, stale-while-revalidate=86400
etag: W/"2b6ab8724bbc22773456a513ac19a7b95a4ba9ecb27654c44b77e49cc0e22095"
last-modified: Fri, 20 Nov 2026 12:36:18 GMT
```

Repeat curl with that `If-None-Match` returned **304 Not Modified**, the same validators and the same public cache policy. Cold public responses and cached copies both have validators. Booking, admin, authenticated, session-setting and query-bearing requests remain no-store.

The published HTML is still the previous release: `cache-control: no-cache, must-revalidate, max-age=0`, with no ETag or Last-Modified. New app headers/304 handling require the owner’s next publish; they have not been verified on the live domain after publication.

## B. Before and after

Fares below were read from the live display fare engine, not hardcoded. Stored records use `{{from_fare}}`, resolved from the lowest positive publishable vehicle fare on render. The city-centre guide uses the same engine. Loch Ness is quoted on request, so no unrelated tour starting price is claimed. Flight tracking wording requires the customer to add their flight number. Headings, canonical addresses, page bodies and indexability were not changed.

### /blog/loch-ness-day-trip-from-edinburgh

**Title before:** Loch Ness Day Trip from Edinburgh | Cabslink

**Title after:** Loch Ness Day Trip from Edinburgh: Private Tour Cost (52 characters)

**Description before:** Plan a Loch Ness day trip from Edinburgh with a private driver: what the journey involves, where tours stop, and how to book your day out.

**Description after:** Around 3.5 hours each way. Loch Ness private day trips are priced on request for your hours and stops. Plan your route and request a fixed quote. (145 characters)

### /routes/glasgow-airport-to-loch-lomond

**Title before:** Glasgow Airport to Loch Lomond Taxi | Fixed Price Transfer

**Title after:** Glasgow Airport to Loch Lomond Taxi from £59.50 (47 characters)

**Description before:** How much is a taxi from Glasgow Airport to Loch Lomond? Fixed prices by vehicle class, flight tracking and no meter. Book online with Cabslink.

**Description after:** Glasgow Airport to Balloch, Loch Lomond: about 35 minutes. Taxi from £59.50, fixed price, no meter. Add your flight for tracking. Book online. (142 characters)

### /blog/airport-to-st-andrews-full-transfer-guide

**Title before:** Edinburgh Airport to St Andrews: Transfer Prices | Cabslink

**Title after:** Edinburgh Airport to St Andrews Taxi Cost from £108.90 (54 characters)

**Description before:** Edinburgh Airport to St Andrews in about 80 minutes. Fixed transfer fares from around £110, tips for golf bags, student travel and the return trip.

**Description after:** Edinburgh Airport to St Andrews: taxi from £108.90, about 80 minutes. Fixed price, no meter. Add your flight for tracking. Get a quote. (135 characters)

### /routes/edinburgh-airport-to-city-centre

**Title before:** Edinburgh Airport to City Centre Taxi | Cabslink

**Title after:** Edinburgh Airport to City Centre Taxi from £42 (46 characters)

**Description before:** Edinburgh Airport to city centre taxi: around 10 miles and 33 minutes. Compare live vehicle fares and get a fixed quote for your exact hotel or address.

**Description after:** Edinburgh Airport to city centre in about 33 minutes. Taxi from £42, fixed price, no meter. Add your flight for tracking. Get your quote. (137 characters)

### /blog/glasgow-to-edinburgh-best-ways-to-travel

**Title before:** Glasgow to Edinburgh: Train, Bus or Private Car? | Cabslink

**Title after:** Glasgow to Edinburgh: Train, Bus & Private Taxi Costs (53 characters)

**Description before:** Glasgow to Edinburgh by train, coach, car or private driver: journey times, costs and the best option for airports, luggage and match days.

**Description after:** Compare train, coach and private taxi costs for the 47-mile Glasgow to Edinburgh journey. Choose your route and get a fixed-price, no-meter quote. (146 characters)

### /guides/edinburgh-airport-to-city-centre

**Title before:** Edinburgh Airport to City Centre: Tram, Bus or Taxi

**Title after:** Edinburgh Airport to City Centre: Taxi, Tram & Bus Costs (56 characters)

**Description before:** Tram £7.90, Airlink bus £6.00 or a fixed-price taxi — real fares, times and first/last departures for getting from Edinburgh Airport into the city centre.

**Description after:** Compare bus, tram and taxi costs. Private taxi from £42, about 33 minutes, fixed price, no meter. Add your flight for tracking. Get a quote. (140 characters)

The homepage title and description are unchanged. Stored page/blog edits apply to the shared database immediately; code-dependent token substitution and cache changes reach the published site on the next publish.

## C. Bristol Airport, report only

Both published and preview pages returned HTTP 200, `index,follow` and the self-canonical `https://cabslink.com/airports/bristol-airport`. The title, H1, description and visible text remained unchanged, with 1,257 total visible words and the complete local travel guide. The booking form, information sections, guide, FAQ and footer are present. Browser checks found no page errors. No Bristol edits were made. No evidence of content loss in current live/preview comparison; this does not establish the reason for the historical impressions drop.

## Verification

360 tests passed across 9 relevant test files. Automatic build passed. Browser checked city-centre route, St Andrews blog and Bristol Airport, with no page errors. Nothing published.
