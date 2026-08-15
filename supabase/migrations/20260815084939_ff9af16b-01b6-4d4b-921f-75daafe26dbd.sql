CREATE OR REPLACE FUNCTION public.redeem_coupon(
  _coupon_id uuid,
  _booking_id uuid,
  _email text,
  _amount numeric
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer;
  v_used integer;
  v_inserted boolean := false;
BEGIN
  SELECT usage_limit, COALESCE(used_count, 0)
    INTO v_limit, v_used
  FROM public.coupons
  WHERE id = _coupon_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_limit IS NOT NULL AND v_limit > 0 AND v_used >= v_limit THEN
    RETURN false;
  END IF;

  INSERT INTO public.coupon_redemptions (coupon_id, booking_id, customer_email, discount_amount)
  VALUES (_coupon_id, _booking_id, lower(_email), _amount)
  ON CONFLICT DO NOTHING;

  v_inserted := FOUND;

  IF NOT v_inserted THEN
    RETURN false;
  END IF;

  UPDATE public.coupons
     SET used_count = v_used + 1
   WHERE id = _coupon_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_coupon(uuid, uuid, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(uuid, uuid, text, numeric) TO service_role;
