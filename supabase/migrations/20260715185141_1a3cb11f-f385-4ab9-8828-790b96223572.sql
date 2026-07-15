-- 1. Corridor rule settings
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS poi_corridor_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS poi_corridor_radius_miles numeric(6,2) NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS poi_corridor_max_pois integer NOT NULL DEFAULT 8;

ALTER TABLE public.site_settings
  DROP CONSTRAINT IF EXISTS site_settings_poi_corridor_radius_check,
  ADD CONSTRAINT site_settings_poi_corridor_radius_check
    CHECK (poi_corridor_radius_miles >= 0 AND poi_corridor_radius_miles <= 200);

ALTER TABLE public.site_settings
  DROP CONSTRAINT IF EXISTS site_settings_poi_corridor_max_check,
  ADD CONSTRAINT site_settings_poi_corridor_max_check
    CHECK (poi_corridor_max_pois >= 0 AND poi_corridor_max_pois <= 50);

-- 2. Geocode cache for pickup/dropoff Place IDs
CREATE TABLE IF NOT EXISTS public.place_coords (
  place_id text PRIMARY KEY,
  lat numeric(9,6) NOT NULL,
  lng numeric(9,6) NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.place_coords TO anon;
GRANT SELECT ON public.place_coords TO authenticated;
GRANT ALL ON public.place_coords TO service_role;

ALTER TABLE public.place_coords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read place coords" ON public.place_coords;
CREATE POLICY "Anyone can read place coords"
  ON public.place_coords FOR SELECT
  USING (true);
-- No INSERT/UPDATE/DELETE policies: only service_role (which bypasses RLS) writes.
