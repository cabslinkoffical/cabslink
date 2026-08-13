-- 1) Missing coverage locations used by published journeys
INSERT INTO public.seo_locations (name, slug, location_type, country_code, nation, region, operational_status, published, featured, display_priority)
SELECT * FROM (VALUES
  ('Loch Lomond','loch-lomond','town'::seo_location_type,'GB','Scotland','West Dunbartonshire','active'::seo_operational_status,true,false,60),
  ('Gleneagles','gleneagles','town'::seo_location_type,'GB','Scotland','Perth and Kinross','active'::seo_operational_status,true,false,60)
) v(name,slug,location_type,country_code,nation,region,operational_status,published,featured,display_priority)
WHERE NOT EXISTS (SELECT 1 FROM public.seo_locations l WHERE l.slug = v.slug);

-- 2) Popular routes mirrored from the website's journey pages
WITH j(slug, o_kind, o_slug, d_kind, d_slug, miles, mins, notes, featured, prio) AS (VALUES
  ('edinburgh-to-glasgow','loc','edinburgh','loc','glasgow',47,70,'M8 westbound — 47 miles city centre to city centre; the variable time is the last four miles into Glasgow.',true,10),
  ('glasgow-to-edinburgh','loc','glasgow','loc','edinburgh',47,75,'M8 eastbound — the slow section is leaving Glasgow via the Kingston Bridge and Charing Cross.',true,11),
  ('edinburgh-airport-to-st-andrews','air','edinburgh-airport','loc','st-andrews',48,80,'M90 and A91 over the Queensferry Crossing into Fife — 48 miles, around 80 minutes with golf luggage.',true,12),
  ('glasgow-airport-to-loch-lomond','air','glasgow-airport','loc','loch-lomond',20,35,'A82 through Dumbarton — 20 miles from the terminal to Balloch.',true,13),
  ('edinburgh-to-inverness','loc','edinburgh','loc','inverness',157,195,'M90 then A9 north; average-speed cameras run for most of the A9 above Perth.',false,20),
  ('glasgow-to-edinburgh-airport','loc','glasgow','air','edinburgh-airport',55,75,'M8 eastbound leaving at Newbridge for the terminal — 55 miles.',true,14),
  ('aberdeen-to-inverness','loc','aberdeen','loc','inverness',104,150,'A96 through Inverurie, Huntly, Keith, Elgin and Forres — largely single carriageway.',false,21),
  ('edinburgh-airport-to-gleneagles','air','edinburgh-airport','loc','gleneagles',40,55,'M9, A9 then A823 into Auchterarder — 40 miles, about 55 minutes.',false,22),
  ('glasgow-to-st-andrews','loc','glasgow','loc','st-andrews',82,115,'M80, M9 and the Kincardine Bridge, then the A91 through Fife.',false,23),
  ('edinburgh-to-fort-william','loc','edinburgh','loc','fort-william',146,210,'Scenic run via Stirling, the west shore of Loch Lomond and Glen Coe — 146 miles.',false,24)
)
INSERT INTO public.seo_popular_routes (
  origin_entity_type, origin_entity_id, destination_entity_type, destination_entity_id,
  origin_place_id, destination_place_id, slug, bidirectional,
  direct_distance_miles_cache, direct_duration_seconds_cache,
  operational_status, published, featured, display_priority, route_notes
)
SELECT
  (CASE WHEN j.o_kind='air' THEN 'airport' ELSE 'location' END)::seo_entity_type,
  COALESCE(ol.id, oa.id),
  (CASE WHEN j.d_kind='air' THEN 'airport' ELSE 'location' END)::seo_entity_type,
  COALESCE(dl.id, da.id),
  COALESCE(ol.google_place_id, oa.google_place_id, ''),
  COALESCE(dl.google_place_id, da.google_place_id, ''),
  j.slug, false, j.miles, j.mins * 60,
  'active'::seo_operational_status, true, j.featured, j.prio, j.notes
FROM j
LEFT JOIN public.seo_locations ol ON j.o_kind='loc' AND ol.slug = j.o_slug
LEFT JOIN public.seo_airports  oa ON j.o_kind='air' AND oa.slug = j.o_slug
LEFT JOIN public.seo_locations dl ON j.d_kind='loc' AND dl.slug = j.d_slug
LEFT JOIN public.seo_airports  da ON j.d_kind='air' AND da.slug = j.d_slug
WHERE COALESCE(ol.id, oa.id) IS NOT NULL
  AND COALESCE(dl.id, da.id) IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.seo_popular_routes r WHERE r.slug = j.slug);

-- 3) Repoint legacy Falkirk page to the canonical website path
UPDATE public.seo_pages SET path = '/areas/falkirk' WHERE path = '/locations/falkirk'
  AND NOT EXISTS (SELECT 1 FROM public.seo_pages p2 WHERE p2.path = '/areas/falkirk');

-- 4) Landing-page records for every published location
INSERT INTO public.seo_pages (
  page_type, primary_entity_type, primary_entity_id, slug, path,
  seo_title, meta_description, h1, short_intro, publication_status
)
SELECT
  'location_hub'::seo_page_type, 'location'::seo_entity_type, l.id, l.slug, '/areas/' || l.slug,
  left(l.name || ' Airport Transfers & Private Travel | Cabslink', 68),
  left('Book reliable airport transfers and private travel in ' || l.name || ', ' || COALESCE(l.region, l.nation, 'the UK')
    || '. Fixed fares, 24/7 booking and flight tracking with Cabslink.', 170),
  'Private Airport Travel in ' || l.name,
  'Cabslink covers ' || l.name || ' and the wider ' || COALESCE(l.region, l.nation, 'UK')
    || ' area with fixed-fare airport transfers and private executive travel. Flight tracking, 24/7 booking and professional local drivers as standard.',
  'published'::seo_publication_status
FROM public.seo_locations l
WHERE l.published = true
  AND NOT EXISTS (SELECT 1 FROM public.seo_pages p WHERE p.path = '/areas/' || l.slug);

-- 5) Landing-page records for every published airport
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

-- 6) Landing-page records for every published popular route
INSERT INTO public.seo_pages (
  page_type, primary_entity_type, primary_entity_id, secondary_entity_type, secondary_entity_id,
  slug, path, seo_title, meta_description, h1, short_intro, publication_status
)
SELECT
  'city_to_city_route'::seo_page_type, r.origin_entity_type, r.origin_entity_id,
  r.destination_entity_type, r.destination_entity_id,
  r.slug, '/routes/' || r.slug,
  left(o_name || ' to ' || d_name || ' Transfer | Cabslink', 68),
  left('Fixed-fare private transfers from ' || o_name || ' to ' || d_name
    || '. Professional drivers, 24/7 booking and flight tracking with Cabslink.', 170),
  o_name || ' to ' || d_name || ' — Private Transfer',
  'Pre-book a fixed-fare private transfer between ' || o_name || ' and ' || d_name
    || '. Around ' || r.direct_distance_miles_cache || ' miles door to door with professional drivers and 24/7 support.',
  'published'::seo_publication_status
FROM public.seo_popular_routes r
CROSS JOIN LATERAL (
  SELECT COALESCE(
    (SELECT name FROM public.seo_locations WHERE id = r.origin_entity_id),
    (SELECT name FROM public.seo_airports  WHERE id = r.origin_entity_id)) AS o_name,
         COALESCE(
    (SELECT name FROM public.seo_locations WHERE id = r.destination_entity_id),
    (SELECT name FROM public.seo_airports  WHERE id = r.destination_entity_id)) AS d_name
) n
WHERE r.published = true AND n.o_name IS NOT NULL AND n.d_name IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.seo_pages p WHERE p.path = '/routes/' || r.slug);