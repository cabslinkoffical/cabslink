-- Remove public access to the settings table (it holds SMTP + API credentials)
DROP POLICY IF EXISTS "Public reads safe settings" ON public.site_settings;
REVOKE SELECT ON public.site_settings FROM anon;

-- Expose only the non-sensitive, quote-related settings publicly via a view
CREATE OR REPLACE VIEW public.site_settings_public AS
SELECT
  id,
  tax_enabled, tax_percentage, tax_label, currency, currency_symbol,
  child_seat_fee_pence, meet_greet_fee_pence, return_journey_fee_pence,
  policy_non_refundable_percent, policy_non_refundable_min_pence,
  policy_flexible_percent, policy_flexible_min_pence,
  poi_corridor_enabled, poi_corridor_radius_miles, poi_corridor_max_pois,
  poi_discovery_enabled,
  sightseeing_threshold_minutes, tour_threshold_minutes, tour_threshold_stops,
  included_stop_minutes, price_per_extra_15min_pence, max_selected_stops
FROM public.site_settings
WHERE id = 1;

GRANT SELECT ON public.site_settings_public TO anon, authenticated;
GRANT ALL ON public.site_settings_public TO service_role;