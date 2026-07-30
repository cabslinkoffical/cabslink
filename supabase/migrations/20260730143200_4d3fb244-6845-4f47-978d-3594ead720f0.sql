-- 1) Remove public read of raw site_settings (contains SMTP + API key columns)
DROP POLICY IF EXISTS "Public reads settings" ON public.site_settings;
REVOKE SELECT ON public.site_settings FROM anon;

-- Safe, non-sensitive public projection of settings
CREATE OR REPLACE VIEW public.public_site_settings
WITH (security_invoker = off) AS
SELECT
  s.id,
  s.company_name,
  s.logo_url,
  s.favicon_url,
  s.primary_color,
  s.contact_email,
  s.contact_phone,
  s.whatsapp_number,
  s.business_address,
  s.currency,
  s.currency_symbol,
  s.timezone,
  s.tax_enabled,
  s.tax_percentage,
  s.tax_label,
  s.cancellation_policy,
  s.maintenance_mode,
  s.poi_corridor_enabled,
  s.poi_corridor_radius_miles,
  s.poi_corridor_max_pois,
  s.child_seat_fee_pence,
  s.meet_greet_fee_pence,
  s.return_journey_fee_pence,
  s.policy_non_refundable_percent,
  s.policy_non_refundable_min_pence,
  s.policy_flexible_percent,
  s.policy_flexible_min_pence,
  s.sightseeing_threshold_minutes,
  s.tour_threshold_minutes,
  s.tour_threshold_stops,
  s.included_stop_minutes,
  s.price_per_extra_15min_pence,
  s.max_selected_stops
FROM public.site_settings s;

GRANT SELECT ON public.public_site_settings TO anon, authenticated;
GRANT ALL ON public.public_site_settings TO service_role;

-- 2) Let signed-in customers read only their own quote calculations
DROP POLICY IF EXISTS "Customers read own quotes" ON public.quote_calculations;
CREATE POLICY "Customers read own quotes"
  ON public.quote_calculations
  FOR SELECT
  TO authenticated
  USING (customer_id IS NOT NULL AND customer_id = auth.uid());

-- 3) Path-scoped storage policies for vehicle-images
DROP POLICY IF EXISTS "Admins insert vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Admins update vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete vehicle images" ON storage.objects;

CREATE POLICY "Admins insert vehicle images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'vehicle-images'
    AND has_role(auth.uid(), 'admin'::app_role)
    AND (storage.foldername(name))[1] IN ('classes', 'vehicles')
    AND owner = auth.uid()
  );

CREATE POLICY "Admins update own vehicle images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'vehicle-images'
    AND has_role(auth.uid(), 'admin'::app_role)
    AND (storage.foldername(name))[1] IN ('classes', 'vehicles')
    AND owner = auth.uid()
  )
  WITH CHECK (
    bucket_id = 'vehicle-images'
    AND has_role(auth.uid(), 'admin'::app_role)
    AND (storage.foldername(name))[1] IN ('classes', 'vehicles')
    AND owner = auth.uid()
  );

CREATE POLICY "Admins delete vehicle images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'vehicle-images'
    AND has_role(auth.uid(), 'admin'::app_role)
    AND (storage.foldername(name))[1] IN ('classes', 'vehicles')
  );