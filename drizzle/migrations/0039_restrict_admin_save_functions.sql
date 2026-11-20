CREATE OR REPLACE FUNCTION public.admin_save_extra(p_id uuid, p_extra jsonb, p_links jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE saved_id uuid; col_list text; assignments text;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
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
$function$
;
CREATE OR REPLACE FUNCTION public.admin_save_settings(p_settings jsonb, p_credentials jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE assignments text; cols text; vals text;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF jsonb_typeof(coalesce(p_settings, '{}'::jsonb)) <> 'object' OR jsonb_typeof(coalesce(p_credentials, '{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'Invalid payload';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(coalesce(p_settings, '{}'::jsonb)) k
             WHERE k IN ('id','created_at','updated_at')
                OR NOT EXISTS (SELECT 1 FROM information_schema.columns c
                               WHERE c.table_schema = 'public' AND c.table_name = 'site_settings' AND c.column_name = k)) THEN
    RAISE EXCEPTION 'Unknown settings field';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(coalesce(p_credentials, '{}'::jsonb)) k
             WHERE k NOT IN ('smtp_host','smtp_port','smtp_user','google_maps_api_key')) THEN
    RAISE EXCEPTION 'Unknown credentials field';
  END IF;

  SELECT string_agg(format('%1$I = v.%1$I', k), ', ') INTO assignments
    FROM jsonb_object_keys(coalesce(p_settings, '{}'::jsonb)) k;
  IF assignments IS NOT NULL THEN
    EXECUTE format('UPDATE public.site_settings t SET %s FROM jsonb_populate_record(NULL::public.site_settings, $1) v WHERE t.id = 1', assignments)
      USING p_settings;
    IF NOT FOUND THEN RAISE EXCEPTION 'Settings row missing'; END IF;
  END IF;

  SELECT string_agg(format('%I', k), ', '), string_agg(format('%1$I = EXCLUDED.%1$I', k), ', ') INTO cols, assignments
    FROM jsonb_object_keys(coalesce(p_credentials, '{}'::jsonb)) k;
  IF cols IS NOT NULL THEN
    EXECUTE format(
      'INSERT INTO public.site_credentials (id, %1$s) SELECT 1, %2$s FROM jsonb_populate_record(NULL::public.site_credentials, $1) v ON CONFLICT (id) DO UPDATE SET %3$s',
      cols,
      (SELECT string_agg(format('v.%I', k), ', ') FROM jsonb_object_keys(p_credentials) k),
      assignments)
      USING p_credentials;
  END IF;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.admin_save_settings(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_save_extra(uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_save_tour_draft(uuid, jsonb, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_duplicate_tour(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_settings(jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_save_extra(uuid, jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_save_tour_draft(uuid, jsonb, jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_duplicate_tour(uuid) TO service_role;