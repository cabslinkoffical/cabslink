-- 1) Convert has_role to SECURITY INVOKER. user_roles RLS allows users to see their own roles,
--    which is all has_role(auth.uid(), ...) needs.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Restrict EXECUTE on has_role to authenticated only (not anon/public).
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- 2) Replace permissive WITH CHECK (true) policies with validated ones.
DROP POLICY IF EXISTS "anyone can submit booking" ON public.bookings;
CREATE POLICY "anyone can submit booking"
ON public.bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(btrim(customer_name)) BETWEEN 1 AND 120
  AND char_length(btrim(email))     BETWEEN 3 AND 255
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND char_length(btrim(phone))     BETWEEN 5 AND 30
  AND char_length(btrim(pickup_address))  BETWEEN 2 AND 500
  AND char_length(btrim(dropoff_address)) BETWEEN 2 AND 500
  AND char_length(btrim(vehicle_type))    BETWEEN 1 AND 60
  AND passengers BETWEEN 1 AND 20
  AND luggage    BETWEEN 0 AND 20
  AND (notes IS NULL OR char_length(notes) <= 2000)
  AND status = 'new'::booking_status
);

DROP POLICY IF EXISTS "anyone can submit contact" ON public.contact_messages;
CREATE POLICY "anyone can submit contact"
ON public.contact_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(btrim(name))  BETWEEN 1 AND 120
  AND char_length(btrim(email)) BETWEEN 3 AND 255
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND char_length(btrim(message)) BETWEEN 1 AND 5000
  AND (phone   IS NULL OR char_length(phone)   <= 30)
  AND (subject IS NULL OR char_length(subject) <= 200)
);