
-- ================================================================
-- Phase 2A — Booking lifecycle, confirmation tokens, notifications
-- ================================================================

-- 1) Extend booking_status enum (additive; existing values preserved)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid='booking_status'::regtype AND enumlabel='awaiting_payment') THEN
    ALTER TYPE booking_status ADD VALUE 'awaiting_payment';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid='booking_status'::regtype AND enumlabel='driver_en_route') THEN
    ALTER TYPE booking_status ADD VALUE 'driver_en_route';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid='booking_status'::regtype AND enumlabel='passenger_on_board') THEN
    ALTER TYPE booking_status ADD VALUE 'passenger_on_board';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid='booking_status'::regtype AND enumlabel='rejected') THEN
    ALTER TYPE booking_status ADD VALUE 'rejected';
  END IF;
END $$;

-- 2) Bookings — confirmation tokens, cancellation reason, unique booking_ref
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS confirmation_token_hash text,
  ADD COLUMN IF NOT EXISTS confirmation_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_booking_ref_key
  ON public.bookings (booking_ref) WHERE booking_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_confirmation_token_hash_key
  ON public.bookings (confirmation_token_hash) WHERE confirmation_token_hash IS NOT NULL;

-- 3) Notification log — operational columns for retries + provider tracking
ALTER TABLE public.notification_log
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notification_type text,
  ADD COLUMN IF NOT EXISTS recipient_category text,
  ADD COLUMN IF NOT EXISTS provider_message_id text,
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS error_category text;

CREATE INDEX IF NOT EXISTS notification_log_booking_id_idx
  ON public.notification_log (booking_id);
CREATE INDEX IF NOT EXISTS notification_log_status_idx
  ON public.notification_log (status);

-- 4) Site settings — payment mode + admin notification email (soft, nullable)
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS admin_notification_email text;

ALTER TABLE public.site_settings
  DROP CONSTRAINT IF EXISTS site_settings_payment_mode_chk;
ALTER TABLE public.site_settings
  ADD CONSTRAINT site_settings_payment_mode_chk
  CHECK (payment_mode IN ('manual', 'pay_later', 'online'));

-- 5) Server-side booking reference generator: CL-YYMMDD-XXXX
CREATE OR REPLACE FUNCTION public.generate_booking_ref()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  candidate text;
  attempt int := 0;
  -- Ambiguity-free alphabet (no 0/O/1/I) so refs read cleanly over the phone
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  seg text;
  ch text;
  i int;
  found boolean;
BEGIN
  LOOP
    seg := '';
    FOR i IN 1..4 LOOP
      ch := substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
      seg := seg || ch;
    END LOOP;
    candidate := 'CL-' || to_char(now() AT TIME ZONE 'UTC', 'YYMMDD') || '-' || seg;
    SELECT EXISTS (SELECT 1 FROM public.bookings WHERE booking_ref = candidate) INTO found;
    IF NOT found THEN
      RETURN candidate;
    END IF;
    attempt := attempt + 1;
    IF attempt > 12 THEN
      -- Extremely unlikely; extend the segment on repeated collisions
      RAISE EXCEPTION 'Unable to generate unique booking reference after % attempts', attempt;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_booking_ref() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_booking_ref() TO service_role;

-- 6) Backfill: existing rows without a ref get one
UPDATE public.bookings
SET booking_ref = public.generate_booking_ref()
WHERE booking_ref IS NULL OR btrim(booking_ref) = '';

-- 7) Controlled status transition helper
CREATE OR REPLACE FUNCTION public.set_booking_status(
  _booking_id uuid,
  _new_status booking_status,
  _actor_id uuid,
  _reason text DEFAULT NULL,
  _override boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  status booking_status,
  previous_status booking_status,
  changed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_status booking_status;
  allowed boolean := false;
BEGIN
  SELECT b.status INTO current_status FROM public.bookings b WHERE b.id = _booking_id FOR UPDATE;
  IF current_status IS NULL THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;

  -- Same status: no-op
  IF current_status = _new_status THEN
    RETURN QUERY SELECT _booking_id, current_status, current_status, false;
    RETURN;
  END IF;

  -- Allowed forward transitions
  allowed := CASE
    WHEN current_status = 'new'                AND _new_status IN ('awaiting_payment','confirmed','assigned','cancelled','rejected','pending_allocation') THEN true
    WHEN current_status = 'pending_allocation' AND _new_status IN ('awaiting_payment','confirmed','assigned','cancelled','rejected') THEN true
    WHEN current_status = 'awaiting_payment'   AND _new_status IN ('confirmed','cancelled','rejected') THEN true
    WHEN current_status = 'confirmed'          AND _new_status IN ('assigned','cancelled') THEN true
    WHEN current_status = 'assigned'           AND _new_status IN ('driver_en_route','on_way','in_progress','cancelled','confirmed') THEN true
    WHEN current_status = 'on_way'             AND _new_status IN ('driver_en_route','passenger_on_board','in_progress','completed','cancelled') THEN true
    WHEN current_status = 'driver_en_route'    AND _new_status IN ('passenger_on_board','in_progress','completed','cancelled') THEN true
    WHEN current_status = 'passenger_on_board' AND _new_status IN ('in_progress','completed','cancelled') THEN true
    WHEN current_status = 'in_progress'        AND _new_status IN ('passenger_on_board','completed','cancelled') THEN true
    WHEN current_status = 'bidding'            AND _new_status IN ('assigned','cancelled','rejected','new','pending_allocation') THEN true
    ELSE false
  END;

  IF NOT allowed AND NOT _override THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %', current_status, _new_status
      USING ERRCODE = 'check_violation';
  END IF;

  -- Cancellation / rejection require a reason (unless admin override)
  IF _new_status IN ('cancelled','rejected') AND (_reason IS NULL OR btrim(_reason) = '') AND NOT _override THEN
    RAISE EXCEPTION 'A reason is required when cancelling or rejecting a booking'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.bookings
     SET status = _new_status,
         cancellation_reason = CASE
           WHEN _new_status IN ('cancelled','rejected') THEN COALESCE(NULLIF(btrim(_reason), ''), cancellation_reason)
           ELSE cancellation_reason
         END,
         updated_at = now()
   WHERE id = _booking_id;

  -- Activity log entry (best effort)
  BEGIN
    INSERT INTO public.activity_logs (actor_id, action, entity, entity_id, diff)
    VALUES (
      _actor_id,
      CASE WHEN _override THEN 'status_override' ELSE 'status_change' END,
      'bookings',
      _booking_id::text,
      jsonb_build_object(
        'previous_status', current_status,
        'new_status', _new_status,
        'reason', _reason,
        'override', _override
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN QUERY SELECT _booking_id, _new_status, current_status, true;
END;
$$;

REVOKE ALL ON FUNCTION public.set_booking_status(uuid, booking_status, uuid, text, boolean) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_booking_status(uuid, booking_status, uuid, text, boolean) TO service_role;

-- 8) Public lookup by confirmation token hash (SECURITY DEFINER, minimal fields, expiry-aware)
CREATE OR REPLACE FUNCTION public.get_booking_by_confirmation_hash(_hash text)
RETURNS TABLE (
  booking_ref text,
  status booking_status,
  payment_status payment_status,
  customer_name text,
  email text,
  phone text,
  pickup_address text,
  dropoff_address text,
  pickup_date date,
  pickup_time text,
  passengers integer,
  luggage integer,
  vehicle_type text,
  flight_number text,
  child_seat boolean,
  meet_greet boolean,
  return_journey boolean,
  price numeric,
  distance_miles numeric,
  notes text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT b.booking_ref, b.status, b.payment_status, b.customer_name, b.email, b.phone,
         b.pickup_address, b.dropoff_address, b.pickup_date, b.pickup_time,
         b.passengers, b.luggage, b.vehicle_type, b.flight_number,
         b.child_seat, b.meet_greet, b.return_journey, b.price, b.distance_miles,
         b.notes, b.created_at
    FROM public.bookings b
   WHERE b.confirmation_token_hash = _hash
     AND b.deleted_at IS NULL
     AND (b.confirmation_token_expires_at IS NULL OR b.confirmation_token_expires_at > now())
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_booking_by_confirmation_hash(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_booking_by_confirmation_hash(text) TO service_role;
