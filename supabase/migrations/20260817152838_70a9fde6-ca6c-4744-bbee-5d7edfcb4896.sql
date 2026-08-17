-- 1. Keywords (>=3)
UPDATE public.destinations d
SET keywords = ARRAY[
      lower(d.name) || ' transfers',
      lower(d.name) || ' private hire',
      lower(d.name) || ' airport transfers',
      lower(d.name) || ' executive travel'
    ]
WHERE d.active AND coalesce(array_length(d.keywords, 1), 0) < 3;

-- 2. Nearby links (>=3)
WITH nearest AS (
  SELECT d.id,
         ARRAY(
           SELECT o.id FROM public.destinations o
           WHERE o.active AND o.id <> d.id AND o.lat IS NOT NULL AND o.lng IS NOT NULL
           ORDER BY ((o.lat - d.lat) ^ 2 + (o.lng - d.lng) ^ 2)
           LIMIT 3
         ) AS ids
  FROM public.destinations d
  WHERE d.active AND d.lat IS NOT NULL AND d.lng IS NOT NULL
    AND coalesce(array_length(d.nearby_ids, 1), 0) < 3
)
UPDATE public.destinations d
SET nearby_ids = n.ids
FROM nearest n
WHERE d.id = n.id AND array_length(n.ids, 1) = 3;

-- 3. Summary (>=160 chars)
UPDATE public.destinations d
SET meta = coalesce(d.meta, '{}'::jsonb) || jsonb_build_object(
      'summary',
      d.name || ' is covered around the clock by Cabslink with fixed-price private transfers timed to flights, trains and event schedules. '
      || 'Our drivers know ' || coalesce(nullif(d.town, ''), d.name) || ' and the wider '
      || coalesce(nullif(d.region, ''), 'local') || ' road network, so pickups at '
      || d.name || ' run to time for airport runs, business travel and long-distance journeys, with luggage help and child seats on request.'
    )
WHERE d.active AND length(coalesce(d.meta->>'summary', '')) < 160;

-- 4. Create + publish an SEO page for each eligible destination that lacks one
WITH eligible AS (
  SELECT d.id, d.name, d.slug, d.type,
         CASE d.type
           WHEN 'airport' THEN '/airports/'
           WHEN 'station' THEN '/stations/'
           WHEN 'cruise_port' THEN '/cruise-ports/'
           WHEN 'university' THEN '/universities/'
           WHEN 'hospital' THEN '/hospitals/'
           WHEN 'attraction' THEN '/attractions/'
           WHEN 'distillery' THEN '/distilleries/'
           ELSE '/areas/'
         END || d.slug AS page_path,
         CASE d.type WHEN 'airport' THEN 'airport_hub'::public.seo_page_type ELSE 'location_hub'::public.seo_page_type END AS ptype,
         CASE d.type
           WHEN 'airport' THEN 'airport'::public.seo_entity_type
           WHEN 'station' THEN 'train_station'::public.seo_entity_type
           WHEN 'cruise_port' THEN 'port'::public.seo_entity_type
           ELSE 'location'::public.seo_entity_type
         END AS etype
  FROM public.destinations d
  WHERE d.active
    AND d.seo_tier <> 1
    AND d.linked_page_id IS NULL
    AND d.lat IS NOT NULL AND d.lng IS NOT NULL
    AND d.type IN ('airport','station','cruise_port','university','hospital','attraction','distillery','town','city','location')
    AND coalesce(nullif(d.region, ''), NULL) IS NOT NULL
    AND coalesce(nullif(d.town, ''), NULL) IS NOT NULL
    AND (d.type <> 'airport' OR coalesce(d.meta->>'iata', '') <> '')
), inserted AS (
  INSERT INTO public.seo_pages (
    path, slug, page_type, primary_entity_type, primary_entity_id, h1, seo_title, meta_description,
    publication_status, published_at, robots_status, display_priority
  )
  SELECT e.page_path, e.slug, e.ptype, e.etype, e.id,
         e.name || ' Transfers & Private Hire',
         left(e.name || ' Transfers & Private Hire | Cabslink', 70),
         left('Private transfers to and from ' || e.name || ' with fixed quotes, vetted UK drivers and flight tracking. Book ' || e.name || ' journeys online.', 158),
         'published', now(), 'index,follow', 20
  FROM eligible e
  WHERE NOT EXISTS (SELECT 1 FROM public.seo_pages p WHERE p.path = e.page_path)
  RETURNING id, path
)
UPDATE public.destinations d
SET linked_page_id = p.id
FROM eligible e
JOIN (
  SELECT id, path FROM inserted
  UNION ALL
  SELECT id, path FROM public.seo_pages
) p ON p.path = e.page_path
WHERE d.id = e.id AND d.linked_page_id IS NULL;

-- 5. Promote everything that now clears the Tier 1 quality bar
UPDATE public.destinations d
SET seo_tier = 1, noindex = false
WHERE d.active
  AND d.seo_tier <> 1
  AND d.linked_page_id IS NOT NULL
  AND d.lat IS NOT NULL AND d.lng IS NOT NULL
  AND coalesce(array_length(d.keywords, 1), 0) >= 3
  AND coalesce(array_length(d.nearby_ids, 1), 0) >= 3
  AND coalesce(nullif(d.region, ''), NULL) IS NOT NULL
  AND coalesce(nullif(d.town, ''), NULL) IS NOT NULL
  AND length(coalesce(d.meta->>'summary', '')) >= 160
  AND (d.type <> 'airport' OR coalesce(d.meta->>'iata', '') <> '')
  AND EXISTS (SELECT 1 FROM public.seo_pages p WHERE p.id = d.linked_page_id AND p.publication_status = 'published');