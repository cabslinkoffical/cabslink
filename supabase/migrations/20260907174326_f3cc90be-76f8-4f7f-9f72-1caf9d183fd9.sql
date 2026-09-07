CREATE OR REPLACE FUNCTION public.set_booking_status(_booking_id uuid, _new_status booking_status, _actor_id uuid, _reason text DEFAULT NULL::text, _override boolean DEFAULT false)
RETURNS TABLE(id uuid, status booking_status, previous_status booking_status, changed boolean, transition_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  UPDATE public.bookings b
     SET status = _new_status,
         cancellation_reason = CASE WHEN _new_status IN ('cancelled','rejected')
           THEN COALESCE(NULLIF(btrim(_reason), ''), b.cancellation_reason) ELSE b.cancellation_reason END,
         updated_at = now()
   WHERE b.id = _booking_id;
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
REVOKE ALL ON FUNCTION public.set_booking_status(uuid, public.booking_status, uuid, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_booking_status(uuid, public.booking_status, uuid, text, boolean) TO service_role;