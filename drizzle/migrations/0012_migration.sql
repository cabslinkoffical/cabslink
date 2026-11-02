ALTER TABLE public.scenic_route_templates
  ADD COLUMN IF NOT EXISTS price_mode text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS auto_price_route_miles numeric,
  ADD COLUMN IF NOT EXISTS auto_price_calculated_at timestamptz;

DO $$ BEGIN
  ALTER TABLE public.scenic_route_templates
    ADD CONSTRAINT scenic_route_templates_price_mode_check CHECK (price_mode IN ('manual', 'auto'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Saves a tour's booking settings, price mode and per-vehicle prices in one
-- transaction, so a failed step never leaves a tour with half its prices.
CREATE OR REPLACE FUNCTION public.admin_save_tour_pricing(p_id uuid, p_settings jsonb, p_prices jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE saved_id uuid; assignments text;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF jsonb_typeof(p_settings) IS DISTINCT FROM 'object' OR EXISTS (
    SELECT 1 FROM jsonb_object_keys(p_settings) k WHERE k NOT IN (
      'is_bookable','default_duration_hours','min_duration_hours','max_duration_hours','included_miles',
      'start_mode','fixed_start_address','price_mode','auto_price_route_miles','auto_price_calculated_at')
  ) THEN RAISE EXCEPTION 'Invalid payload'; END IF;

  SELECT string_agg(format('%1$I = v.%1$I', k), ', ') INTO assignments FROM jsonb_object_keys(p_settings) k;
  IF assignments IS NOT NULL THEN
    EXECUTE format('UPDATE public.scenic_route_templates t SET %s FROM jsonb_populate_record(NULL::public.scenic_route_templates, $1) v WHERE t.id = $2 RETURNING t.id', assignments)
      INTO saved_id USING p_settings, p_id;
  ELSE
    SELECT id INTO saved_id FROM public.scenic_route_templates WHERE id = p_id;
  END IF;
  IF saved_id IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;

  IF p_prices IS NOT NULL THEN
    IF jsonb_typeof(p_prices) <> 'array' OR jsonb_array_length(p_prices) > 60 THEN RAISE EXCEPTION 'Invalid prices'; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_prices) AS x(vehicle_class_id uuid, price numeric)
      WHERE vehicle_class_id IS NULL OR price IS NULL OR price < 0 OR price > 100000)
      THEN RAISE EXCEPTION 'Invalid price'; END IF;
    DELETE FROM public.template_fixed_prices WHERE route_template_id = saved_id;
    INSERT INTO public.template_fixed_prices(route_template_id, vehicle_class_id, price)
      SELECT saved_id, vehicle_class_id, round(price, 2) FROM jsonb_to_recordset(p_prices)
        AS x(vehicle_class_id uuid, price numeric);
  END IF;
  RETURN saved_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_save_tour_pricing(uuid, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_tour_pricing(uuid, jsonb, jsonb) TO authenticated, service_role;