CREATE POLICY "route_distance_cache service only"
  ON public.route_distance_cache
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);