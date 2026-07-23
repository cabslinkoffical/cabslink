# SEO Import & Classification System

Universal pipeline for loading destinations, keywords, tags, search intents and relationships into the master SEO database — safely and repeatedly.

**No entity becomes indexable via import.** Everything lands at the configured default tier (Tier 4 / Draft by default) with `noindex=true`. Promotion to Tier 1 happens later, per row, in the Publishing engine after each entity meets its quality threshold.

## Supported files

| Format | Notes |
|--------|-------|
| CSV / TSV | Headers on row 1; comma / semicolon / pipe list columns split automatically. |
| JSON | Root array, or `{ "rows": [...] }`. |
| XLSX / XLS | First sheet is used; column headers become field names. |

Parser is client-side; the file never leaves the browser until you click **Commit**.

## Supported kinds

**Destinations** (all persisted in `destinations` with matching `type`):
`service`, `region`, `council`, `city`, `town`, `village`, `airport`, `route`, `station`, `bus_station`, `cruise_port`, `university`, `college`, `hospital`, `business_park`, `corporate`, `attraction`, `castle`, `museum`, `hotel`, `golf_course`, `distillery`, `brewery`, `wedding_venue`, `event_venue`, `car_rental`, `campervan_rental`, `ferry_terminal`, `guide`, `blog`.

**Taxonomy**: `keyword`, `tag`, `search_intent`.

**Edges**: `relationship` (bulk edge upload).

## Destination row columns

Required: `slug`, `name`.

Optional: `display_name`, `short_name`, `country` (default `GB`), `region`, `council`, `town`, `parent_slug`, `parent_type`, `lat`, `lng`, `place_id`, `keywords`, `synonyms`, `tags`, `search_intents`, `nearby`, `popular_routes`, `related_services`, `meta` (JSON), `seo_tier`.

Route rows also need: `from_slug`, `from_type`, `to_slug`, `to_type`.

Reference lists (`nearby`, `popular_routes`, `related_services`) use the form `type:slug`, e.g. `town:st-andrews,airport:edi`.

## Validation

Before commit, the engine detects and reports every row's status:

- `new` / `update` — row will be inserted or upserted
- `duplicate_in_file` — same key appears twice in the upload
- `invalid` — schema failed (missing fields, bad slug, wrong type)
- `orphan_parent` — parent_slug / parent_type does not exist and is not in this file
- `orphan_ref` — a required reference (route endpoint, relationship endpoint) is missing

Warnings (non-blocking): missing coordinates, missing IATA on airport, unresolved list references (silently skipped on commit).

## Classification ruleset

Stored in `private_settings.seo_import_rules`. Configurable in the admin UI:

- **defaultTier** — every import lands here unless a per-type override exists (default: 4)
- **tierByType** — per-type ceiling (never *promote* to a lower tier than requested)
- **autoNoindex** — force `noindex=true` on every imported row (default: true)
- **nearbyRadiusMiles** — Haversine cutoff for auto-nearby edges (default: 15)
- **nearbyMaxPerEntity** — cap on nearby edges per row (default: 8)

Tier 1 requests are auto-downgraded to Tier 2 during import because the `destinations_publish_guard` trigger requires a linked SEO page — which imports never produce. Use the Publishing engine to promote.

## Automatic classification

For every destination row the engine:

1. Upserts the row (keyed on `type, slug`).
2. Resolves `parent_slug` + `parent_type` to a parent id and writes `belongs_to` edge.
3. Resolves `nearby` / `popular_routes` / `related_services` list references and writes typed edges.
4. Upserts every value in `keywords` / `tags` / `search_intents` into the global taxonomy tables, then attaches the junction row.

`route` rows additionally create `belongs_to` edges from the route to each endpoint and a `popular_route` edge between the endpoints.

## Auto-relationships (Haversine)

Run **Recompute auto-relationships** to derive edges from coordinates alone:

- `nearby` — every pair inside `nearbyRadiusMiles`, ranked by distance, capped at `nearbyMaxPerEntity`
- `nearest_airport`, `nearest_station`, `nearest_hospital`, `nearest_university` — closest active entity of that type

Safe to run repeatedly; upsert is idempotent.

## Booking search

Every active entity — regardless of tier — is queryable through the public `search_bookable_destinations(q, limit)` RPC. Import a village at Tier 4 and it becomes bookable immediately without exposing a public page.

## Scale

- Upserts are chunked to 500 rows per statement.
- Junction upserts use compound `ON CONFLICT` targets — no duplicate keywords or tags.
- 50k+ rows is safe. Split massive files into 5k-row batches to keep validation reports readable.

## Usage summary

1. Admin → SEO → Import.
2. Configure ruleset (once).
3. Select entity kind → upload file.
4. Click **Validate**. Review report; download CSV if needed.
5. Fix source data if `invalid` / `orphan_parent` / `orphan_ref` counts are non-zero.
6. Click **Commit import**.
7. After importing coordinates-rich data, click **Recompute auto-relationships**.
8. Promote individual entities to Tier 1 later via the Publishing engine.
