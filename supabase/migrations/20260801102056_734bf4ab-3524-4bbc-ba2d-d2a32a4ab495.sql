CREATE TABLE public.site_credentials (
  id integer PRIMARY KEY DEFAULT 1,
  smtp_host text,
  smtp_port integer,
  smtp_user text,
  google_maps_api_key text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_credentials_singleton CHECK (id = 1)
);

GRANT SELECT, INSERT, UPDATE ON public.site_credentials TO authenticated;
GRANT ALL ON public.site_credentials TO service_role;

ALTER TABLE public.site_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read credentials" ON public.site_credentials
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins insert credentials" ON public.site_credentials
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update credentials" ON public.site_credentials
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.site_credentials (id, smtp_host, smtp_port, smtp_user, google_maps_api_key)
SELECT 1, smtp_host, smtp_port, smtp_user, google_maps_api_key FROM public.site_settings WHERE id = 1
ON CONFLICT (id) DO NOTHING;

DROP VIEW IF EXISTS public.site_settings_public;

ALTER TABLE public.site_settings
  DROP COLUMN IF EXISTS smtp_host,
  DROP COLUMN IF EXISTS smtp_port,
  DROP COLUMN IF EXISTS smtp_user,
  DROP COLUMN IF EXISTS google_maps_api_key;

-- Settings row now holds no credentials, so plain public read access is safe
GRANT SELECT ON public.site_settings TO anon;