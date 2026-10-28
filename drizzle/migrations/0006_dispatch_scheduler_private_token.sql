CREATE OR REPLACE FUNCTION public.dispatch_wake_delivery()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_token text;
BEGIN
  SELECT value INTO v_token FROM public.private_settings WHERE key='dispatch_drain_token';
  IF v_token IS NULL OR length(v_token)<32 THEN RETURN; END IF;
  PERFORM net.http_post(
    url := 'https://project--e2d845db-9efd-4dac-bae6-365b62867b96.lovable.app/api/public/dispatch/drain',
    headers := jsonb_build_object('content-type','application/json','x-dispatch-token',v_token),
    body := '{}'::jsonb
  );
EXCEPTION WHEN OTHERS THEN NULL;
END;
$function$;
REVOKE ALL ON FUNCTION public.dispatch_wake_delivery() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_wake_delivery() TO service_role;