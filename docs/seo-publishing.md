# CabsLink SEO Publishing Engine — Operator Guide

> **Accuracy note (read first).** This guide describes the `destinations`
> pipeline only, and the server functions it names live in
> `src/lib/seo/import.functions.ts` / `src/lib/seo-quality.functions.ts` —
> there is no `publishing.functions.ts`.
>
> **Route (`/routes/*`) pages are NOT in this pipeline.** They are
> facts-gated code records in `src/lib/seo/journeys.ts`, mirrored by a
> `seo_pages` row (`city_to_city_route` / `airport_route`) plus a
> `seo_popular_routes` row that stores the real cached distance and duration.
> A journey marked `review: true` renders for sign-off but is kept out of the
> sitemap and the `/routes` index and is served `noindex,follow`. Fares shown
> on those pages come from the live engine via
> `src/lib/seo/route-fares.functions.ts` — never hardcode a price.

Everything a destination needs to become an indexable page lives in **one row**
of the `destinations` table plus a small set of shared modules. There is no
per-page CMS work, no template duplication, and no path that lets low-quality
content leak into Google.


## The four tiers

| Tier | Meaning | Rendered? | In sitemap? | Robots |
|------|---------|-----------|-------------|--------|
| 1 | Indexed | Yes, full template | Yes | `index,follow` |
| 2 | Hub only (in-app browsing) | Yes, sparse | No | `noindex,follow` |
| 3 | Booking database only | No (loader 404s) | No | n/a |
| 4 | Draft / future opportunity | No | No | n/a |

Only Tier 1 rows appear in `/sitemaps/{type}.xml`. Everything under Tier 1
is served with `noindex` automatically.

## How new destinations get published — safe path

```
   CSV / JSON    →   importDestinationsDryRun()   →   review outcomes
                     (no writes, just validation)      per row
                                                             │
                                                             ▼
                     bulkImportDestinations()   →   rows saved as Tier 4 Draft
                     (auto-downgrades Tier 1        with noindex=true
                     rows that fail quality)
                                                             │
                                                             ▼
             evaluateDestinationQuality(id)   →   report per row
                                                             │
                            (fix missing fields in the row where required)
                                                             │
                                                             ▼
                     publishDestination(id)   →   Tier 1 iff quality ≥ 70
                                                    otherwise the call refuses
```

All four calls are `createServerFn`s in `src/lib/seo/publishing.functions.ts`
and require an authenticated admin (`has_role(auth.uid(), 'admin')`).

### 1. Dry-run first — always

`importDestinationsDryRun({ rows })` validates each row with Zod, checks for
in-batch duplicates, checks for existing `(type, slug)` conflicts, and runs
the quality evaluator against the proposed shape. It returns:

```ts
{ index, type, slug, status: "new" | "update" | "duplicate" | "invalid",
  quality: { score, missing, meetsThreshold }, errors }
```

Nothing is written. If a batch of 1,000 rows produces 30 `invalid` entries and
120 `update`s you didn't expect, you find out here — not in Search Console.

### 2. Bulk import saves as Draft by default

`bulkImportDestinations({ rows })` upserts by `(type, slug)`. Rows requesting
Tier 1 that fail the quality threshold are **automatically downgraded to Tier 4**
so you cannot ship a thin page by mistake. The response tells you how many
rows were `inserted`, `updated`, `downgraded`, and `skipped`.

### 3. Enrich, then promote

Enrichment happens by editing the row in place — filling `nearby_ids`,
`popular_route_ids`, `related_service_ids`, `keywords`, and any type-specific
`meta` (e.g. airport `iata`, route `from_name`/`to_name`/`distance_km`,
attraction `category`/`visit_time`, service `summary`).

Call `evaluateDestinationQuality({ id })` to see exactly what is missing.

When the row scores ≥ 70, call `publishDestination({ id })`. The server
re-runs the evaluator; if it doesn't pass, the call refuses. Pass `force: true`
only for very deliberate one-offs — the quality check exists precisely so
scaled content abuse cannot ship.

### 4. Rolling back is one call

`unpublishDestination({ id, targetTier: 2 | 3 | 4, reason })` demotes a page.
The sitemap loses it on the next fetch (max-age is 1 hour); the leaf route
starts serving `noindex,follow` immediately.

## Quality rules (`src/lib/seo/quality.ts`)

- 40 pts for having every **type-required** field (route needs from/to,
  airport needs IATA + coordinates, guide needs a body, etc.).
- 60 pts of enrichment: coordinates, keywords, ≥3 nearby ids, ≥3 popular
  route ids, ≥2 related service ids, region+town both set, meta.summary ≥ 160
  chars.
- Threshold for Tier 1: **70/100**. Anything below is forced to `noindex`
  even if `seo_tier = 1` (defence in depth against manual tier flips).

## The unique content engine (`src/lib/seo/content-engine.ts`)

Every leaf page composes its sections from the row's structured data:

- **Summary** — 1 to 4 sentences, built from name/region/nearby/popular_routes.
  Two destinations never share a summary unless every input field matches.
- **Route action** — only for `route` rows with `from_name` + `to_name`.
- **Facts / geo context** — only when at least two location parts exist.
- **Airport info / attraction info** — only when those `meta` fields exist.
- **Popular routes / nearby / related services** — only if the id arrays are
  populated.
- **FAQ** — questions are conditional on data (e.g. airport meet & greet
  question only on airports; route pricing question only on routes).

If a section has no data, it is dropped. No filler, no spun copy, no doorway
paragraphs.

## Auto-SEO (`src/lib/seo/auto-seo.ts`)

`buildAutoHead(loaded)` produces the complete head payload for every leaf:

- Type-aware title and description
- Canonical URL bound to the destination's `destinationHref`
- Open Graph (`og:type` = `article` for guides, else `website`) + Twitter card
- Robots directive derived from the quality evaluator — no way to publish an
  indexable head for a low-quality row
- JSON-LD `@graph`: `Organization` + `WebSite` (with `SearchAction`) +
  `BreadcrumbList` + one of `LocalBusiness` / `Airport` / `TouristAttraction`
  / `Service` / `TravelAction` (per template registry) + `FAQPage` if the
  content engine produced any FAQs + `SpeakableSpecification`

## Adding a brand-new destination type

1. Add the type to `DESTINATION_TYPES` in
   `src/lib/destinations.functions.ts` and update `destinationHref` +
   `HUB_SEGMENTS` + `HUB_LABELS`.
2. Add a `TEMPLATES` entry in `src/lib/seo/template-registry.ts` — hub label,
   title/description templates, JSON-LD emitters, allowed sections.
3. Add a quality spec in `src/lib/seo/quality.ts` describing type-required
   fields.
4. Create the hub route (`/{segment}/index.tsx`) and leaf route
   (`/{segment}/$slug.tsx`) — both files are ~30 lines and only wire the
   loader and `buildAutoHead`.
5. Add the segment to `PUBLIC_ROUTES` in `src/lib/sitemap-routes.ts` and to
   the type list in `src/routes/sitemap[.]xml.ts`.

No layout changes, no per-page template work.

## What NOT to do

- Don't hand-author a page under `src/routes/` for a specific destination.
  Add a row to `destinations` instead.
- Don't backfill `nearby_ids` / `popular_route_ids` with random ids to hit
  the threshold — the FAQ + link modules render them; nonsense will show.
- Don't set `seo_tier = 1` directly in SQL. Use `publishDestination` so the
  quality gate runs.
- Don't add a new URL prefix outside the twelve declared segments. Search
  engines need one canonical structure.
- Don't reverse-generate routes (e.g. auto-creating `B → A` for every `A → B`).
  Create the reverse row only if user search intent is genuinely different.
