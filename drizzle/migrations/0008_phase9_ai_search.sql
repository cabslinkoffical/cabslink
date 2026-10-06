ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS bing_site_verification text,
  ADD COLUMN IF NOT EXISTS indexnow_key text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', '');

CREATE OR REPLACE VIEW public.site_settings_public AS
 SELECT id, company_name, maintenance_mode, currency, currency_symbol, tax_enabled, tax_percentage, tax_label, tax_mode,
    tax_effective_from, child_seat_fee_pence, meet_greet_fee_pence, return_journey_fee_pence,
    policy_non_refundable_percent, policy_non_refundable_min_pence, policy_flexible_percent, policy_flexible_min_pence,
    sightseeing_threshold_minutes, tour_threshold_minutes, tour_threshold_stops, included_stop_minutes,
    price_per_extra_15min_pence, max_selected_stops, poi_corridor_enabled, poi_corridor_radius_miles, poi_corridor_max_pois,
    bing_site_verification, indexnow_key
   FROM public.site_settings
  WHERE id = 1;

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
    -- Newly publishing (not re-saving an already-live post) needs a real named author.
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published' THEN
      SELECT name, bio, avatar_url, active INTO a FROM public.blog_authors WHERE id = NEW.author_id;
      IF NOT FOUND OR a.active IS NOT TRUE THEN
        RAISE EXCEPTION 'Published posts require a named author' USING ERRCODE = 'check_violation'; END IF;
      IF a.name IS NULL OR btrim(a.name) !~ '\s' OR a.name ~* '\m(team|staff|admin|editor|editorial)\M' THEN
        RAISE EXCEPTION 'The author must be a named person (first and last name), not a team' USING ERRCODE = 'check_violation'; END IF;
      IF length(btrim(coalesce(a.bio,''))) < 40 THEN
        RAISE EXCEPTION 'The author needs a bio before this post can be published' USING ERRCODE = 'check_violation'; END IF;
      IF a.avatar_url IS NULL OR btrim(a.avatar_url) = '' THEN
        RAISE EXCEPTION 'The author needs a photo before this post can be published' USING ERRCODE = 'check_violation'; END IF;
    END IF;
    IF NEW.published_at IS NULL THEN NEW.published_at := now(); END IF;
  END IF;
  RETURN NEW;
END $function$;