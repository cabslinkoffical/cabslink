
-- 1) quote_calculations: no mutation of stored quotes by public/signed-in users
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES ON public.quote_calculations FROM anon;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES ON public.quote_calculations FROM authenticated;
REVOKE SELECT ON public.quote_calculations FROM anon;
GRANT ALL ON public.quote_calculations TO service_role;

-- 2) site_settings: replace whole-row anon read with a narrow public view
DROP POLICY IF EXISTS "Anon reads allowlisted public settings columns" ON public.site_settings;

CREATE OR REPLACE VIEW public.site_settings_public AS
SELECT
  id,
  company_name,
  maintenance_mode,
  currency,
  currency_symbol,
  tax_enabled,
  tax_percentage,
  tax_label,
  tax_mode,
  tax_effective_from,
  child_seat_fee_pence,
  meet_greet_fee_pence,
  return_journey_fee_pence,
  policy_non_refundable_percent,
  policy_non_refundable_min_pence,
  policy_flexible_percent,
  policy_flexible_min_pence,
  sightseeing_threshold_minutes,
  tour_threshold_minutes,
  tour_threshold_stops,
  included_stop_minutes,
  price_per_extra_15min_pence,
  max_selected_stops,
  poi_corridor_enabled,
  poi_corridor_radius_miles,
  poi_corridor_max_pois
FROM public.site_settings
WHERE id = 1;

GRANT SELECT ON public.site_settings_public TO anon, authenticated;
GRANT SELECT ON public.site_settings_public TO service_role;

-- 3) vehicle pricing: anon reads a column-limited view, not the base tables
DROP POLICY IF EXISTS "Anyone can read active pricing profiles" ON public.vehicle_pricing_profiles;
DROP POLICY IF EXISTS "Anyone can read mileage tiers" ON public.vehicle_mileage_tiers;

CREATE POLICY "Authenticated can read active pricing profiles"
  ON public.vehicle_pricing_profiles FOR SELECT TO authenticated USING (status = true);
CREATE POLICY "Authenticated can read mileage tiers"
  ON public.vehicle_mileage_tiers FOR SELECT TO authenticated USING (true);

REVOKE ALL ON public.vehicle_pricing_profiles FROM anon;
REVOKE ALL ON public.vehicle_mileage_tiers FROM anon;

CREATE OR REPLACE VIEW public.vehicle_pricing_profiles_public AS
SELECT
  id,
  vehicle_id,
  vehicle_class_id,
  base_price,
  via_price,
  vehicle_add_price_enabled,
  time_extra_from,
  time_extra_to,
  time_extra_amount,
  time_extra_type,
  status,
  city_included_miles,
  waiting_fee_per_minute,
  airport_pickup_fee,
  connecting_job_discount_percent,
  final_tier_open_ended
FROM public.vehicle_pricing_profiles
WHERE status = true;

CREATE OR REPLACE VIEW public.vehicle_mileage_tiers_public AS
SELECT t.id, t.pricing_profile_id, t.tier_name, t.miles, t.cost_per_mile, t.sort_order
FROM public.vehicle_mileage_tiers t
JOIN public.vehicle_pricing_profiles p ON p.id = t.pricing_profile_id
WHERE p.status = true;

GRANT SELECT ON public.vehicle_pricing_profiles_public TO anon, authenticated, service_role;
GRANT SELECT ON public.vehicle_mileage_tiers_public TO anon, authenticated, service_role;
