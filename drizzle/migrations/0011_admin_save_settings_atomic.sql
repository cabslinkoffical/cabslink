CREATE OR REPLACE FUNCTION public.admin_save_settings(p_settings jsonb, p_credentials jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE assignments text; cols text; vals text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
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
$$;
REVOKE ALL ON FUNCTION public.admin_save_settings(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_settings(jsonb, jsonb) TO authenticated;