DROP POLICY IF EXISTS "Public reads settings" ON public.site_settings;
DROP POLICY IF EXISTS "Anyone reads settings" ON public.site_settings;

CREATE POLICY "Public reads settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (true);

GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT ON public.site_settings TO authenticated;