ALTER VIEW public.site_settings_public SET (security_invoker = true);

-- Public visitors may read only the non-sensitive settings columns
CREATE POLICY "Public reads safe settings columns"
ON public.site_settings
FOR SELECT
TO anon
USING (id = 1);

GRANT SELECT (
  id,
  tax_enabled, tax_percentage, tax_label, currency, currency_symbol,
  child_seat_fee_pence, meet_greet_fee_pence, return_journey_fee_pence,
  policy_non_refundable_percent, policy_non_refundable_min_pence,
  policy_flexible_percent, policy_flexible_min_pence,
  poi_corridor_enabled, poi_corridor_radius_miles, poi_corridor_max_pois,
  poi_discovery_enabled,
  sightseeing_threshold_minutes, tour_threshold_minutes, tour_threshold_stops,
  included_stop_minutes, price_per_extra_15min_pence, max_selected_stops
) ON public.site_settings TO anon;