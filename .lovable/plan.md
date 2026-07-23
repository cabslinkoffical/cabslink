# Final Production Completion Plan

This is a large multi-batch effort. I'll execute it in sequential batches, verifying between each. No UI redesign, no duplicate templates, reuse existing architecture.

## Batch 1 — Audit & Cleanup (foundation)
- Run typecheck + build; capture broken routes, hydration warnings, TS errors, console errors.
- Grep for: unused components, mock/placeholder text (`Lorem`, `TODO`, `placeholder`), duplicate templates, orphaned files.
- Remove dead code: unused route files, duplicate page layouts, unused DB queries.
- Fix any broken internal links found by scanning `<Link to=`.
- Deliverable: clean build, zero TS errors, list of removals.

## Batch 2 — Content Governance System
New table `seo_page_quality` (or column on `seo_pages`) with:
- `quality_score` (0–100, computed)
- `tier` (1 index / 2 conditional / 3 noindex / draft)
- signals: unique_content_len, internal_links_count, has_schema, has_local_info, has_faqs, metadata_complete, entity_coverage

Scoring function (SQL + TS helper in `src/lib/seo-quality.ts`):
```
score =
  25 (unique body > 800 chars)
+ 15 (>= 5 internal links)
+ 15 (valid JSON-LD)
+ 15 (local info: nearby, coords, council)
+ 10 (>= 3 FAQs)
+ 10 (title+desc+og complete)
+ 10 (linked entities: airports/areas/routes)
```

Tier logic:
- ≥80 → Tier 1 (index)
- 60–79 → Tier 2 (index if metadata complete)
- 40–59 → Tier 3 (noindex, crawlable)
- <40 → Draft (excluded from sitemap + robots noindex)

Auto-apply in `head()` builders and `sitemap.xml` route.

## Batch 3 — Reusable Content Architecture
Ensure ONE template per entity family reused everywhere:
- `EntityPage` (already have `AreaLocationPage`) — extend to accept `entityType` prop for Airports / Universities / Hospitals / Hotels / Attractions / Distilleries / Business Parks / Cruise Ports / Stations / Golf / Castles / Beaches / Venues.
- Delete any per-type duplicate templates found in audit.
- Route-page template: `RoutePage.tsx` for `/routes/$from-to-$to`.

## Batch 4 — Route SEO Pages
- Migration: seed `seo_popular_routes` with top ~40 high-value airport → city pairs.
- Route file `src/routes/routes.$slug.tsx` using `RoutePage` template with: distance, duration, pickup/dropoff info, vehicle recs, luggage, M&G, flight monitoring, related routes, nearby destinations, FAQs, TaxiService+FAQPage+Breadcrumb schema.
- Distance/duration from cache; fall back to Google Routes API.

## Batch 5 — Internal Linking Engine
`src/lib/internal-linking.ts`:
- `getRelatedForEntity(entity)` returns: parent area, nearby areas, nearby destinations, related routes, related services, nearby airports/hotels/universities/hospitals/stations/attractions, relevant guides + blogs.
- Wire into `AreaLocationPage`, `RoutePage`, blog posts.
- Guarantee: every page has ≥8 outbound internal links → no orphans.

## Batch 6 — 10 Published Blogs
Insert 10 high-quality Scotland-transfer-focused posts via migration:
1. Edinburgh Airport Transfer Guide 2026
2. Glasgow to Edinburgh: Best Ways to Travel
3. Whisky Trail Private Tour Itinerary
4. North Coast 500: How to Plan by Private Car
5. Edinburgh Airport Meet & Greet Explained
6. Corporate Travel in Scotland: A Complete Guide
7. Cruise Transfers from Edinburgh & Glasgow
8. Best Time to Visit Isle of Skye + Transport Options
9. Group Travel Scotland: Vans, Coasters, Coaches
10. Airport to St Andrews: Full Transfer Guide

Each: 1000+ words, structured sections, 5+ internal links, FAQs, Article+FAQ+Breadcrumb schema, cover image, category, tags, author.

## Batch 7 — AEO/GEO, EEAT, Structured Data, Metadata
- Reusable `<FaqBlock>` with FAQPage schema — add to every entity/route/blog page.
- `<QuickAnswers>` component for concise AEO snippets (cost, duration, booking, flight monitor, M&G, child seats, executive, groups).
- Ensure every leaf route has unique title/desc/canonical/og/twitter/H1/breadcrumbs.
- Single source-of-truth schema helpers in `src/lib/schema.ts`; audit removes duplicates.

## Batch 8 — Search
Upgrade `/search` (or global search) to grouped SSR results across all entity types via a single `search_all` server fn hitting existing search vectors.

## Batch 9 — Sitemap & Robots
- Rebuild `/sitemap.xml` server route to include only Tier 1 + qualifying Tier 2 pages across all entities + blog + routes.
- `robots.txt` verified; no leaked private paths.

## Batch 10 — Performance
- Audit oversized client bundles; lazy-load heavy components (maps, carousels).
- Ensure images use `loading="lazy"` + width/height.
- Confirm no client-only rendering for indexable content.

## Batch 11 — Final Verification Report
Automated checks:
- `bun run build` clean
- Playwright crawl of top routes → 0 404s, 0 hydration warnings, 0 console errors
- Sitemap parse → all URLs 200
- Schema validator on 10 sample pages
- Report delivered as `.lovable/production-audit.md`

## Technical Details
- All new DB objects via `supabase--migration` with GRANTs + RLS.
- No new UI/design work; existing components reused.
- New server logic uses `createServerFn` (not edge functions).
- Quality scoring runs as SQL function + trigger on `seo_pages` insert/update so tier stays fresh.
- Blog inserts run in a single migration; images use existing generated assets or Unsplash-safe stock references already in codebase.

## Approval
This will take multiple execution turns. **Confirm to proceed**, and I'll start with Batch 1 (audit & cleanup) and report findings before continuing. If you'd like me to reorder (e.g. blogs first), say so.
