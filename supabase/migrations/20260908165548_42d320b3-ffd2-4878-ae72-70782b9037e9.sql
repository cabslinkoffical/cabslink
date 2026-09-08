CREATE POLICY "Dispatch can view bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'dispatch') AND deleted_at IS NULL);

CREATE POLICY "Dispatch can update assignment" ON public.bookings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'dispatch') AND deleted_at IS NULL)
  WITH CHECK (public.has_role(auth.uid(), 'dispatch') AND deleted_at IS NULL);

CREATE POLICY "Dispatch can view drivers" ON public.drivers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'dispatch'));

CREATE POLICY "Dispatch can view vehicles" ON public.vehicles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'dispatch'));

CREATE POLICY "Dispatch can view vehicle classes" ON public.vehicle_classes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'dispatch'));

CREATE OR REPLACE FUNCTION public.dispatch_guard_booking_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'dispatch') THEN
    -- Dispatch may only touch assignment/progress fields.
    IF (NEW.price IS DISTINCT FROM OLD.price)
       OR (NEW.customer_name IS DISTINCT FROM OLD.customer_name)
       OR (NEW.email IS DISTINCT FROM OLD.email)
       OR (NEW.phone IS DISTINCT FROM OLD.phone)
       OR (NEW.pickup_address IS DISTINCT FROM OLD.pickup_address)
       OR (NEW.dropoff_address IS DISTINCT FROM OLD.dropoff_address)
       OR (NEW.pickup_date IS DISTINCT FROM OLD.pickup_date)
       OR (NEW.pickup_time IS DISTINCT FROM OLD.pickup_time)
       OR (NEW.payment_status IS DISTINCT FROM OLD.payment_status)
       OR (NEW.deleted_at IS DISTINCT FROM OLD.deleted_at)
       OR (NEW.pricing_snapshot IS DISTINCT FROM OLD.pricing_snapshot)
    THEN
      RAISE EXCEPTION 'Dispatch may only update driver assignment, job status and dispatch notes';
    END IF;
    IF NEW.status NOT IN ('assigned','driver_en_route','passenger_on_board','completed','confirmed') THEN
      RAISE EXCEPTION 'Dispatch may not set status %', NEW.status;
    END IF;
    IF NEW.driver_id IS DISTINCT FROM OLD.driver_id AND NEW.driver_id IS NOT NULL THEN
      NEW.assigned_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_dispatch_guard ON public.bookings;
CREATE TRIGGER bookings_dispatch_guard
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_guard_booking_update();

ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;