WITH eligible AS (
  SELECT d.id, d.name, d.slug, d.type,
         CASE d.type WHEN 'business_park' THEN '/corporate/' ELSE '/areas/' END || d.slug AS page_path
  FROM public.destinations d
  WHERE d.active AND d.seo_tier <> 1 AND d.linked_page_id IS NULL
    AND d.type IN ('business_park','town')
    AND d.lat IS NOT NULL AND d.lng IS NOT NULL
    AND coalesce(nullif(d.town, ''), NULL) IS NOT NULL
), inserted AS (
  INSERT INTO public.seo_pages (
    path, slug, page_type, primary_entity_type, primary_entity_id, h1, seo_title, meta_description,
    publication_status, published_at, robots_status, display_priority
  )
  SELECT e.page_path, e.slug, 'location_hub'::public.seo_page_type, 'location'::public.seo_entity_type, e.id,
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
JOIN (SELECT id, path FROM inserted UNION ALL SELECT id, path FROM public.seo_pages) p
  ON p.path = e.page_path
WHERE d.id = e.id AND d.linked_page_id IS NULL;

UPDATE public.destinations d
SET seo_tier = 1, noindex = false
WHERE d.active AND d.seo_tier <> 1 AND d.linked_page_id IS NOT NULL
  AND d.type IN ('business_park','town')
  AND EXISTS (SELECT 1 FROM public.seo_pages p WHERE p.id = d.linked_page_id AND p.publication_status = 'published');