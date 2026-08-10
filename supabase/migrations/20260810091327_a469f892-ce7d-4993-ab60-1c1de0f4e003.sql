-- 1. Published SEO page records for the seven curated cities
INSERT INTO public.seo_pages (page_type, primary_entity_type, primary_entity_id, slug, path, seo_title, meta_description, h1, publication_status, robots_status, display_priority)
SELECT 'location_hub'::seo_page_type,
       'location'::seo_entity_type,
       d.id,
       d.slug,
       '/areas/' || d.slug,
       v.title,
       v.meta,
       v.h1,
       'published'::seo_publication_status,
       'index,follow',
       10
FROM public.destinations d
JOIN (VALUES
  ('edinburgh', 'Edinburgh Private Travel & Airport Transfers | Cabslink', 'Private car and airport transfer travel in Edinburgh with fixed quotes, vetted UK drivers and flight tracking. Book Edinburgh journeys online.', 'Edinburgh Private Travel & Airport Transfers'),
  ('glasgow',   'Glasgow Private Travel & Airport Transfers | Cabslink', 'Private car and airport transfer travel in Glasgow with fixed quotes, vetted UK drivers and flight tracking. Book Glasgow journeys online.', 'Glasgow Private Travel & Airport Transfers'),
  ('aberdeen',  'Aberdeen Private Travel & Airport Transfers | Cabslink', 'Private car and airport transfer travel in Aberdeen with fixed quotes, vetted UK drivers and flight tracking. Book Aberdeen journeys online.', 'Aberdeen Private Travel & Airport Transfers'),
  ('dundee',    'Dundee Private Travel & Airport Transfers | Cabslink', 'Private car and airport transfer travel in Dundee with fixed quotes, vetted UK drivers and flight tracking. Book Dundee journeys online.', 'Dundee Private Travel & Airport Transfers'),
  ('inverness', 'Inverness Private Travel & Airport Transfers | Cabslink', 'Private car and airport transfer travel in Inverness with fixed quotes, vetted UK drivers and flight tracking. Book Highland journeys online.', 'Inverness Private Travel & Airport Transfers'),
  ('stirling',  'Stirling Private Travel & Airport Transfers | Cabslink', 'Private car and airport transfer travel in Stirling with fixed quotes, vetted UK drivers and flight tracking. Book Stirling journeys online.', 'Stirling Private Travel & Airport Transfers'),
  ('perth',     'Perth Private Travel & Airport Transfers | Cabslink', 'Private car and airport transfer travel in Perth with fixed quotes, vetted UK drivers and flight tracking. Book Perth journeys online.', 'Perth Private Travel & Airport Transfers')
) AS v(slug, title, meta, h1) ON v.slug = d.slug
WHERE d.type = 'city' AND d.active AND d.noindex = false
ON CONFLICT (path) DO NOTHING;

-- 2. Real keyword sets
UPDATE public.destinations d SET keywords = k.kw
FROM (VALUES
  ('edinburgh', ARRAY['edinburgh airport transfers','edinburgh private hire','edinburgh executive travel','edinburgh taxi to airport']),
  ('glasgow',   ARRAY['glasgow airport transfers','glasgow private hire','glasgow executive travel','glasgow taxi to airport']),
  ('aberdeen',  ARRAY['aberdeen airport transfers','aberdeen private hire','aberdeen corporate travel','aberdeen taxi to airport']),
  ('dundee',    ARRAY['dundee airport transfers','dundee private hire','dundee executive travel','dundee taxi to airport']),
  ('inverness', ARRAY['inverness airport transfers','inverness private hire','highlands executive travel','inverness taxi to airport']),
  ('stirling',  ARRAY['stirling airport transfers','stirling private hire','stirling executive travel','stirling taxi to airport']),
  ('perth',     ARRAY['perth airport transfers','perth private hire','perth executive travel','perth taxi to airport'])
) AS k(slug, kw)
WHERE d.slug = k.slug AND d.type = 'city';

-- 3. Editorial orientation summaries (already published in the site's own copy)
UPDATE public.destinations d
SET meta = coalesce(d.meta, '{}'::jsonb) || jsonb_build_object('summary', s.summary)
FROM (VALUES
  ('edinburgh', 'Edinburgh''s city centre is split between the Georgian New Town and the medieval Old Town, with most hotels within two miles of Waverley station.'),
  ('glasgow',   'Glasgow is Scotland''s largest city, with the commercial core between Central and Queen Street stations and the SEC/Hydro campus on the Clyde.'),
  ('aberdeen',  'Aberdeen combines a compact granite city centre with the Dyce energy corridor and the harbour, which drives most of its business travel.'),
  ('dundee',    'Dundee''s waterfront regeneration puts V&A Dundee, the station and the main hotels within a few hundred metres of each other.'),
  ('inverness', 'Inverness is the gateway to the Highlands, and most journeys start from the compact centre around the station and the River Ness.'),
  ('stirling',  'Stirling sits at the centre of Scotland''s motorway network, which makes it a practical base for travel in either direction.'),
  ('perth',     'Perth is a compact city on the Tay with fast A9 and M90 links, used heavily for onward Highland travel.')
) AS s(slug, summary)
WHERE d.slug = s.slug AND d.type = 'city'
  AND coalesce(d.meta->>'summary', '') = '';

-- 4. Nearby links computed from stored coordinates (3 nearest active places)
UPDATE public.destinations d
SET nearby_ids = n.ids
FROM (
  SELECT a.id, array_agg(b.id ORDER BY b.dist) AS ids
  FROM public.destinations a
  CROSS JOIN LATERAL (
    SELECT c.id,
           (c.lat - a.lat) * (c.lat - a.lat) + (c.lng - a.lng) * (c.lng - a.lng) AS dist
    FROM public.destinations c
    WHERE c.active AND c.id <> a.id
      AND c.lat IS NOT NULL AND c.lng IS NOT NULL
      AND c.type IN ('city','town','airport','attraction','station')
    ORDER BY dist LIMIT 3
  ) b
  WHERE a.slug IN ('edinburgh','glasgow','aberdeen','dundee','inverness','stirling','perth')
    AND a.type = 'city' AND a.lat IS NOT NULL AND a.lng IS NOT NULL
  GROUP BY a.id
) AS n
WHERE d.id = n.id;

-- 5. Link the destination to its published SEO page and promote to Tier 1
UPDATE public.destinations d
SET linked_page_id = p.id, seo_tier = 1
FROM public.seo_pages p
WHERE p.path = '/areas/' || d.slug
  AND p.publication_status = 'published'
  AND d.type = 'city'
  AND d.slug IN ('edinburgh','glasgow','aberdeen','dundee','inverness','stirling','perth')
  AND d.active AND d.noindex = false
  AND d.lat IS NOT NULL AND d.lng IS NOT NULL
  AND coalesce(array_length(d.keywords, 1), 0) >= 3
  AND coalesce(array_length(d.nearby_ids, 1), 0) >= 3;