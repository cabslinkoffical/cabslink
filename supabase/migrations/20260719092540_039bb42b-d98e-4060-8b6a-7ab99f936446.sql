CREATE POLICY "seo_gsc admin write"
  ON public.seo_search_console_snapshots
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
GRANT INSERT, UPDATE, DELETE ON public.seo_search_console_snapshots TO authenticated;