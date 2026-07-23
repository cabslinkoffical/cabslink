# CabsLink — Production Readiness Phase 3

Objective: finish every remaining production gap so no page is empty, every route has SEO+schema, search works site‑wide, mobile is polished, and there is zero mock data. Delivered as a single coordinated sweep with a final Production Readiness Report.

## Execution order

Big up-front decision: build one **shared "authoritative location page" renderer** and reuse it for airports, corporate parks, distilleries, and any future entity type. This is the only way to hit 1,550 destinations without maintenance pain.

```text
DestinationTemplate (shared)
 ├── Hero (name, region, breadcrumbs, hero image)
 ├── Overview (auto-generated from destination row)
 ├── Entity-specific block  (Airport / Corporate / Distillery / Attraction)
 ├── Transfer info + pricing CTA (BookingWidget prefilled)
 ├── Nearby: towns / hotels / stations / universities / attractions / hospitals
 ├── Popular routes to/from this destination
 ├── Related services + related guides
 ├── FAQ (type-specific defaults, override from destination_seo.faqs)
 └── JSON-LD (Breadcrumb + WebPage + type-specific: Airport / LocalBusiness / TouristAttraction / TaxiService)
```

Everything below plugs into that renderer.

---

## 1. Airport pages — `/airports/$iata`

- Stop depending on `seo_pages` being populated.
- Loader: try `seo_pages` first; on miss, build a fallback context from `destinations` (type=`airport`), `seo_airports` if present, and taxonomy relationships.
- Sections: Overview, Transfer info, Pickup zones, Drop-off, Meet & Greet, Flight monitoring, Popular routes, Nearby towns/hotels/universities/stations/attractions/hospitals, FAQ.
- Schema: `Airport` + `TaxiService` + `FAQPage` + `BreadcrumbList`.
- Seed the 6 UK airports we already need (EDI, GLA, ABZ, INV, PIK, MAN) in `destinations` with lat/lng so nearby queries work.

## 2. Corporate transfers — `/corporate` and `/corporate/$slug`

- New `destination_type` values already exist as `business_park`; use that.
- Seed 6 parks: Edinburgh Park, Gogarburn, BioQuarter, Quartermile, Eurocentral, Rosyth Dockyard.
- Index page: card grid grouped by city.
- Detail page uses `DestinationTemplate` with a Corporate block (executive travel, chauffeur options, business travel, no fake partnerships — just "Companies in the area" pulled from destination metadata).
- Schema: `LocalBusiness` (the park) + `TaxiService` + `FAQPage` + `BreadcrumbList`.

## 3. Distilleries — `/distilleries` and `/distilleries/$slug`

- Reuse `destinations` with type `attraction` and a `subtype=distillery` tag (via `destination_tags`).
- Index groups by region (Speyside, Islay, Highland, Lowland, Campbeltown, Islands).
- Detail sections: About, Tours, Airport transfers, Whisky tours, Nearby attractions/accommodation, FAQs.
- Schema: `TouristAttraction` + `TaxiService` + `FAQPage` + `BreadcrumbList`.

## 4. Guides / Resources hub

We already have `/blog` with categories/tags. Add `/guides` as an alias route that filters `blog_posts` where `category.kind = 'guide'` (add `kind` column: `article | guide`). Category & tag routes reused. Adds:
- Featured shelf (posts flagged `is_featured`)
- Search (client + server) with pagination
- Breadcrumbs, related articles (by tag), related services, related locations (from `blog_post_destinations` join)

## 5. Site-wide search — `/search`

- SSR loader, URL-driven (`?q=`, `?type=`, `?page=`).
- Server function `searchEverything({ q, types, limit })` unions:
  areas, routes, airports, universities, hospitals, attractions, hotels, stations, cruise ports, distilleries, business parks, guides.
- Uses existing `destinations.search_vector` + trigram fallback + `blog_posts` FTS.
- Grouped results UI with counts, tabs, keyboard nav, empty-state = suggested popular destinations.

## 6. Remove every empty state

Replace "No results / Coming soon / Empty" globally with a shared `<HelpfulEmpty />` component that always renders:
- 6 nearby destinations (by lat/lng or region)
- 4 popular searches
- Related services (Airport transfer, Tours, Corporate)
- Contact CTA
Audit callers: booking search, `/areas/*`, `/blog/*`, admin lists (admin keeps plain empty), `/tours`, `/fleet`.

## 7. Internal linking audit

- Every `DestinationTemplate` page emits: 6 nearby, 6 popular routes, 3 related guides, 3 related services.
- Add "You might also like" strip at the bottom of every leaf route.
- Add a build-time orphan check script that fails CI if any published destination has zero inbound internal links (writes report to `/tmp/orphan-report.txt`).
- Max depth: Home → Category → Location → Route (enforced by breadcrumb builder).

## 8 + 9. SEO + Schema audit

- New `buildRouteHead(entity)` helper that guarantees: unique title, meta description, canonical, single H1, OG + Twitter, breadcrumbs, robots, correct JSON-LD by type, sitemap eligibility flag.
- Extend `sitemap-*.xml.ts` shards to include airports, corporate, distilleries, guides.
- Dedupe JSON-LD emitters (currently some pages emit both a page-level and section-level `BreadcrumbList`).
- `noindex` for tier‑3 destinations and thin pages (<500 chars body).

## 10. Performance

- Convert remaining eager images to `loading="lazy"` + `decoding="async"`, add `fetchpriority="high"` only on the LCP hero of each route.
- Preload LCP image via route `head().links`.
- Split heavy admin routes with dynamic imports.
- Verify font loading uses `font-display: swap` (already in `styles.css` — confirm).
- Turn on `route.staleTime` for read-mostly loaders to reduce refetch churn.
- Add `<link rel="preconnect">` for Google Maps + Supabase in `__root.tsx`.

## 11. Database audit

Remove/prune (migration):
- Empty demo rows in `seo_pages` that block airport rendering.
- Any `points_of_interest` marked inactive with no references.
- Unused `content_blocks` rows.
- Orphaned `blog_post_tags` and `destination_tags`.
- Keep schema; only clean data.

## 12. Mobile optimisation sweep

- Audit every route with viewport 375×812:
  Header (already pill), BookingWidget (already responsive — verify stops list on <sm), Booking flow steps, PriceBreakdown → sticky mobile bar, Fleet grid, Tours cards, Areas hub, Destination template, Admin (usable, not perfect).
- Enforce tap targets ≥44px, `h-dvh` instead of `h-screen` where relevant, safe-area padding for iOS notch on sticky CTAs.
- Wrap every text+widget header row in the `grid-cols-[minmax(0,1fr)_auto]` pattern to prevent overflow.

## 13. Final Production Readiness Report

At the end I output a single markdown report grouped by severity (Critical / High / Medium / Low) covering:
- Broken links / 404s / hydration errors / console errors
- Duplicate or thin pages
- Missing metadata / schema
- Orphan pages
- Indexable low-quality pages
- Zero mock components confirmation
- Lighthouse targets: Performance ≥95, Accessibility ≥95, Best Practices ≥95, SEO 100.

---

## Delivery plan (batched)

Because this is very large, I will ship it in **4 batches**, each self-contained and verified before moving on. You approve once; I ship all four sequentially.

**Batch A — Foundations (biggest, must land first)**
1. Migration: add `blog_categories.kind`, seed 6 airports + 6 business parks + ~15 distilleries in `destinations`, prune demo data, add `destination_tags` for distilleries.
2. Shared `DestinationTemplate`, `HelpfulEmpty`, `buildRouteHead`, `nearby` server fn.
3. Sitemap shards extended.

**Batch B — Entity routes**
4. `/airports/$iata` fallback + section blocks.
5. `/corporate` + `/corporate/$slug`.
6. `/distilleries` + `/distilleries/$slug`.

**Batch C — Content & search**
7. `/guides` hub + category/tag/detail.
8. `/search` SSR grouped results + `searchEverything` server fn.
9. Global empty-state replacement pass.

**Batch D — Polish & audit**
10. Mobile sweep across all routes.
11. Performance passes (lazy/preload/preconnect).
12. Internal-link + orphan audit script.
13. **Production Readiness Report** (markdown, severity-grouped, at `/mnt/documents/production-readiness.md`).

## Technical notes

- No new tables except a `kind` column on `blog_categories` and a `destination_subtype` on `destinations` (nullable). Everything else reuses existing entities via `type` + `destination_tags`.
- All new server fns follow the `.functions.ts` + `.server.ts` split; loaders read via `queryClient.ensureQueryData` per template rules.
- All new routes use `createFileRoute` with slash paths and per-route `head()` incl. og:image derived from destination hero when available.
- No hardcoded copy for entities — everything is generated from destination data via the shared template, so 1,550 destinations render without new code.
- Reports emitted to `/mnt/documents/` (never committed).

## What I need from you

Confirm you want all 4 batches shipped end-to-end (default: yes). If you'd rather see Batch A first and pause, say "Batch A only".