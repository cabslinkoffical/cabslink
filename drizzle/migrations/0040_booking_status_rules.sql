CREATE OR REPLACE FUNCTION public.set_booking_status(_booking_id uuid, _new_status booking_status, _actor_id uuid, _reason text DEFAULT NULL::text, _override boolean DEFAULT false)
 RETURNS TABLE(id uuid, status booking_status, previous_status booking_status, changed boolean, transition_id uuid)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE current_status booking_status; current_payment payment_status; pickup date; allowed boolean := false; new_transition_id uuid;
BEGIN
  SELECT b.status, b.payment_status, b.pickup_date INTO current_status, current_payment, pickup FROM public.bookings b WHERE b.id = _booking_id FOR UPDATE;
  IF current_status IS NULL THEN RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002'; END IF;
  IF current_status = _new_status THEN
    RETURN QUERY SELECT _booking_id, current_status, current_status, false, NULL::uuid; RETURN;
  END IF;
  IF current_status IN ('completed','cancelled','rejected') THEN
    RAISE EXCEPTION 'Booking status is final (%) and cannot be changed', current_status USING ERRCODE = 'check_violation';
  END IF;
  IF current_payment IN ('paid','partial') THEN
    IF _new_status IN ('new','pending_allocation','bidding','awaiting_payment','rejected','pending_payment','payment_failed','expired') THEN
      RAISE EXCEPTION 'A paid booking cannot go back to an unpaid or rejected status' USING ERRCODE = 'check_violation';
    END IF;
    IF _new_status = 'cancelled' AND NOT _override THEN
      RAISE EXCEPTION 'A paid booking is cancelled through Cancellations & Refunds so the refund is handled' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF _new_status IN ('driver_en_route','on_way','passenger_on_board','in_progress','completed')
     AND pickup IS NOT NULL AND pickup > (now() AT TIME ZONE 'Europe/London')::date AND NOT _override THEN
    RAISE EXCEPTION 'This trip is on %; it cannot be marked % before the pickup day', pickup, replace(_new_status::text,'_',' ') USING ERRCODE = 'check_violation';
  END IF;
  allowed := CASE
    WHEN current_status IN ('new','pending_allocation','bidding') AND _new_status IN ('awaiting_payment','confirmed','assigned','cancelled','rejected','pending_allocation','new') THEN true
    WHEN current_status IN ('pending_payment','payment_failed','expired') AND _new_status IN ('awaiting_payment','confirmed','cancelled') THEN true
    WHEN current_status = 'awaiting_payment'   AND _new_status IN ('confirmed','assigned','cancelled','rejected') THEN true
    WHEN current_status = 'confirmed'          AND _new_status IN ('assigned','awaiting_payment','cancelled') THEN true
    WHEN current_status = 'assigned'           AND _new_status IN ('driver_en_route','on_way','in_progress','passenger_on_board','completed','cancelled','confirmed') THEN true
    WHEN current_status IN ('on_way','driver_en_route') AND _new_status IN ('driver_en_route','passenger_on_board','in_progress','completed','cancelled') THEN true
    WHEN current_status IN ('passenger_on_board','in_progress') AND _new_status IN ('passenger_on_board','in_progress','completed') THEN true
    ELSE false END;
  IF NOT allowed AND NOT _override THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %', current_status, _new_status USING ERRCODE = 'check_violation';
  END IF;
  IF _new_status IN ('cancelled','rejected') AND (_reason IS NULL OR btrim(_reason) = '') AND NOT _override THEN
    RAISE EXCEPTION 'A reason is required when cancelling or rejecting a booking' USING ERRCODE = 'check_violation';
  END IF;
  UPDATE public.bookings AS bk
     SET status = _new_status,
         cancellation_reason = CASE WHEN _new_status IN ('cancelled','rejected')
           THEN COALESCE(NULLIF(btrim(_reason), ''), bk.cancellation_reason) ELSE bk.cancellation_reason END,
         updated_at = now()
   WHERE bk.id = _booking_id;
  INSERT INTO public.booking_status_transitions (booking_id, from_status, to_status, actor_id, reason, override)
  VALUES (_booking_id, current_status, _new_status, _actor_id, _reason, _override)
  RETURNING booking_status_transitions.id INTO new_transition_id;
  BEGIN
    INSERT INTO public.activity_logs (actor_id, action, entity, entity_id, diff)
    VALUES (_actor_id, CASE WHEN _override THEN 'status_override' ELSE 'status_change' END, 'bookings', _booking_id::text,
      jsonb_build_object('previous_status', current_status, 'new_status', _new_status, 'reason', _reason, 'override', _override, 'transition_id', new_transition_id));
  EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN QUERY SELECT _booking_id, _new_status, current_status, true, new_transition_id;
END; $function$;