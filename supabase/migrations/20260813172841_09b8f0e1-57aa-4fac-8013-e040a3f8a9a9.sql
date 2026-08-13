-- Sync airport identity fields from the website destination records
UPDATE public.seo_airports a
   SET iata_code = COALESCE(NULLIF(btrim(a.iata_code), ''), d.meta->>'iata'),
       google_place_id = COALESCE(a.google_place_id, d.place_id),
       latitude = COALESCE(a.latitude, d.lat),
       longitude = COALESCE(a.longitude, d.lng)
  FROM public.destinations d
 WHERE d.slug = a.slug AND d.type = 'airport';

-- Sync location identity fields from the website destination records
UPDATE public.seo_locations l
   SET google_place_id = COALESCE(l.google_place_id, d.place_id),
       latitude = COALESCE(l.latitude, d.lat),
       longitude = COALESCE(l.longitude, d.lng)
  FROM public.destinations d
 WHERE d.slug = l.slug;

-- Airport landing pages
INSERT INTO public.seo_pages (
  page_type, primary_entity_type, primary_entity_id, slug, path,
  seo_title, meta_description, h1, short_intro, publication_status
)
SELECT
  'airport_hub'::seo_page_type, 'airport'::seo_entity_type, a.id, a.slug, '/airports/' || lower(a.iata_code),
  left(a.name || ' (' || a.iata_code || ') Transfers | Cabslink', 68),
  left('Pre-book ' || a.name || ' (' || a.iata_code || ') airport transfers with Cabslink. Flight tracking, meet & greet and fixed fares, 24/7 across the UK.', 170),
  a.name || ' Airport Transfers',
  'Reliable pre-booked transfers to and from ' || a.name || ' (' || a.iata_code
    || '). Flight tracking, meet & greet in the terminal and fixed transparent fares with no surge pricing.',
  'published'::seo_publication_status
FROM public.seo_airports a
WHERE a.published = true AND a.iata_code IS NOT NULL AND btrim(a.iata_code) <> ''
  AND NOT EXISTS (SELECT 1 FROM public.seo_pages p WHERE p.path = '/airports/' || lower(a.iata_code));

-- Route endpoint place ids now that entities carry them
UPDATE public.seo_popular_routes r
   SET origin_place_id = COALESCE(NULLIF(r.origin_place_id,''), ol.google_place_id, oa.google_place_id, ''),
       destination_place_id = COALESCE(NULLIF(r.destination_place_id,''), dl.google_place_id, da.google_place_id, '')
  FROM (SELECT 1) x
  LEFT JOIN public.seo_locations ol ON false
  LEFT JOIN public.seo_airports oa ON false
  LEFT JOIN public.seo_locations dl ON false
  LEFT JOIN public.seo_airports da ON false
 WHERE false;

UPDATE public.seo_popular_routes r
   SET origin_place_id = COALESCE(
         (SELECT google_place_id FROM public.seo_locations WHERE id = r.origin_entity_id),
         (SELECT google_place_id FROM public.seo_airports  WHERE id = r.origin_entity_id), '')
 WHERE btrim(r.origin_place_id) = '';

UPDATE public.seo_popular_routes r
   SET destination_place_id = COALESCE(
         (SELECT google_place_id FROM public.seo_locations WHERE id = r.destination_entity_id),
         (SELECT google_place_id FROM public.seo_airports  WHERE id = r.destination_entity_id), '')
 WHERE btrim(r.destination_place_id) = '';