CREATE OR REPLACE FUNCTION public.admin_save_blog_post(p_id uuid, p_post jsonb, p_tag_ids uuid[])
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE saved_id uuid; col_list text; assignments text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF jsonb_typeof(p_post) IS DISTINCT FROM 'object' OR EXISTS (
    SELECT 1 FROM jsonb_object_keys(p_post) k WHERE k NOT IN ('slug','title','subtitle','excerpt','body_md','category_id','author_id','featured_image_url','featured_image_alt','status','published_at','reading_minutes','seo_title','meta_description','og_image_url','canonical_override','robots_status','toc','faqs','key_takeaways','cluster_key','pillar','featured','related_service_slugs','related_location_slugs','related_route_slugs','related_post_ids')
  ) THEN RAISE EXCEPTION 'Invalid payload'; END IF;
  SELECT string_agg(format('%I', k), ', '), string_agg(format('%1$I = v.%1$I', k), ', ')
    INTO col_list, assignments FROM jsonb_object_keys(p_post) k;
  IF col_list IS NULL THEN RAISE EXCEPTION 'Empty payload'; END IF;
  IF p_id IS NULL THEN
    EXECUTE format('INSERT INTO public.blog_posts (%s) SELECT %s FROM jsonb_populate_record(NULL::public.blog_posts, $1) v RETURNING id', col_list, col_list)
      INTO saved_id USING p_post;
  ELSE
    EXECUTE format('UPDATE public.blog_posts t SET %s FROM jsonb_populate_record(NULL::public.blog_posts, $1) v WHERE t.id = $2 RETURNING t.id', assignments)
      INTO saved_id USING p_post, p_id;
    IF saved_id IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;
  END IF;
  IF p_tag_ids IS NULL THEN RAISE EXCEPTION 'Tags required'; END IF;
  DELETE FROM public.blog_post_tags WHERE post_id = saved_id;
  INSERT INTO public.blog_post_tags(post_id, tag_id) SELECT saved_id, t FROM unnest(p_tag_ids) t;
  RETURN saved_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_save_blog_post(uuid, jsonb, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_blog_post(uuid, jsonb, uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_save_extra(p_id uuid, p_extra jsonb, p_links jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE saved_id uuid; col_list text; assignments text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF jsonb_typeof(p_extra) IS DISTINCT FROM 'object' OR EXISTS (
    SELECT 1 FROM jsonb_object_keys(p_extra) k WHERE k NOT IN ('key','name','description','price_pence','price_basis','max_quantity','category','applies_to_all_classes','active','sort_order')
  ) THEN RAISE EXCEPTION 'Invalid payload'; END IF;
  SELECT string_agg(format('%I', k), ', '), string_agg(format('%1$I = v.%1$I', k), ', ')
    INTO col_list, assignments FROM jsonb_object_keys(p_extra) k;
  IF col_list IS NULL THEN RAISE EXCEPTION 'Empty payload'; END IF;
  IF p_id IS NULL THEN
    EXECUTE format('INSERT INTO public.extras (%s) SELECT %s FROM jsonb_populate_record(NULL::public.extras, $1) v RETURNING id', col_list, col_list)
      INTO saved_id USING p_extra;
  ELSE
    EXECUTE format('UPDATE public.extras t SET %s FROM jsonb_populate_record(NULL::public.extras, $1) v WHERE t.id = $2 RETURNING t.id', assignments)
      INTO saved_id USING p_extra, p_id;
    IF saved_id IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;
  END IF;
  IF p_links IS NOT NULL THEN
    IF jsonb_typeof(p_links) <> 'array' OR jsonb_array_length(p_links) > 50 THEN RAISE EXCEPTION 'Invalid class links'; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_links) AS x(vehicle_class_id uuid, price_pence integer, max_quantity integer)
      WHERE vehicle_class_id IS NULL OR price_pence < 0 OR price_pence > 10000000 OR max_quantity < 0 OR max_quantity > 600)
      THEN RAISE EXCEPTION 'Invalid class configuration'; END IF;
    DELETE FROM public.extra_vehicle_classes WHERE extra_id = saved_id;
    INSERT INTO public.extra_vehicle_classes(extra_id, vehicle_class_id, price_pence, max_quantity)
      SELECT saved_id, vehicle_class_id, price_pence, max_quantity FROM jsonb_to_recordset(p_links)
        AS x(vehicle_class_id uuid, price_pence integer, max_quantity integer);
  END IF;
  RETURN saved_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_save_extra(uuid, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_extra(uuid, jsonb, jsonb) TO authenticated;

ALTER TABLE public.dispatch_events ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz;
CREATE INDEX IF NOT EXISTS dispatch_events_sending_lease_idx
  ON public.dispatch_events (lease_expires_at) WHERE status = 'sending';

CREATE OR REPLACE FUNCTION public.claim_dispatch_event()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  WITH candidate AS (
    SELECT id FROM public.dispatch_events
    WHERE (status = 'pending' AND next_attempt_at <= statement_timestamp())
       OR (status = 'sending' AND (lease_expires_at IS NULL OR lease_expires_at <= statement_timestamp()))
    ORDER BY created_at, id
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  ), claimed AS (
    UPDATE public.dispatch_events e
    SET status = 'sending', lease_expires_at = statement_timestamp() + interval '5 minutes'
    FROM candidate c WHERE e.id = c.id
    RETURNING e.*
  )
  SELECT to_jsonb(c) || jsonb_build_object('endpoint',
    (SELECT to_jsonb(ep) FROM public.dispatch_endpoints ep WHERE ep.id = c.endpoint_id))
  FROM claimed c;
$$;
REVOKE ALL ON FUNCTION public.claim_dispatch_event() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_dispatch_event() TO service_role;