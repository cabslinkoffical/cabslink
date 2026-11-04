CREATE OR REPLACE FUNCTION public.seo_redirect_record_hit(_from_path text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.seo_redirects
     SET hit_count = hit_count + 1, last_hit_at = now()
   WHERE from_path = _from_path AND active = true;
$$;
REVOKE ALL ON FUNCTION public.seo_redirect_record_hit(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seo_redirect_record_hit(text) TO service_role;