DROP VIEW IF EXISTS public.public_site_settings;

-- Public may read ONLY non-sensitive settings columns (column-level grants),
-- never smtp_host/smtp_port/smtp_user/google_maps_api_key.
GRANT SELECT (
  id, company_name, logo_url, favicon_url, primary_color, contact_email,
  contact_phone, whatsapp_number, business_address, currency, currency_symbol,
  timezone, tax_enabled, tax_percentage, tax_label, cancellation_policy,
  maintenance_mode, poi_corridor_enabled, poi_corridor_radius_miles,
  poi_corridor_max_pois, child_seat_fee_pence, meet_greet_fee_pence,
  return_journey_fee_pence, policy_non_refundable_percent,
  policy_non_refundable_min_pence, policy_flexible_percent,
  policy_flexible_min_pence, sightseeing_threshold_minutes,
  tour_threshold_minutes, tour_threshold_stops, included_stop_minutes,
  price_per_extra_15min_pence, max_selected_stops
) ON public.site_settings TO anon;

DROP POLICY IF EXISTS "Public reads safe settings" ON public.site_settings;
CREATE POLICY "Public reads safe settings"
  ON public.site_settings
  FOR SELECT
  TO anon
  USING (true);