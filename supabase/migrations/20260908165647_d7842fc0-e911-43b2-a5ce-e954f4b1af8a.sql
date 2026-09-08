ALTER TABLE public.dispatch_endpoints ADD COLUMN IF NOT EXISTS secret text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex');

CREATE OR REPLACE FUNCTION public.dispatch_enqueue_booking_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ev text;
  ep record;
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
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_enqueue_booking_event() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS bookings_dispatch_enqueue ON public.bookings;
CREATE TRIGGER bookings_dispatch_enqueue
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_enqueue_booking_event();