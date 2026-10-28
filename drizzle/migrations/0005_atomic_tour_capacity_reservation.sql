CREATE OR REPLACE FUNCTION public.reserve_tour_booking(_booking jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_class public.vehicle_classes%ROWTYPE; v_cap integer; v_used integer; v_tpl public.scenic_route_templates%ROWTYPE; v_id uuid; v_columns text; v_values text; v_hours numeric; v_day date;
BEGIN
  SELECT * INTO v_class FROM public.vehicle_classes WHERE id = (_booking->>'vehicle_class_id')::uuid FOR UPDATE;
  IF NOT FOUND OR v_class.active IS DISTINCT FROM true THEN RAISE EXCEPTION 'Choose an available vehicle.'; END IF;
  v_hours := (_booking->>'booked_hours')::numeric;
  v_day := (_booking->>'pickup_date')::date;
  IF v_hours IS NULL OR v_day IS NULL OR (_booking->>'passengers')::integer IS NULL OR (_booking->>'luggage')::integer IS NULL THEN RAISE EXCEPTION 'Tour details are incomplete.'; END IF;
  IF (_booking->>'passengers')::integer < 1 OR (_booking->>'passengers')::integer > COALESCE(v_class.max_passengers,v_class.passengers) THEN RAISE EXCEPTION 'That vehicle cannot carry this many passengers.'; END IF;
  IF (_booking->>'luggage')::integer < 0 OR (_booking->>'luggage')::integer > COALESCE(v_class.max_luggage,v_class.large_luggage) THEN RAISE EXCEPTION 'That vehicle cannot carry this much luggage.'; END IF;
  IF (v_class.min_hours IS NOT NULL AND v_hours < v_class.min_hours) OR (v_class.max_hours IS NOT NULL AND v_hours > v_class.max_hours) THEN RAISE EXCEPTION 'Choose a duration available for this vehicle.'; END IF;
  IF NULLIF(_booking->>'scenic_template_id','') IS NOT NULL THEN
    SELECT * INTO v_tpl FROM public.scenic_route_templates WHERE id = (_booking->>'scenic_template_id')::uuid FOR SHARE;
    IF NOT FOUND OR v_tpl.active IS DISTINCT FROM true OR v_tpl.published IS DISTINCT FROM true OR v_tpl.is_bookable IS DISTINCT FROM true THEN RAISE EXCEPTION 'That tour is not available to book online.'; END IF;
  END IF;
  SELECT max_tours_per_day INTO v_cap FROM public.vehicle_class_daily_capacity WHERE vehicle_class_id=v_class.id FOR UPDATE;
  IF FOUND THEN
    SELECT count(*) INTO v_used FROM public.bookings WHERE service_type='private_tour' AND vehicle_class_id=v_class.id AND pickup_date=v_day AND status IN ('new','awaiting_payment','pending_payment','confirmed','assigned','in_progress');
    IF v_used >= v_cap THEN RAISE EXCEPTION 'That vehicle is fully booked on your date.'; END IF;
  END IF;
  -- Only supplied valid columns are inserted, so database defaults remain intact.
  SELECT string_agg(format('%I',a.attname),', ' ORDER BY a.attnum), string_agg(format('r.%I',a.attname),', ' ORDER BY a.attnum)
  INTO v_columns,v_values FROM pg_attribute a WHERE a.attrelid='public.bookings'::regclass AND a.attnum>0 AND NOT a.attisdropped AND a.attgenerated='' AND _booking ? a.attname;
  IF v_columns IS NULL THEN RAISE EXCEPTION 'Tour details are incomplete.'; END IF;
  EXECUTE format('INSERT INTO public.bookings (%s) SELECT %s FROM jsonb_populate_record(NULL::public.bookings,$1) r RETURNING id',v_columns,v_values) INTO v_id USING _booking;
  RETURN v_id;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.reserve_tour_booking(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_tour_booking(jsonb) TO service_role;