CREATE OR REPLACE FUNCTION public.blog_posts_publish_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE a record;
BEGIN
  IF NEW.status = 'published' THEN
    IF NEW.title IS NULL OR btrim(NEW.title) = '' THEN
      RAISE EXCEPTION 'Published posts require a title' USING ERRCODE = 'check_violation'; END IF;
    IF NEW.slug IS NULL OR btrim(NEW.slug) = '' THEN
      RAISE EXCEPTION 'Published posts require a slug' USING ERRCODE = 'check_violation'; END IF;
    IF NEW.category_id IS NULL THEN
      RAISE EXCEPTION 'Published posts require a category' USING ERRCODE = 'check_violation'; END IF;
    IF NEW.featured_image_url IS NULL OR btrim(NEW.featured_image_url) = '' THEN
      RAISE EXCEPTION 'Published posts require a featured image' USING ERRCODE = 'check_violation'; END IF;
    IF NEW.seo_title IS NULL OR btrim(NEW.seo_title) = '' THEN
      RAISE EXCEPTION 'Published posts require an SEO title' USING ERRCODE = 'check_violation'; END IF;
    IF NEW.meta_description IS NULL OR btrim(NEW.meta_description) = '' THEN
      RAISE EXCEPTION 'Published posts require a meta description' USING ERRCODE = 'check_violation'; END IF;
    IF length(coalesce(NEW.body_md,'')) < 600 THEN
      RAISE EXCEPTION 'Published posts require at least 600 characters of body content' USING ERRCODE = 'check_violation'; END IF;
    -- Team bylines are legitimate existing authors. Do not invent a person
    -- or require a biography/photo to save or publish an article.
    -- Already-live posts retain the previous re-save behaviour.
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published' THEN
      SELECT name, active INTO a FROM public.blog_authors WHERE id = NEW.author_id;
      IF NOT FOUND OR a.active IS NOT TRUE OR btrim(coalesce(a.name, '')) = '' THEN
        RAISE EXCEPTION 'Choose an active author before publishing this post' USING ERRCODE = 'check_violation'; END IF;
    END IF;
    IF NEW.published_at IS NULL THEN NEW.published_at := now(); END IF;
  END IF;
  RETURN NEW;
END $function$;