## Scotland Locations Explorer — Plan

Goal: a single discovery hub at `/explore` (plus regional and category sub-hubs) that navigates the entire `destinations` table through reusable components and templates. No 1,550-item page; smart directory that scales.

### Architecture

```
/explore                    → Locations Explorer (hero + search + A–Z + regions + categories + popular)
/explore/region/$slug       → Regional Hub (towns, routes, airports, attractions, universities, hospitals)
/explore/category/$type     → Category hub (aliases existing /airports, /stations, etc.)
/explore/a/$letter          → A–Z bucket page
Existing leaf routes (/areas/$slug, /airports/$iata, /routes/$slug, …) unchanged — Explorer links into them.
```

Everything reads from `destinations` + `destination_relationships` + `taxonomy_*`. No hardcoded lists.

### Reusable components (new, in `src/components/explore/`)

- `ExploreHero` — title, subtitle, search
- `InstantSearch` — client-side fuzzy over `search_bookable_destinations` RPC (already exists), debounced, grouped results by type
- `AlphaBar` — A–Z chips linking to `/explore/a/$letter`
- `RegionGrid` — cards (name, location count, popular towns, airport chips, CTA)
- `CategoryGrid` — one card per destination type with counts + icons
- `PopularLocations`, `PopularRoutes` — top-N by `seo_tier` then `name`
- `EntityCard`, `LocationCard`, `RouteCard` — variants of a single base card
- `RelatedGrid` — reuses `LinkModuleList`
- `FAQBlock`, `Breadcrumbs`, `CTABanner` — already exist or thin wrappers

### Reusable page templates

Refactor `DestinationPage.tsx` into a `<EntityTemplate />` that composes sections from `template-registry.ts` (already the pattern). Add missing sections: `nearby_attractions`, `nearby_universities`, `nearby_hospitals`, `nearby_stations`, `related_guides`, `reviews` (stub if no reviews yet). Each section pulls from `destination_relationships` by `link_type`.

### Server functions (new in `src/lib/explore.functions.ts`)

- `getExploreOverview()` — regions with counts, top categories, popular locations, popular routes (single query using group-bys)
- `getRegionHub({ slug })` — region + towns + related airports/attractions/etc via relationships
- `getAlphaBucket({ letter })` — paginated list by first char
- `searchDestinations({ q, types? })` — thin wrapper over existing RPC

All are read-only, cached via TanStack Query with generous `staleTime`.

### Routes to add

```
src/routes/explore.index.tsx
src/routes/explore.region.$slug.tsx
src/routes/explore.category.$type.tsx
src/routes/explore.a.$letter.tsx
```

Each with its own `head()` (title/desc/og) — Tier-1 canonicals only on region + category hubs; letter buckets `noindex, follow` to keep crawl focused.

### Internal linking

- Header + Footer gain a top-level "Explore Locations" link to `/explore`.
- Every leaf destination page already renders `LinkModuleList`; extend `internal-links.ts` to also emit "Nearby universities/hospitals/stations/attractions" modules pulled from `destination_relationships` by `link_type`.

### SEO

- `/explore` sitemap entry (core sitemap).
- Region hubs added to a new `sitemaps/regions.xml` shard.
- Category hubs already covered by existing hub sitemaps.
- Letter buckets excluded from sitemaps + `noindex`.

### Out of scope this turn

- Reviews data model (render empty state only).
- Recently viewed (localStorage add-on — small, can bolt on after core lands).
- New leaf templates for entity types that don't yet have a route file; those stay draft until you promote them.

### Technical details

- Uses existing `destinations`, `destination_relationships` (`link_type` enum: nearby, nearest_airport, nearest_station, nearest_hospital, nearest_university, serves, belongs_to), and `search_bookable_destinations` RPC.
- Counts computed with `select('id', { count: 'exact', head: true })` per region — cached 1h.
- Instant search runs client-side against RPC; no autocomplete server-fn added.
- All new routes use `ensureQueryData` + `useSuspenseQuery` per the template convention.

Ship order: (1) server fns + queries, (2) reusable Explore components, (3) 4 routes, (4) header/footer link + sitemap, (5) extend `internal-links.ts` for the new nearby modules.
