CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.dispatch_wake_delivery()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://project--e2d845db-9efd-4dac-bae6-365b62867b96.lovable.app/api/public/dispatch/drain',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-dispatch-token', '108fb150ccac583f4849c407f8a73527519f31ec19470537'
    ),
    body := '{}'::jsonb
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_wake_delivery() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.dispatch_enqueue_booking_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ev text;
  ep record;
  queued boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    ev := 'booking.created';
  ELSIF NEW.driver_id IS DISTINCT FROM OLD.driver_id THEN
    ev := 'booking.assigned';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    ev := 'booking.status_changed';
  ELSIF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    ev := 'booking.deleted';
  ELSE
    RETURN NEW;
  END IF;

  FOR ep IN SELECT id FROM public.dispatch_endpoints WHERE active LOOP
    INSERT INTO public.dispatch_events (endpoint_id, event_type, booking_id, payload)
    VALUES (ep.id, ev, NEW.id, jsonb_build_object(
      'event', ev,
      'booking_id', NEW.id,
      'booking_ref', NEW.booking_ref,
      'status', NEW.status,
      'driver_id', NEW.driver_id,
      'pickup_date', NEW.pickup_date,
      'pickup_time', NEW.pickup_time,
      'occurred_at', now()
    ));
    queued := true;
  END LOOP;

  IF queued THEN
    PERFORM public.dispatch_wake_delivery();
  END IF;

  RETURN NEW;
END;
$$;

SELECT cron.unschedule('dispatch-retry-sweep') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dispatch-retry-sweep');

SELECT cron.schedule(
  'dispatch-retry-sweep',
  '7 * * * *',
  $$ SELECT public.dispatch_wake_delivery() WHERE EXISTS (SELECT 1 FROM public.dispatch_events WHERE status = 'pending'); $$
);