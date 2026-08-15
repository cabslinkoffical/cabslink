-- 1) Normalize the legacy return/bidirectional flags deterministically BEFORE the
--    application relies on `bidirectional` as the single canonical field.
--    Old rows where valid_for_return was true must keep behaving as both-ways.
UPDATE public.pricing_rules
   SET bidirectional = true
 WHERE COALESCE(valid_for_return, false) = true
   AND COALESCE(bidirectional, false) = false;

UPDATE public.pricing_rules
   SET bidirectional = COALESCE(valid_for_return, false)
 WHERE bidirectional IS NULL;

-- Keep the legacy column in sync with the canonical one for any readers left.
UPDATE public.pricing_rules
   SET valid_for_return = COALESCE(bidirectional, false)
 WHERE COALESCE(valid_for_return, false) IS DISTINCT FROM COALESCE(bidirectional, false);

-- 2) Fully atomic pricing save: resolve/create the internal compatibility
--    pricing vehicle and link it to the class INSIDE the same transaction.
CREATE OR REPLACE FUNCTION public.save_pricing_scheme_base(_payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_class_id uuid := (_payload->>'class_id')::uuid;
  v_vehicle_id uuid;
  v_class record;
  v_profile_id uuid;
  v_band jsonb;
  v_sort int := 1;
  v_included numeric := COALESCE((_payload->>'city_included_miles')::numeric, 0);
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin access required' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'class_id is required' USING ERRCODE = 'check_violation';
  END IF;

  SELECT id, name, hero_image, passengers, large_luggage, hand_luggage,
         display_order, active, pricing_vehicle_id
    INTO v_class
    FROM public.vehicle_classes
   WHERE id = v_class_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vehicle class not found' USING ERRCODE = 'no_data_found';
  END IF;

  v_vehicle_id := v_class.pricing_vehicle_id;

  IF v_vehicle_id IS NULL THEN
    INSERT INTO public.vehicles (
      name, category, image_url, description, passengers, luggage,
      hand_luggage, display_order, active
    ) VALUES (
      v_class.name, 'Executive', COALESCE(v_class.hero_image, 'class'), '',
      COALESCE(v_class.passengers, 3), COALESCE(v_class.large_luggage, 2),
      COALESCE(v_class.hand_luggage, 0), COALESCE(v_class.display_order, 0),
      COALESCE(v_class.active, true)
    ) RETURNING id INTO v_vehicle_id;

    UPDATE public.vehicle_classes
       SET pricing_vehicle_id = v_vehicle_id
     WHERE id = v_class_id;
  END IF;

  SELECT id INTO v_profile_id FROM public.vehicle_pricing_profiles WHERE vehicle_id = v_vehicle_id;

  IF v_profile_id IS NULL THEN
    INSERT INTO public.vehicle_pricing_profiles (
      vehicle_id, vehicle_class_id, base_price, city_included_miles, via_price,
      waiting_fee_per_minute, airport_pickup_fee, connecting_job_discount_percent,
      final_tier_open_ended, status
    ) VALUES (
      v_vehicle_id, v_class_id,
      COALESCE((_payload->>'base_price')::numeric, 0),
      v_included,
      COALESCE((_payload->>'via_price')::numeric, 0),
      COALESCE((_payload->>'waiting_fee_per_minute')::numeric, 0),
      COALESCE((_payload->>'airport_pickup_fee')::numeric, 0),
      COALESCE((_payload->>'connecting_job_discount_percent')::numeric, 0),
      COALESCE((_payload->>'final_tier_open_ended')::boolean, false),
      false
    ) RETURNING id INTO v_profile_id;
  ELSE
    UPDATE public.vehicle_pricing_profiles SET
      vehicle_class_id = v_class_id,
      base_price = COALESCE((_payload->>'base_price')::numeric, 0),
      city_included_miles = v_included,
      via_price = COALESCE((_payload->>'via_price')::numeric, 0),
      waiting_fee_per_minute = COALESCE((_payload->>'waiting_fee_per_minute')::numeric, 0),
      airport_pickup_fee = COALESCE((_payload->>'airport_pickup_fee')::numeric, 0),
      connecting_job_discount_percent = COALESCE((_payload->>'connecting_job_discount_percent')::numeric, 0),
      final_tier_open_ended = COALESCE((_payload->>'final_tier_open_ended')::boolean, false),
      status = false
    WHERE id = v_profile_id;
  END IF;

  DELETE FROM public.vehicle_mileage_tiers WHERE pricing_profile_id = v_profile_id;

  IF v_included > 0 THEN
    INSERT INTO public.vehicle_mileage_tiers (pricing_profile_id, tier_name, miles, cost_per_mile, sort_order)
    VALUES (v_profile_id, 'City transfer (included)', v_included, 0, v_sort);
    v_sort := v_sort + 1;
  END IF;

  FOR v_band IN SELECT * FROM jsonb_array_elements(COALESCE(_payload->'bands', '[]'::jsonb)) LOOP
    IF COALESCE((v_band->>'miles')::numeric, 0) > 0 THEN
      INSERT INTO public.vehicle_mileage_tiers (pricing_profile_id, tier_name, miles, cost_per_mile, sort_order)
      VALUES (
        v_profile_id,
        COALESCE(NULLIF(btrim(v_band->>'name'), ''), 'Band ' || v_sort::text),
        (v_band->>'miles')::numeric,
        COALESCE((v_band->>'per_mile')::numeric, 0),
        v_sort
      );
      v_sort := v_sort + 1;
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM public.hourly_rates WHERE vehicle_id = v_vehicle_id) THEN
    UPDATE public.hourly_rates SET
      vehicle_class_id = v_class_id,
      price_per_hour = COALESCE((_payload->>'price_per_hour')::numeric, 0),
      min_hours = COALESCE((_payload->>'min_hours')::int, 3),
      max_hours = COALESCE((_payload->>'max_hours')::int, 12),
      daily_price = NULLIF((_payload->>'daily_price'), '')::numeric,
      included_hours_per_day = NULLIF((_payload->>'included_hours_per_day'), '')::numeric,
      included_miles_per_day = NULLIF((_payload->>'included_miles_per_day'), '')::numeric,
      extra_mile_rate = NULLIF((_payload->>'extra_mile_rate'), '')::numeric,
      active = COALESCE((_payload->>'hourly_active')::boolean, false)
    WHERE vehicle_id = v_vehicle_id;
  ELSE
    INSERT INTO public.hourly_rates (
      vehicle_id, vehicle_class_id, price_per_hour, min_hours, max_hours,
      daily_price, included_hours_per_day, included_miles_per_day, extra_mile_rate, active
    ) VALUES (
      v_vehicle_id, v_class_id,
      COALESCE((_payload->>'price_per_hour')::numeric, 0),
      COALESCE((_payload->>'min_hours')::int, 3),
      COALESCE((_payload->>'max_hours')::int, 12),
      NULLIF((_payload->>'daily_price'), '')::numeric,
      NULLIF((_payload->>'included_hours_per_day'), '')::numeric,
      NULLIF((_payload->>'included_miles_per_day'), '')::numeric,
      NULLIF((_payload->>'extra_mile_rate'), '')::numeric,
      COALESCE((_payload->>'hourly_active')::boolean, false)
    );
  END IF;

  UPDATE public.vehicle_pricing_profiles
     SET status = COALESCE((_payload->>'status')::boolean, true)
   WHERE id = v_profile_id;

  RETURN v_profile_id;
END;
$function$;