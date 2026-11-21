CREATE OR REPLACE FUNCTION public.admin_save_blog_post(p_id uuid, p_post jsonb, p_tag_ids uuid[])
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE saved_id uuid; col_list text; assignments text;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
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
$function$;
REVOKE EXECUTE ON FUNCTION public.admin_save_blog_post(uuid, jsonb, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_blog_post(uuid, jsonb, uuid[]) TO service_role;