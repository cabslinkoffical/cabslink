
CREATE TABLE IF NOT EXISTS public.booking_status_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  from_status booking_status,
  to_status booking_status NOT NULL,
  actor_id uuid,
  reason text,
  override boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS booking_status_transitions_booking_idx
  ON public.booking_status_transitions(booking_id, created_at DESC);
GRANT SELECT ON public.booking_status_transitions TO authenticated;
GRANT ALL ON public.booking_status_transitions TO service_role;
ALTER TABLE public.booking_status_transitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view booking status transitions" ON public.booking_status_transitions;
CREATE POLICY "Admins can view booking status transitions"
  ON public.booking_status_transitions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP FUNCTION IF EXISTS public.set_booking_status(uuid, booking_status, uuid, text, boolean);
CREATE OR REPLACE FUNCTION public.set_booking_status(
  _booking_id uuid, _new_status booking_status, _actor_id uuid,
  _reason text DEFAULT NULL, _override boolean DEFAULT false
) RETURNS TABLE(id uuid, status booking_status, previous_status booking_status, changed boolean, transition_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE current_status booking_status; allowed boolean := false; new_transition_id uuid;
BEGIN
  SELECT b.status INTO current_status FROM public.bookings b WHERE b.id = _booking_id FOR UPDATE;
  IF current_status IS NULL THEN RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002'; END IF;
  IF current_status = _new_status THEN
    RETURN QUERY SELECT _booking_id, current_status, current_status, false, NULL::uuid; RETURN;
  END IF;
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
    ELSE false END;
  IF NOT allowed AND NOT _override THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %', current_status, _new_status USING ERRCODE = 'check_violation';
  END IF;
  IF _new_status IN ('cancelled','rejected') AND (_reason IS NULL OR btrim(_reason) = '') AND NOT _override THEN
    RAISE EXCEPTION 'A reason is required when cancelling or rejecting a booking' USING ERRCODE = 'check_violation';
  END IF;
  UPDATE public.bookings
     SET status = _new_status,
         cancellation_reason = CASE WHEN _new_status IN ('cancelled','rejected')
           THEN COALESCE(NULLIF(btrim(_reason), ''), cancellation_reason) ELSE cancellation_reason END,
         updated_at = now()
   WHERE id = _booking_id;
  INSERT INTO public.booking_status_transitions (booking_id, from_status, to_status, actor_id, reason, override)
  VALUES (_booking_id, current_status, _new_status, _actor_id, _reason, _override)
  RETURNING booking_status_transitions.id INTO new_transition_id;
  BEGIN
    INSERT INTO public.activity_logs (actor_id, action, entity, entity_id, diff)
    VALUES (_actor_id,
      CASE WHEN _override THEN 'status_override' ELSE 'status_change' END,
      'bookings', _booking_id::text,
      jsonb_build_object('previous_status', current_status, 'new_status', _new_status,
        'reason', _reason, 'override', _override, 'transition_id', new_transition_id));
  EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN QUERY SELECT _booking_id, _new_status, current_status, true, new_transition_id;
END; $function$;

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS vehicles_slug_uidx ON public.vehicles(slug) WHERE slug IS NOT NULL;

INSERT INTO public.vehicles (slug, name, category, image_url, description, short_description, passengers, luggage, hand_luggage, active, needs_review, display_order, features)
SELECT s.slug, s.name, s.category, s.image_url, s.description, s.short_description, s.passengers, s.luggage, s.hand_luggage, false, true, s.display_order, s.features::jsonb
FROM (VALUES
  ('mercedes-e-class','Mercedes E-Class','Executive','','Executive saloon suited to business travel.','Executive saloon',3,2,2,10,'["Leather seats","Air conditioning","Bottled water"]'),
  ('mercedes-s-class','Mercedes S-Class','Luxury','','Luxury saloon for premium executive travel.','Luxury saloon',3,2,2,20,'["Premium leather","Extra legroom","Bottled water","Phone chargers"]'),
  ('range-rover','Range Rover','Luxury SUV','','Full-size luxury SUV for executive and VIP travel.','Luxury SUV',4,4,2,30,'["Elevated ride","Panoramic roof","Leather seats"]'),
  ('mercedes-v-class','Mercedes V-Class','MPV','','Premium 7-seat MPV for groups and family travel.','Premium 7-seat MPV',7,7,4,40,'["Individual seats","Air conditioning","Large luggage space"]'),
  ('minibus','Minibus','Minibus','','Comfortable minibus for larger groups.','Group transport',16,16,8,50,'["Air conditioning","Ample luggage room"]'),
  ('coaster','Coaster','Coach','','Mid-size coach for medium group transfers.','Mid-size coach',22,22,10,60,'["Reclining seats","Overhead storage"]'),
  ('coach','Coach','Coach','','Full-size coach for large group transfers and tours.','Full-size coach',49,49,20,70,'["Reclining seats","Air conditioning","Onboard toilet"]'),
  ('rolls-royce','Rolls-Royce','VIP','','Ultra-luxury VIP transport for weddings and prestige events.','VIP prestige',3,2,2,5,'["Chauffeur service","Champagne on request","Red-carpet arrival"]')
) AS s(slug,name,category,image_url,description,short_description,passengers,luggage,hand_luggage,display_order,features)
WHERE NOT EXISTS (SELECT 1 FROM public.vehicles v WHERE v.slug = s.slug);

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vehicle_name_snapshot text,
  ADD COLUMN IF NOT EXISTS vehicle_capacity_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS pricing_profile_id_snapshot uuid,
  ADD COLUMN IF NOT EXISTS pricing_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS quote_id uuid,
  ADD COLUMN IF NOT EXISTS quote_expires_at timestamptz;
CREATE INDEX IF NOT EXISTS bookings_vehicle_id_idx ON public.bookings(vehicle_id);
