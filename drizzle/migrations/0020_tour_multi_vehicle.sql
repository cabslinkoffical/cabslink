ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS tour_vehicles jsonb;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS vehicle_count integer NOT NULL DEFAULT 1;
COMMENT ON COLUMN public.bookings.tour_vehicles IS 'Tours with more than one vehicle: [{vehicle_class_id, name, passengers, luggage, price}], one entry per vehicle. NULL means the single vehicle in vehicle_class_id.';

-- Vehicles of one class already taken by tour bookings on a day (a multi-vehicle
-- booking counts every vehicle it uses).
CREATE OR REPLACE FUNCTION public.tour_vehicles_used(_class uuid, _day date)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    CASE
      WHEN b.tour_vehicles IS NULL OR jsonb_typeof(b.tour_vehicles) <> 'array' OR jsonb_array_length(b.tour_vehicles) = 0
        THEN CASE WHEN b.vehicle_class_id = _class THEN 1 ELSE 0 END
      ELSE (SELECT count(*) FROM jsonb_array_elements(b.tour_vehicles) e WHERE e->>'vehicle_class_id' = _class::text)
    END
  ), 0)::integer
  FROM public.bookings b
  WHERE b.service_type = 'private_tour'
    AND b.pickup_date = _day
    AND b.status IN ('new','awaiting_payment','pending_payment','confirmed','assigned','in_progress')
    AND (b.vehicle_class_id = _class OR b.tour_vehicles @> jsonb_build_array(jsonb_build_object('vehicle_class_id', _class::text)))
$$;
REVOKE ALL ON FUNCTION public.tour_vehicles_used(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tour_vehicles_used(uuid, date) TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_tour_booking(_booking jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_class public.vehicle_classes%ROWTYPE; v_cap integer; v_used integer; v_tpl public.scenic_route_templates%ROWTYPE;
  v_id uuid; v_columns text; v_values text; v_hours numeric; v_day date;
  v_vehicles jsonb; v_el jsonb; v_need record; v_pax integer := 0; v_lug integer := 0; v_n integer;
BEGIN
  v_hours := (_booking->>'booked_hours')::numeric;
  v_day := (_booking->>'pickup_date')::date;
  IF v_hours IS NULL OR v_day IS NULL OR (_booking->>'passengers')::integer IS NULL OR (_booking->>'luggage')::integer IS NULL THEN RAISE EXCEPTION 'Tour details are incomplete.'; END IF;

  v_vehicles := _booking->'tour_vehicles';
  IF v_vehicles IS NULL OR jsonb_typeof(v_vehicles) = 'null' OR (jsonb_typeof(v_vehicles) = 'array' AND jsonb_array_length(v_vehicles) = 0) THEN
    v_vehicles := jsonb_build_array(jsonb_build_object(
      'vehicle_class_id', _booking->>'vehicle_class_id',
      'passengers', (_booking->>'passengers')::integer,
      'luggage', (_booking->>'luggage')::integer));
    _booking := _booking - 'tour_vehicles';
  ELSIF jsonb_typeof(v_vehicles) <> 'array' THEN
    RAISE EXCEPTION 'Tour details are incomplete.';
  END IF;
  v_n := jsonb_array_length(v_vehicles);
  IF v_n > 6 THEN RAISE EXCEPTION 'Please call us to book more than 6 vehicles.'; END IF;
  IF (v_vehicles->0->>'vehicle_class_id') IS DISTINCT FROM (_booking->>'vehicle_class_id') THEN RAISE EXCEPTION 'Tour details are incomplete.'; END IF;
  IF COALESCE((_booking->>'vehicle_count')::integer, 1) <> v_n THEN RAISE EXCEPTION 'Tour details are incomplete.'; END IF;

  -- Lock every class involved in a stable order, then check each vehicle and the daily caps.
  FOR v_need IN
    SELECT (e->>'vehicle_class_id')::uuid AS class_id, count(*)::integer AS needed
    FROM jsonb_array_elements(v_vehicles) e GROUP BY 1 ORDER BY 1
  LOOP
    SELECT * INTO v_class FROM public.vehicle_classes WHERE id = v_need.class_id FOR UPDATE;
    IF NOT FOUND OR v_class.active IS DISTINCT FROM true THEN RAISE EXCEPTION 'Choose an available vehicle.'; END IF;
    IF (v_class.min_hours IS NOT NULL AND v_hours < v_class.min_hours) OR (v_class.max_hours IS NOT NULL AND v_hours > v_class.max_hours) THEN RAISE EXCEPTION 'Choose a duration available for this vehicle.'; END IF;
    FOR v_el IN SELECT e FROM jsonb_array_elements(v_vehicles) e WHERE (e->>'vehicle_class_id')::uuid = v_need.class_id LOOP
      IF (v_el->>'passengers')::integer IS NULL OR (v_el->>'passengers')::integer < 1 OR (v_el->>'passengers')::integer > COALESCE(v_class.max_passengers, v_class.passengers) THEN RAISE EXCEPTION 'That vehicle cannot carry this many passengers.'; END IF;
      IF (v_el->>'luggage')::integer IS NULL OR (v_el->>'luggage')::integer < 0 OR (v_el->>'luggage')::integer > COALESCE(v_class.max_luggage, v_class.large_luggage) THEN RAISE EXCEPTION 'That vehicle cannot carry this much luggage.'; END IF;
      v_pax := v_pax + (v_el->>'passengers')::integer;
      v_lug := v_lug + (v_el->>'luggage')::integer;
    END LOOP;
    SELECT max_tours_per_day INTO v_cap FROM public.vehicle_class_daily_capacity WHERE vehicle_class_id = v_class.id FOR UPDATE;
    IF FOUND THEN
      v_used := public.tour_vehicles_used(v_class.id, v_day);
      IF v_used + v_need.needed > v_cap THEN RAISE EXCEPTION 'That vehicle is fully booked on your date.'; END IF;
    END IF;
  END LOOP;
  IF v_pax <> (_booking->>'passengers')::integer OR v_lug <> (_booking->>'luggage')::integer THEN RAISE EXCEPTION 'Tour details are incomplete.'; END IF;

  IF NULLIF(_booking->>'scenic_template_id','') IS NOT NULL THEN
    SELECT * INTO v_tpl FROM public.scenic_route_templates WHERE id = (_booking->>'scenic_template_id')::uuid FOR SHARE;
    IF NOT FOUND OR v_tpl.active IS DISTINCT FROM true OR v_tpl.published IS DISTINCT FROM true OR v_tpl.is_bookable IS DISTINCT FROM true THEN RAISE EXCEPTION 'That tour is not available to book online.'; END IF;
  END IF;

  -- Only supplied valid columns are inserted, so database defaults remain intact.
  SELECT string_agg(format('%I',a.attname),', ' ORDER BY a.attnum), string_agg(format('r.%I',a.attname),', ' ORDER BY a.attnum)
  INTO v_columns,v_values FROM pg_attribute a WHERE a.attrelid='public.bookings'::regclass AND a.attnum>0 AND NOT a.attisdropped AND a.attgenerated='' AND _booking ? a.attname;
  IF v_columns IS NULL THEN RAISE EXCEPTION 'Tour details are incomplete.'; END IF;
  EXECUTE format('INSERT INTO public.bookings (%s) SELECT %s FROM jsonb_populate_record(NULL::public.bookings,$1) r RETURNING id',v_columns,v_values) INTO v_id USING _booking;
  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.reserve_tour_booking(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_tour_booking(jsonb) TO service_role;