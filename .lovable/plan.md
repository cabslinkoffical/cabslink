
# CabsLink SEO Architecture (Scaffolding Only — No Pages)

This plan builds the scalable substrate that will later power 1,550+ destinations. No content is generated, no pages are seeded, no admin CMS is expanded. Existing tables (`seo_locations`, `seo_airports`, `seo_popular_routes`, `seo_services`, `seo_pages`, `seo_redirects`, `seo_page_sections`) stay in place and continue to power the current admin CMS — we ADD a canonical layer on top rather than migrate destructively.

---

## 1. Canonical Destinations Model (Source of Truth)

One table becomes the single source of truth for every searchable place. All current SEO tables continue to work; this new table is what routing, sitemap, search, and booking dropdowns will read from going forward.

**New table: `destinations`**

Fields (domain-specific only; standard id/created_at/updated_at omitted):

- `type` — enum: `location | route | airport | station | cruise_port | university | hospital | corporate | attraction | distillery | business_park | service | guide | region | council`
- `slug` (unique within type)
- `name`, `display_name`, `short_name`
- `country` (default `GB`), `region`, `council`, `town` — geographic hierarchy
- `parent_id` — self FK for hierarchy (Country → Region → Council → Town → Destination)
- `lat`, `lng` — numeric(9,6)
- `place_id` — Google Place ID (nullable, indexed)
- `keywords text[]`, `synonyms text[]` — powers search & AEO entity matching
- `nearby_ids uuid[]` — cached neighbours (populated by background job later)
- `popular_route_ids uuid[]` — related routes
- `related_service_ids uuid[]`
- `seo_tier smallint` — `1=Indexed, 2=Hub-only, 3=Search-only, 4=Future/Draft`
- `noindex bool`, `active bool`
- `search_vector tsvector` (generated) + trigram index — powers `/search` and booking dropdowns
- `linked_page_id uuid` — nullable FK to `seo_pages` (for Tier 1 records that have an editorial page)

Constraints:
- Unique `(type, slug)`
- Partial unique index on `place_id` where not null
- Check: Tier 1 requires `linked_page_id IS NOT NULL`
- Trigger: seo_tier changes are logged to `activity_logs`

RLS:
- `SELECT` to `anon` where `active AND seo_tier <> 4` — powers booking dropdowns / search on public site
- Full CRUD to admin via `has_role(auth.uid(),'admin')`

**No page generation.** Rows exist so search, sitemap, and internal-link resolvers know a destination is real; whether it has a rendered page is a separate decision (Tier 1 only).

---

## 2. Routing Contract

Only these top-level segments are permitted:

```text
/                     home
/services/            hub + /services/$slug
/areas/               hub + /areas/$slug        (renamed from /locations)
/routes/              hub + /routes/$slug
/airports/            hub + /airports/$iata
/stations/            hub + /stations/$slug
/cruise-ports/        hub + /cruise-ports/$slug
/universities/        hub + /universities/$slug
/hospitals/           hub + /hospitals/$slug
/corporate/           hub + /corporate/$slug
/attractions/         hub + /attractions/$slug
/distilleries/        hub + /distilleries/$slug
/guides/              hub + /guides/$slug
```

Any legacy URL (`/locations/*`, old airport paths) is served via `seo_redirects` 301 → new path.

Every leaf route uses ONE shared component `<DestinationPage />` that resolves against `destinations` by (type, slug). Rendering path:

- Tier 1 → renders full editorial page from `seo_pages` + `seo_page_sections`
- Tier 2 → renders "hub" mini-page: name, map, related services, popular routes, booking widget, internal links only. `robots: index, follow`. No thin duplicate paragraphs — hub template is intentionally sparse (H1 + facts + widget + links).
- Tier 3 → hard 404 with `noindex`. Record still returned by search and booking dropdowns.
- Tier 4 → hard 404 for the public. Admin preview only.

**No route file is generated per destination.** The 12 dynamic route files above cover everything.

Nothing else is routable. Homepage / booking / fleet / tours / legal remain as-is.

---

## 3. SEO Component Library

Shared components (single implementation, reused everywhere) under `src/components/seo/`:

- `<Canonical />` — absolute canonical URL from request origin server-fn
- `<Breadcrumbs />` — visual + JSON-LD `BreadcrumbList`, derived from destination hierarchy
- `<FaqBlock />` — visual accordion + `FAQPage` JSON-LD
- `<SpeakableBlock />` — wraps summary sections, emits `speakable` schema
- `<EntityBox />` — semantic HTML entity card for AEO (name, type, region, coords)
- Schema emitters (function-only, no UI): `organizationSchema`, `websiteSchema` (with `SearchAction`), `localBusinessSchema`, `serviceSchema`, `airportSchema`, `touristAttractionSchema`, `travelActionSchema`.

`__root.tsx` head emits Organization + WebSite + SearchAction once. Leaf routes emit only their own schema. No duplicate `og:image` on root.

---

## 4. Sitemap

`src/routes/sitemap[.]xml.ts` becomes a sitemap **index** that references sub-sitemaps by type:

```text
/sitemap.xml                → index
/sitemaps/core.xml          → static routes
/sitemaps/services.xml
/sitemaps/areas.xml
/sitemaps/routes.xml
/sitemaps/airports.xml
/sitemaps/stations.xml
… (one per type)
/sitemaps/guides.xml
```

Each sub-sitemap queries `destinations` with `seo_tier=1 AND active AND NOT noindex` for its type. Tier 2/3/4 are never emitted. `lastmod` uses `destinations.updated_at` (real per-row timestamp). Cache header `public, max-age=3600`. 50k URL cap per sub-sitemap is enforced by pagination (`.n.xml` suffix if needed).

---

## 5. Global Search

One server function `searchDestinations({ q, types?, limit })`:

- Uses `search_vector` (weighted: name A, synonyms B, keywords C, region/council D) with trigram fallback for typos
- Returns rows regardless of tier (Tier 3/4 still findable) — result payload carries `hasPage: boolean` and `href: string | null`
- Rate-limited per IP (30/min), no PII

Two consumers share it:
1. `/search` public page — shows results with pageable links only for `hasPage=true`; others render inline detail card with "Book to this location" CTA.
2. `<PlaceAutocomplete />` and booking dropdowns — same server fn, filtered to types the booking flow accepts.

Booking never requires an indexed page — a Tier 3 village is bookable through the same widget.

---

## 6. Internal Linking (Depth ≤ 4)

Deterministic linker `src/lib/internal-links.ts` reads `destinations`:

- Home links to hubs (`/services`, `/areas`, `/routes`, `/airports` …) — depth 1
- Hub → Region cards → Council cards → Destination — depth 2/3/4
- Every Tier 1 page auto-renders three link modules: `Popular routes from here` (from `popular_route_ids`), `Nearby destinations` (from `nearby_ids`), `Related services` (from `related_service_ids`)

No orphan Tier 1 record can exist: publication guard rejects publish when the destination has no incoming internal link source.

---

## 7. Publication & Content Integrity Guards

`destinations_publish_guard` trigger enforces (Tier 1 only):
- `linked_page_id` set, page `publication_status='published'`
- `seo_title`, `meta_description`, `h1` present (already enforced by existing `seo_pages_publish_guard`)
- Not orphan (linker check)
- Content-hash uniqueness against other published pages (rejects duplicate intros; extends existing `seo_find_similar_pages`)

Tier 2/3/4 have no content, so no content checks apply.

---

## 8. Performance Contract

- All leaf routes: loader uses `ensureQueryData`; component uses `useSuspenseQuery`; router `defaultPreloadStaleTime=0` already set.
- LCP image preload declared in each Tier 1 route's `head().links`.
- No new client dependencies. Schema is emitted as JSON-LD scripts (no runtime library).
- `<DestinationPage />` is code-split by TanStack automatically.
- Hub pages render <20 KB HTML; Tier 1 pages target <100 KB critical path.

No admin UI, no image library, no media pipeline is added. Everything reuses existing admin surfaces.

---

## 9. What Gets Built vs Left Alone

**Built this phase (scaffolding):**
1. Migration: `destinations` table + indexes + RLS + publish guard + triggers
2. `src/lib/destinations.functions.ts` — public list/get/search server fns
3. `src/lib/internal-links.ts` — deterministic link resolvers
4. `src/components/seo/` — Canonical, Breadcrumbs, FaqBlock, SpeakableBlock, EntityBox, schema emitters
5. `src/components/site/DestinationPage.tsx` — shared renderer (Tier 1 / Tier 2 / 404 branching)
6. 12 dynamic route files at the paths listed in §2 (each is a 10-line file delegating to `DestinationPage`)
7. Sitemap index + per-type sub-sitemaps at `/sitemaps/$type.xml`
8. `/search` route + shared `searchDestinations` server fn
9. `src/start.ts` global 301 for legacy `/locations/*` → `/areas/*` via existing `seo_redirects`

**Explicitly NOT built:**
- No destination rows are inserted
- No `seo_pages` content is authored
- No admin CMS pages are added (existing `/admin/seo/*` continues to manage editorial pages; a later phase will add a lightweight `destinations` admin only if needed)
- No image assets are generated
- No route file per destination

---

## Technical Details

- `destinations.search_vector` is `GENERATED ALWAYS AS (setweight(to_tsvector('english', name), 'A') || setweight(to_tsvector('english', array_to_string(synonyms,' ')), 'B') || setweight(to_tsvector('english', array_to_string(keywords,' ')), 'C') || setweight(to_tsvector('english', coalesce(region,'') || ' ' || coalesce(council,'') || ' ' || coalesce(town,'')), 'D')) STORED`
- Indexes: GIN on `search_vector`, GIN on `keywords`, GIN on `synonyms`, btree on `(type, seo_tier, active)`, btree on `slug`, trigram on `name`
- Sub-sitemaps use streaming XML build to keep memory bounded at 50k URLs
- All destination server fns are unauthenticated public functions using the server publishable client (never admin) — RLS enforces tier gating
- Route files use `createFileRoute` with `head()` deriving title/description/og from loader data; Tier 2 emits `robots: index,follow` with generic short description; Tier 3 emits `robots: noindex` in the 404 branch
- New tables get GRANT `SELECT` to anon (search/sitemap need it), full CRUD to authenticated admin via RLS, `ALL` to service_role

---

## Sequencing

1. Migration (destinations + indexes + guards + RLS + GRANTs)
2. Server fns + internal-links resolver
3. SEO component library + schema emitters
4. `DestinationPage` + 12 dynamic route files
5. Sitemap index + sub-sitemaps
6. `/search` page + booking dropdown wiring
7. Legacy redirects wired via `seo_redirects`

At the end of this phase the app renders identically to today (no destinations exist yet, so all 12 new dynamic routes serve 404 for any slug). The scaffolding is ready to accept the 1,550 destinations later, one row at a time, with zero code changes required to add them.
