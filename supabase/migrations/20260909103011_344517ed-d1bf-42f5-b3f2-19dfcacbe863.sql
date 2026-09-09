ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS drivers_user_id_key ON public.drivers (user_id) WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.current_driver_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.drivers WHERE user_id = auth.uid() LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.current_driver_id() TO authenticated;

DROP POLICY IF EXISTS "Drivers can view own record" ON public.drivers;
CREATE POLICY "Drivers can view own record"
ON public.drivers FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Drivers can view own jobs" ON public.bookings;
CREATE POLICY "Drivers can view own jobs"
ON public.bookings FOR SELECT TO authenticated
USING (deleted_at IS NULL AND driver_id IS NOT NULL AND driver_id = public.current_driver_id());

DROP POLICY IF EXISTS "Drivers can update own job stage" ON public.bookings;
CREATE POLICY "Drivers can update own job stage"
ON public.bookings FOR UPDATE TO authenticated
USING (deleted_at IS NULL AND driver_id IS NOT NULL AND driver_id = public.current_driver_id())
WITH CHECK (deleted_at IS NULL AND driver_id IS NOT NULL AND driver_id = public.current_driver_id());

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
    RETURN NEW;
  END IF;

  IF OLD.driver_id IS NOT NULL AND OLD.driver_id = public.current_driver_id() THEN
    -- A driver may only move their own job through its stages.
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
       OR (NEW.driver_id IS DISTINCT FROM OLD.driver_id)
    THEN
      RAISE EXCEPTION 'Drivers may only update the job stage of their own jobs';
    END IF;
    IF NEW.status NOT IN ('assigned','driver_en_route','passenger_on_board','completed') THEN
      RAISE EXCEPTION 'Drivers may not set status %', NEW.status;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;