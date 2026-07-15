
-- Populate POIs with Place IDs, coordinates, and activate them
UPDATE public.points_of_interest SET place_id='ChIJ565fzkSLiEgRa5z320HtPY8', latitude=56.245059, longitude=-4.211663, active=true WHERE slug='callander-village';
UPDATE public.points_of_interest SET place_id='ChIJv_zkTdKLiEgROfu3YQrTmVU', latitude=56.1851989, longitude=-4.0499458, active=true WHERE slug='doune-castle';
UPDATE public.points_of_interest SET place_id='ChIJrfWr3_l6iEgRWSwGuUFI4TQ', latitude=56.000782, longitude=-3.840998, active=true WHERE slug='falkirk-wheel';
UPDATE public.points_of_interest SET place_id='ChIJdbMpe-owiUgR5zIXwvPg3NE', latitude=56.6825599, longitude=-5.1022713, active=true WHERE slug='glencoe';
UPDATE public.points_of_interest SET place_id='ChIJi4QU6ZrkiEgRzb6l1HYaZ74', latitude=56.388758, longitude=-4.286113, active=true WHERE slug='lochearnhead';
UPDATE public.points_of_interest SET place_id='ChIJp9U8KJJiiEgRZ_tBFfsEUHw', latitude=56.122907, longitude=-3.9455615, active=true WHERE slug='stirling-castle';
UPDATE public.points_of_interest SET place_id='ChIJI7mOEHd5iEgR97zKUkBuhTw', latitude=56.0189956, longitude=-3.7553902, active=true WHERE slug='the-kelpies';

-- Cache resolved coordinates
INSERT INTO public.place_coords (place_id, lat, lng) VALUES
  ('ChIJ565fzkSLiEgRa5z320HtPY8', 56.245059, -4.211663),
  ('ChIJv_zkTdKLiEgROfu3YQrTmVU', 56.1851989, -4.0499458),
  ('ChIJrfWr3_l6iEgRWSwGuUFI4TQ', 56.000782, -3.840998),
  ('ChIJdbMpe-owiUgR5zIXwvPg3NE', 56.6825599, -5.1022713),
  ('ChIJi4QU6ZrkiEgRzb6l1HYaZ74', 56.388758, -4.286113),
  ('ChIJp9U8KJJiiEgRZ_tBFfsEUHw', 56.122907, -3.9455615),
  ('ChIJI7mOEHd5iEgR97zKUkBuhTw', 56.0189956, -3.7553902),
  ('ChIJfQHjkw7Fh0gRm9WxkiUKUxk', 55.9471784, -3.3607946),
  ('ChIJGwMcNyMziUgRIUhUCOM-oM0', 56.819817, -5.105218)
ON CONFLICT (place_id) DO UPDATE SET lat=EXCLUDED.lat, lng=EXCLUDED.lng;

-- Set template origin/destination, make bidirectional, and activate
UPDATE public.scenic_route_templates
   SET origin_place_id='ChIJfQHjkw7Fh0gRm9WxkiUKUxk',
       destination_place_id='ChIJGwMcNyMziUgRIUhUCOM-oM0',
       bidirectional=true,
       active=true
 WHERE slug='edinburgh-fort-william-scenic';

-- Enable corridor fallback so other routes still show famous stops
UPDATE public.site_settings SET poi_corridor_enabled=true WHERE id=1;
