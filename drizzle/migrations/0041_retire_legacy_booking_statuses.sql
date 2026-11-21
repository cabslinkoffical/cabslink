CREATE OR REPLACE FUNCTION public.bookings_block_legacy_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IN ('pending_allocation','bidding','on_way','in_progress')
     AND (TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status) THEN
    RAISE EXCEPTION 'Status % is retired; use New, Driver en route or Passenger on board instead', NEW.status USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS bookings_block_legacy_status ON public.bookings;
CREATE TRIGGER bookings_block_legacy_status BEFORE INSERT OR UPDATE OF status ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.bookings_block_legacy_status();