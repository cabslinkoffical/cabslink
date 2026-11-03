CREATE TABLE public.google_reviews_snapshot (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.google_reviews_snapshot TO anon, authenticated;
GRANT ALL ON public.google_reviews_snapshot TO service_role;
ALTER TABLE public.google_reviews_snapshot ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read the Google reviews snapshot"
  ON public.google_reviews_snapshot FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.private_settings (key, value)
SELECT 'reviews_refresh_token', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
WHERE NOT EXISTS (SELECT 1 FROM public.private_settings WHERE key = 'reviews_refresh_token');

CREATE OR REPLACE FUNCTION public.reviews_wake_refresh()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_token text;
BEGIN
  SELECT value INTO v_token FROM public.private_settings WHERE key = 'reviews_refresh_token';
  IF v_token IS NULL OR length(v_token) < 32 THEN RETURN; END IF;
  PERFORM net.http_post(
    url := 'https://project--e2d845db-9efd-4dac-bae6-365b62867b96.lovable.app/api/public/reviews/refresh',
    headers := jsonb_build_object('content-type', 'application/json', 'x-reviews-token', v_token),
    body := '{}'::jsonb
  );
EXCEPTION WHEN OTHERS THEN NULL;
END;
$function$;
REVOKE ALL ON FUNCTION public.reviews_wake_refresh() FROM PUBLIC, anon, authenticated;