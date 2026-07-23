# CabsLink Content Hub — Implementation Plan

Goal: A production content hub that strengthens commercial pages (services, locations, routes, airports, universities, distilleries) and drives topical authority. Not an isolated blog.

## 1. Data Model (one migration)

New tables in `public`, with GRANT + RLS. `anon` gets SELECT on published rows only; `authenticated` write via admin `has_role('admin')`.

- `blog_categories` — id, slug, name, description, hero_image_url, seo_title, meta_description, sort_order, active
- `blog_tags` — id, slug, name
- `blog_authors` — id, slug, name, role, bio, avatar_url, links jsonb
- `blog_posts`
  - id, slug (unique), title, subtitle, excerpt, body_md (long), body_html_cache
  - category_id, author_id
  - featured_image_url, featured_image_alt
  - status enum('draft','review','scheduled','published','archived')
  - published_at, updated_at, last_reviewed_at, reading_minutes
  - seo_title, meta_description, og_image_url, canonical_override, robots_status
  - toc jsonb (array of {id,text,level}), faqs jsonb (array of {q,a}), key_takeaways jsonb (string[])
  - cluster_key text (e.g. `airport`, `university`, `scotland`), pillar boolean
  - related_service_slugs text[], related_location_slugs text[], related_route_slugs text[], related_post_ids uuid[]
  - views_count int default 0
- `blog_post_tags` — post_id, tag_id (M2M)
- Triggers: `set_updated_at`, `blog_posts_publish_guard` (require seo_title, meta_desc, category, featured_image, ≥600 chars body when publishing).
- Indexes on slug, status+published_at desc, category_id, cluster_key. Full-text on title+excerpt+body_md.

## 2. Routes (TanStack Start)

Public (all under `src/routes/`):

```
resources.tsx                       -> /resources (hub landing = redirect/alias to blog)
blog.tsx (layout)                   -> /blog (renders <Outlet />)
blog.index.tsx                      -> /blog (hub home)
blog.category.$slug.tsx             -> /blog/category/:slug
blog.tag.$slug.tsx                  -> /blog/tag/:slug
blog.$slug.tsx                      -> /blog/:slug  (individual post)
blog.search.tsx                     -> /blog/search?q=
rss[.]xml.ts                        -> /rss.xml (server route)
```

Redirect-friendly shortcuts (mount as thin route files that read `blog_posts.slug`):
- `/guides/$slug`, `/travel/$slug`, `/news/$slug`, `/airport-transfer-tips/$slug`, `/chauffeur/$slug` → resolve to same post if `category.slug` matches segment; else 301 to `/blog/$slug`. Keeps the "unique URL by cluster" pattern the brief lists.

Sitemap: extend `src/routes/sitemap[.]xml.ts` to include categories, tags with ≥1 post, and all published posts. Add `/rss.xml` and `Sitemap:` in robots.

## 3. Server functions (`src/lib/blog.functions.ts`)

All public reads via server-publishable client with narrow `TO anon` SELECT policies (published only). Writes via `requireSupabaseAuth` + `has_role('admin')` gate, using `supabaseAdmin` inside handlers.

- `listPosts({ category?, tag?, cluster?, q?, limit, offset, sort: 'newest'|'popular'|'updated' })`
- `getPost({ slug })` — returns post + author + category + tags + resolved related entities (services, locations, routes) via existing `destinations` lookups
- `listCategories()`, `getCategory({ slug })`
- `listTags({ minPosts?: number })`, `getTag({ slug })`
- `listFeaturedPosts()`, `listTrending()` (by views_count over 30d), `listByCluster({ cluster })`
- `incrementPostView({ id })` — rate-limited by IP hash

## 4. Individual post page (`/blog/$slug`)

Two-column desktop, single-column mobile.

Main column:
1. Breadcrumbs: Home / Blog / {Category} / {Title}
2. Category pill + reading time + published + updated dates
3. H1 title + subtitle
4. Author card (avatar, name, role)
5. Featured image (16:9, lazy, `fetchpriority=high` for LCP)
6. Quick summary card (2–3 sentence excerpt in gold-bordered box)
7. Table of Contents (auto-generated from H2/H3 with anchor jump links) — sticky on desktop when scrolled
8. Introduction → Main content (MD → HTML with heading anchors, callouts, cabslink shortcodes for CTA blocks)
9. Key Takeaways bullet list
10. FAQ accordion (drives FAQPage schema)
11. Related Blogs (same cluster/category)
12. Related Services + Related Locations + Related Routes (chips → real pages)
13. Bottom CTA card ("Book your transfer")
14. Social share row (Copy link, X, LinkedIn, WhatsApp, Email)

Sidebar (desktop only, sticky):
- Compact search
- Categories list with counts
- Popular articles (top 5 by views)
- Latest posts
- Related services (from post)
- Popular locations (top areas)
- Tags cloud
- Book CTA card

Head/Schema:
- title, description, canonical, og:*, twitter:*
- JSON-LD @graph: Article + BreadcrumbList + FAQPage (when faqs exist) + Speakable + Organization/WebSite from existing `src/components/seo/schema.ts`

## 5. Blog Home (`/blog`)

Sections in order:
1. Hero (navy → gradient with search box + primary CTA)
2. Latest Articles (grid of 6)
3. Featured Guides (pillar posts, cluster tiles with cover images)
4. Popular Categories grid (icon + count)
5. Trending Articles (top by views last 30d)
6. Popular Destinations (from `destinations` — cities/airports)
7. Popular Routes (from `destinations` type=route)
8. Recent Articles (paginated grid, 12/page, load more)
9. Newsletter CTA (email capture stored in existing `contact_messages` or new `newsletter_subscribers` — simple stub route; note: no email provider wired)
10. Sidebar on desktop (same as post sidebar)

## 6. Category & Tag pages

- Hero (category name, description, hero image)
- Filters: sort (newest/popular/updated), tag pills, search
- Post grid (12/page)
- Sub-section: Related services + Related locations (curated per category, static map in `src/lib/blog-cluster-links.ts`)
- Own SEO head + BreadcrumbList JSON-LD

## 7. Shared components (`src/components/blog/`)

- `PostCard.tsx` (image, category pill, title, excerpt, reading time, date, author)
- `PostGrid.tsx` (responsive grid + empty state)
- `BlogSidebar.tsx`
- `TableOfContents.tsx` (scrollspy, sticky)
- `PostBody.tsx` (renders sanitized HTML from markdown with anchor headings; uses `marked` + `dompurify`)
- `FaqAccordion.tsx` (reuse existing FAQ or make lightweight)
- `KeyTakeaways.tsx`
- `RelatedRail.tsx` (services / locations / routes / posts variants)
- `ShareBar.tsx`
- `NewsletterCta.tsx`
- `BlogHero.tsx`, `CategoryChip.tsx`, `AuthorInline.tsx`

Design: Royal Navy + Gold palette from existing tokens. Serif for H1s (existing `--font-serif`), sans for body.

## 8. Admin CMS (`/admin/blog/*`)

Reuse existing admin shell:
- `/admin/blog` — posts list (status filter, search, bulk publish/archive)
- `/admin/blog/new` and `/admin/blog/$id`
  - Fields: title, slug (auto), subtitle, excerpt, category, tags, author, cluster, featured image (upload to existing `vehicle-images` bucket sibling: new `blog-images` bucket), status, published_at, body (markdown editor — textarea + preview), FAQ builder, Key Takeaways builder, related picker (services/locations/routes/posts autocomplete)
  - SEO panel: seo_title, meta_description, og_image, canonical_override, robots
  - "Preview" button opens `/blog/$slug?preview=1` (auth-gated)
- `/admin/blog/categories`, `/admin/blog/tags`, `/admin/blog/authors` — CRUD grids
- Publish guard: server-side validation matches DB trigger; friendly error surfacing

## 9. RSS + Sitemap + Robots

- `src/routes/rss[.]xml.ts` — latest 30 published posts
- Extend sitemap route to include: `/blog`, all category slugs (with posts), all tag slugs (≥1 post), all published post URLs, lastmod=post.updated_at
- Add `Sitemap:` line to `public/robots.txt`

## 10. Seed content (initial 12 posts across 3 clusters)

Airport cluster (5): Edinburgh Airport Pickup Guide, Meet & Greet Explained, Flight Monitoring, Airport Transfer vs Taxi, Airport Drop-off Tips.
University cluster (3): University of Edinburgh Arrival Guide, Student Airport Transfer Guide, Freshers Week Transport.
Scotland cluster (4): Best Day Trips from Edinburgh, Edinburgh to St Andrews, Best Scottish Castles, Whisky Distillery Day Tours.

Each has: full body (≥800 words), 6+ FAQs, key takeaways, TOC, 3+ related services + 3+ related locations + 2+ related posts. Cluster pillars flagged.

Seed via migration `INSERT`s (deterministic content, no page-load seeding).

## Technical details

**Markdown pipeline:** `marked` for parse (already lightweight, or `markdown-it`) + `isomorphic-dompurify` for sanitize (both work on Cloudflare Workers). Compute `reading_minutes` and `toc` server-side on publish and cache in the row.

**View tracking:** debounced `incrementPostView` server fn called once per session per post (sessionStorage key). Rate-limited by IP hash (reuse existing rate-limit util).

**Related resolution:** loader batches `getDestinationsByIds` / by-slug lookups for related_service_slugs, related_location_slugs, related_route_slugs. If a slug no longer exists, silently drop.

**Images:** posts use CDN URLs. New Supabase bucket `blog-images` (public read via signed policy or public bucket). Fallback hero if none.

**Preview mode:** `?preview=1` on `/blog/$slug` with `requireSupabaseAuth` + admin role fetches drafts through admin server fn.

**Search:** server fn using Postgres `websearch_to_tsquery` on `to_tsvector(title || excerpt || body_md)`. Fallback ILIKE for short queries.

**Head / schema:** new helper `buildPostHead(post)` in `src/lib/seo/blog-seo.ts` emits Article + BreadcrumbList + FAQPage + Speakable JSON-LD. Reuses existing schema builders where possible.

**Ordering of work:**
1. Migration + RLS + grants + triggers
2. `blog.functions.ts` (public reads) + `blog-admin.functions.ts` (writes)
3. Shared components + individual post page
4. Blog home + category + tag pages
5. Admin CMS (list + editor)
6. RSS, sitemap update, robots
7. Seed 12 pillar posts
8. Wire internal links from existing service/location/route pages ("From the blog" rail)

## Out of scope (call out to user)

- Comments (marked optional in brief) — skipped
- Newsletter sending (only capture; no ESP integration)
- WYSIWYG rich editor — using markdown textarea + live preview. If you want a full editor (TipTap etc.) say so and I'll swap it in

Confirm this plan (or tell me what to trim) and I'll build it in the order above. It's a large scope — expect several turns.