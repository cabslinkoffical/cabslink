
ALTER VIEW public.site_settings_public SET (security_invoker = true);
ALTER VIEW public.vehicle_pricing_profiles_public SET (security_invoker = true);
ALTER VIEW public.vehicle_mileage_tiers_public SET (security_invoker = true);

-- Column-level read access for anon on the base tables (only public fields).
GRANT SELECT (
  id, company_name, maintenance_mode, currency, currency_symbol,
  tax_enabled, tax_percentage, tax_label, tax_mode, tax_effective_from,
  child_seat_fee_pence, meet_greet_fee_pence, return_journey_fee_pence,
  policy_non_refundable_percent, policy_non_refundable_min_pence,
  policy_flexible_percent, policy_flexible_min_pence,
  sightseeing_threshold_minutes, tour_threshold_minutes, tour_threshold_stops,
  included_stop_minutes, price_per_extra_15min_pence, max_selected_stops,
  poi_corridor_enabled, poi_corridor_radius_miles, poi_corridor_max_pois
) ON public.site_settings TO anon;

CREATE POLICY "Anon reads public site settings row"
  ON public.site_settings FOR SELECT TO anon USING (id = 1);

GRANT SELECT (
  id, vehicle_id, vehicle_class_id, base_price, via_price,
  vehicle_add_price_enabled, time_extra_from, time_extra_to,
  time_extra_amount, time_extra_type, status, city_included_miles,
  waiting_fee_per_minute, airport_pickup_fee,
  connecting_job_discount_percent, final_tier_open_ended
) ON public.vehicle_pricing_profiles TO anon;

GRANT SELECT (
  id, pricing_profile_id, tier_name, miles, cost_per_mile, sort_order
) ON public.vehicle_mileage_tiers TO anon;

CREATE POLICY "Anon reads active pricing profiles"
  ON public.vehicle_pricing_profiles FOR SELECT TO anon USING (status = true);

CREATE POLICY "Anon reads mileage tiers"
  ON public.vehicle_mileage_tiers FOR SELECT TO anon USING (true);
