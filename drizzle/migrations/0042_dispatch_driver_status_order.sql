CREATE OR REPLACE FUNCTION public.bookings_field_status_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE rank_old int; rank_new int;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF coalesce(auth.role(), '') = 'service_role' OR auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF OLD.status IN ('completed','cancelled','rejected') THEN
    RAISE EXCEPTION 'Booking status is final (%) and cannot be changed', OLD.status USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.status IN ('driver_en_route','passenger_on_board','completed')
     AND NEW.pickup_date IS NOT NULL AND NEW.pickup_date > (now() AT TIME ZONE 'Europe/London')::date THEN
    RAISE EXCEPTION 'This trip is on %; it cannot be marked % before the pickup day', NEW.pickup_date, replace(NEW.status::text,'_',' ') USING ERRCODE = 'check_violation';
  END IF;
  rank_old := CASE OLD.status WHEN 'confirmed' THEN 1 WHEN 'assigned' THEN 2 WHEN 'driver_en_route' THEN 3 WHEN 'on_way' THEN 3 WHEN 'passenger_on_board' THEN 4 WHEN 'in_progress' THEN 4 ELSE 0 END;
  rank_new := CASE NEW.status WHEN 'confirmed' THEN 1 WHEN 'assigned' THEN 2 WHEN 'driver_en_route' THEN 3 WHEN 'passenger_on_board' THEN 4 WHEN 'completed' THEN 5 ELSE 0 END;
  IF rank_new < rank_old AND NOT (OLD.status = 'assigned' AND NEW.status = 'confirmed' AND public.has_role(auth.uid(), 'dispatch')) THEN
    RAISE EXCEPTION 'Job stages only move forward (% -> %)', OLD.status, NEW.status USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.status IN ('driver_en_route','passenger_on_board','completed') AND OLD.status IN ('new','awaiting_payment','pending_payment','payment_failed','expired') THEN
    RAISE EXCEPTION 'Confirm and assign the booking before starting the job' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS bookings_field_status_order ON public.bookings;
CREATE TRIGGER bookings_field_status_order BEFORE UPDATE OF status ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.bookings_field_status_order();