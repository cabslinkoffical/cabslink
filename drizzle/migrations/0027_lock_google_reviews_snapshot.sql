DROP POLICY IF EXISTS "Public can read the Google reviews snapshot" ON public.google_reviews_snapshot;
REVOKE ALL ON public.google_reviews_snapshot FROM anon, authenticated;