REVOKE INSERT ON public.bookings, public.contact_messages, public.quote_calculations FROM anon, authenticated;
DROP POLICY IF EXISTS "anyone can submit booking" ON public.bookings;
DROP POLICY IF EXISTS "anyone can submit contact" ON public.contact_messages;
DROP POLICY IF EXISTS "Anonymous can log a quote without customer" ON public.quote_calculations;
DROP POLICY IF EXISTS "Authenticated can log own quote" ON public.quote_calculations;
CREATE OR REPLACE FUNCTION public.redeem_coupon(_coupon_id uuid, _booking_id uuid, _email text, _amount numeric)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_limit integer; v_used integer; v_inserted boolean := false;
BEGIN
  SELECT usage_limit, COALESCE(used_count, 0) INTO v_limit, v_used FROM public.coupons WHERE id = _coupon_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_limit IS NOT NULL AND v_limit > 0 AND v_used >= v_limit THEN RETURN false; END IF;
  INSERT INTO public.coupon_redemptions (coupon_id, booking_id, email, amount)
  VALUES (_coupon_id, _booking_id, lower(btrim(_email)), _amount) ON CONFLICT DO NOTHING;
  v_inserted := FOUND;
  IF NOT v_inserted THEN RETURN false; END IF;
  UPDATE public.coupons SET used_count = v_used + 1 WHERE id = _coupon_id;
  RETURN true;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.redeem_coupon(uuid,uuid,text,numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(uuid,uuid,text,numeric) TO service_role;