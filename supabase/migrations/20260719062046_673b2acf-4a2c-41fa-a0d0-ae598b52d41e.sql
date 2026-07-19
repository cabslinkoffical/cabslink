CREATE TABLE IF NOT EXISTS public.route_distance_cache (
  cache_key text PRIMARY KEY,
  origin_place_id text NOT NULL,
  destination_place_id text NOT NULL,
  waypoint_place_ids text[] NOT NULL DEFAULT '{}',
  distance_meters integer NOT NULL,
  distance_miles numeric(10,2) NOT NULL,
  duration_seconds integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);
CREATE INDEX IF NOT EXISTS route_distance_cache_expires_idx ON public.route_distance_cache (expires_at);
GRANT SELECT ON public.route_distance_cache TO authenticated;
GRANT ALL ON public.route_distance_cache TO service_role;
ALTER TABLE public.route_distance_cache ENABLE ROW LEVEL SECURITY;