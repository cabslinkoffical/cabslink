-- Tour categories: managed list behind each tour's theme_group.
CREATE TABLE public.tour_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (length(btrim(name)) BETWEEN 2 AND 60),
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tour_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_categories TO authenticated;
GRANT ALL ON public.tour_categories TO service_role;

ALTER TABLE public.tour_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active tour categories" ON public.tour_categories
  FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "Admins manage tour categories" ON public.tour_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER tour_categories_set_updated_at BEFORE UPDATE ON public.tour_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Backfill: the categories the site already uses, in their current order, plus any value already on a tour.
INSERT INTO public.tour_categories (name, sort_order)
SELECT v.name, v.ord FROM (VALUES
  ('Castles & History', 1), ('Outlander & Film', 2), ('Highlands & Glencoe', 3), ('Lochs & National Park', 4),
  ('Villages & Heritage', 5), ('Family Days', 6), ('Coast & Landmarks', 7)) AS v(name, ord)
ON CONFLICT (name) DO NOTHING;
INSERT INTO public.tour_categories (name, sort_order)
SELECT DISTINCT btrim(theme_group), 100 FROM public.scenic_route_templates
WHERE theme_group IS NOT NULL AND btrim(theme_group) <> ''
ON CONFLICT (name) DO NOTHING;
UPDATE public.scenic_route_templates SET theme_group = btrim(theme_group) WHERE theme_group <> btrim(theme_group);

-- Renaming a category renames it on every tour; deleting one leaves its tours uncategorised.
ALTER TABLE public.scenic_route_templates
  ADD CONSTRAINT scenic_route_templates_theme_group_fkey
  FOREIGN KEY (theme_group) REFERENCES public.tour_categories(name) ON UPDATE CASCADE ON DELETE SET NULL;

-- Copy a tour into a new, independent, unpublished draft (content, stops and vehicle prices).
CREATE OR REPLACE FUNCTION public.admin_duplicate_tour(p_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_src jsonb; v_slug text; v_try text; v_n integer := 1; v_new uuid; v_columns text; v_values text; v_row jsonb;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT to_jsonb(t) INTO v_src FROM public.scenic_route_templates t WHERE t.id = p_id;
  IF v_src IS NULL THEN RAISE EXCEPTION 'Tour not found'; END IF;

  v_slug := left(regexp_replace(v_src->>'slug', '-copy(-[0-9]+)?$', ''), 100) || '-copy';
  v_try := v_slug;
  WHILE EXISTS (SELECT 1 FROM public.scenic_route_templates WHERE slug = v_try) LOOP
    v_n := v_n + 1;
    v_try := v_slug || '-' || v_n;
  END LOOP;

  v_row := (v_src - 'id' - 'created_at' - 'updated_at' - 'starting_price_pence_cache' - 'starting_price_calculated_at'
            - 'starting_price_vehicle_id' - 'direct_distance_miles_cache' - 'direct_duration_seconds_cache')
           || jsonb_build_object('slug', v_try, 'name', left(v_src->>'name', 190) || ' (copy)',
                                 'published', false, 'active', false, 'featured', false);

  SELECT string_agg(format('%I', a.attname), ', ' ORDER BY a.attnum), string_agg(format('r.%I', a.attname), ', ' ORDER BY a.attnum)
    INTO v_columns, v_values
  FROM pg_attribute a
  WHERE a.attrelid = 'public.scenic_route_templates'::regclass AND a.attnum > 0 AND NOT a.attisdropped
    AND a.attgenerated = '' AND v_row ? a.attname;
  EXECUTE format('INSERT INTO public.scenic_route_templates (%s) SELECT %s FROM jsonb_populate_record(NULL::public.scenic_route_templates, $1) r RETURNING id', v_columns, v_values)
    INTO v_new USING v_row;

  INSERT INTO public.scenic_route_template_pois (route_template_id, poi_id, stop_order, recommended, default_selected, recommended_visit_minutes, mandatory)
  SELECT v_new, poi_id, stop_order, recommended, default_selected, recommended_visit_minutes, mandatory
  FROM public.scenic_route_template_pois WHERE route_template_id = p_id;

  INSERT INTO public.template_fixed_prices (route_template_id, vehicle_class_id, price)
  SELECT v_new, vehicle_class_id, price FROM public.template_fixed_prices WHERE route_template_id = p_id;

  RETURN v_new;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_duplicate_tour(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_duplicate_tour(uuid) TO authenticated, service_role;

-- Guided create/edit: save a tour's basics, start/finish, stops and prices in one step.
-- p_id NULL creates a new unpublished draft. NULL p_stops / p_prices mean "unchanged".
CREATE OR REPLACE FUNCTION public.admin_save_tour_draft(p_id uuid, p_tour jsonb, p_stops jsonb, p_prices jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid; v_assign text; v_columns text; v_values text; v_row jsonb;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF jsonb_typeof(p_tour) IS DISTINCT FROM 'object' OR EXISTS (
    SELECT 1 FROM jsonb_object_keys(p_tour) k WHERE k NOT IN (
      'name','slug','theme','theme_group','short_description','description','hero_image_url','recommended_start_time',
      'origin_place_id','origin_label','destination_place_id','destination_label','start_mode','fixed_start_address',
      'default_duration_hours','min_duration_hours','max_duration_hours','included_miles','is_bookable','price_mode')
  ) THEN RAISE EXCEPTION 'Invalid tour details'; END IF;

  IF p_id IS NULL THEN
    IF coalesce(btrim(p_tour->>'name'), '') = '' OR coalesce(btrim(p_tour->>'slug'), '') = '' THEN
      RAISE EXCEPTION 'A tour needs a name and a web address';
    END IF;
    v_row := p_tour || jsonb_build_object('active', false, 'published', false);
    SELECT string_agg(format('%I', a.attname), ', ' ORDER BY a.attnum), string_agg(format('r.%I', a.attname), ', ' ORDER BY a.attnum)
      INTO v_columns, v_values
    FROM pg_attribute a
    WHERE a.attrelid = 'public.scenic_route_templates'::regclass AND a.attnum > 0 AND NOT a.attisdropped
      AND a.attgenerated = '' AND v_row ? a.attname;
    EXECUTE format('INSERT INTO public.scenic_route_templates (%s) SELECT %s FROM jsonb_populate_record(NULL::public.scenic_route_templates, $1) r RETURNING id', v_columns, v_values)
      INTO v_id USING v_row;
  ELSE
    SELECT string_agg(format('%1$I = v.%1$I', k), ', ') INTO v_assign FROM jsonb_object_keys(p_tour) k;
    IF v_assign IS NOT NULL THEN
      EXECUTE format('UPDATE public.scenic_route_templates t SET %s FROM jsonb_populate_record(NULL::public.scenic_route_templates, $1) v WHERE t.id = $2 RETURNING t.id', v_assign)
        INTO v_id USING p_tour, p_id;
    ELSE
      SELECT id INTO v_id FROM public.scenic_route_templates WHERE id = p_id;
    END IF;
    IF v_id IS NULL THEN RAISE EXCEPTION 'Tour not found'; END IF;
  END IF;

  IF p_stops IS NOT NULL THEN
    IF jsonb_typeof(p_stops) <> 'array' OR jsonb_array_length(p_stops) > 30 THEN RAISE EXCEPTION 'Invalid stops'; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_stops) AS x(poi_id uuid, recommended_visit_minutes integer)
               WHERE poi_id IS NULL OR coalesce(recommended_visit_minutes, 0) < 0 OR coalesce(recommended_visit_minutes, 0) > 600)
      THEN RAISE EXCEPTION 'Invalid stop'; END IF;
    IF (SELECT count(*) <> count(DISTINCT poi_id) FROM jsonb_to_recordset(p_stops) AS x(poi_id uuid))
      THEN RAISE EXCEPTION 'Each stop can only be added once'; END IF;
    DELETE FROM public.scenic_route_template_pois WHERE route_template_id = v_id;
    INSERT INTO public.scenic_route_template_pois (route_template_id, poi_id, stop_order, mandatory, default_selected, recommended, recommended_visit_minutes)
    SELECT v_id, x.poi_id, x.ord::integer, coalesce(x.mandatory, false), coalesce(x.default_selected, true) OR coalesce(x.mandatory, false),
           coalesce(x.default_selected, true), x.recommended_visit_minutes
    FROM jsonb_to_recordset(p_stops) WITH ORDINALITY AS x(poi_id uuid, mandatory boolean, default_selected boolean, recommended_visit_minutes integer, ord bigint);
  END IF;

  IF p_prices IS NOT NULL THEN
    IF jsonb_typeof(p_prices) <> 'array' OR jsonb_array_length(p_prices) > 60 THEN RAISE EXCEPTION 'Invalid prices'; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_prices) AS x(vehicle_class_id uuid, price numeric)
      WHERE vehicle_class_id IS NULL OR price IS NULL OR price < 0 OR price > 100000)
      THEN RAISE EXCEPTION 'Invalid price'; END IF;
    DELETE FROM public.template_fixed_prices WHERE route_template_id = v_id;
    INSERT INTO public.template_fixed_prices (route_template_id, vehicle_class_id, price)
    SELECT v_id, vehicle_class_id, round(price, 2) FROM jsonb_to_recordset(p_prices) AS x(vehicle_class_id uuid, price numeric);
  END IF;

  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_save_tour_draft(uuid, jsonb, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_tour_draft(uuid, jsonb, jsonb, jsonb) TO authenticated, service_role;