
-- 1) Restrict site_settings SELECT to admins (removes public exposure of SMTP + API keys)
DROP POLICY IF EXISTS "Anyone reads settings" ON public.site_settings;
CREATE POLICY "Admins read settings"
  ON public.site_settings
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) Public booking inserts must not carry a price (server sets it)
DROP POLICY IF EXISTS "anyone can submit booking" ON public.bookings;
CREATE POLICY "anyone can submit booking"
  ON public.bookings
  FOR INSERT
  WITH CHECK (
    price IS NULL
    AND char_length(btrim(customer_name)) BETWEEN 1 AND 120
    AND char_length(btrim(email)) BETWEEN 3 AND 255
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND char_length(btrim(phone)) BETWEEN 5 AND 30
    AND char_length(btrim(pickup_address)) BETWEEN 2 AND 500
    AND char_length(btrim(dropoff_address)) BETWEEN 2 AND 500
    AND char_length(btrim(vehicle_type)) BETWEEN 1 AND 60
    AND passengers BETWEEN 1 AND 20
    AND luggage BETWEEN 0 AND 20
    AND (notes IS NULL OR char_length(notes) <= 2000)
    AND status = 'new'::booking_status
  );
