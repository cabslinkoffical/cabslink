GRANT SELECT ON public.destinations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.destinations TO authenticated;
GRANT ALL ON public.destinations TO service_role;

CREATE OR REPLACE FUNCTION public.search_bookable_destinations(_q text, _limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, type destination_type, slug text, name text, town text, region text, council text, lat numeric, lng numeric, place_id text, seo_tier smallint)
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT d.id, d.type, d.slug, d.name, d.town, d.region, d.council,
         d.lat, d.lng, d.place_id, d.seo_tier
  FROM public.destinations d
  WHERE d.active = true
    AND (
      _q IS NULL OR btrim(_q) = ''
      OR d.name ILIKE '%'||_q||'%'
      OR COALESCE(d.town,'')   ILIKE '%'||_q||'%'
      OR COALESCE(d.region,'') ILIKE '%'||_q||'%'
      OR COALESCE(d.council,'')ILIKE '%'||_q||'%'
      OR EXISTS (SELECT 1 FROM unnest(d.synonyms) s WHERE s ILIKE '%'||_q||'%')
      OR EXISTS (SELECT 1 FROM unnest(d.keywords) k WHERE k ILIKE '%'||_q||'%')
    )
  ORDER BY d.seo_tier ASC, d.name ASC
  LIMIT LEAST(GREATEST(_limit, 1), 50)
$function$;