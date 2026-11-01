CREATE OR REPLACE FUNCTION public.dispatch_enqueue_booking_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      'return_journey', NEW.return_journey,
      'return_date', NEW.return_date,
      'return_time', NEW.return_time,
      'occurred_at', now()
    ));
    queued := true;
  END LOOP;

  IF queued THEN
    PERFORM public.dispatch_wake_delivery();
  END IF;

  RETURN NEW;
END;
$function$;