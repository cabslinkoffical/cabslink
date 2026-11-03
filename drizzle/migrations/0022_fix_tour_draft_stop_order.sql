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
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_stops) e
               WHERE NULLIF(e->>'poi_id', '') IS NULL
                  OR coalesce((e->>'recommended_visit_minutes')::integer, 0) < 0
                  OR coalesce((e->>'recommended_visit_minutes')::integer, 0) > 600)
      THEN RAISE EXCEPTION 'Invalid stop'; END IF;
    IF (SELECT count(*) <> count(DISTINCT e->>'poi_id') FROM jsonb_array_elements(p_stops) e)
      THEN RAISE EXCEPTION 'Each stop can only be added once'; END IF;
    DELETE FROM public.scenic_route_template_pois WHERE route_template_id = v_id;
    INSERT INTO public.scenic_route_template_pois (route_template_id, poi_id, stop_order, mandatory, default_selected, recommended, recommended_visit_minutes)
    SELECT v_id, (e.val->>'poi_id')::uuid, e.ord::integer,
           coalesce((e.val->>'mandatory')::boolean, false),
           coalesce((e.val->>'default_selected')::boolean, true) OR coalesce((e.val->>'mandatory')::boolean, false),
           coalesce((e.val->>'default_selected')::boolean, true),
           (e.val->>'recommended_visit_minutes')::integer
    FROM jsonb_array_elements(p_stops) WITH ORDINALITY AS e(val, ord);
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