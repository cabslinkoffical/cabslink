DROP POLICY IF EXISTS "tour_hour_tiers public read" ON public.tour_hour_tiers;
DROP POLICY IF EXISTS "vcdc public read" ON public.vehicle_class_daily_capacity;
DROP POLICY IF EXISTS "template_fixed_prices public read" ON public.template_fixed_prices;
DROP POLICY IF EXISTS "tour_rules public read" ON public.tour_rules;
DROP POLICY IF EXISTS "Anon reads mileage tiers" ON public.vehicle_mileage_tiers;
DROP POLICY IF EXISTS "Authenticated can read mileage tiers" ON public.vehicle_mileage_tiers;
DROP POLICY IF EXISTS "Public read content" ON public.content_blocks;
DROP POLICY IF EXISTS "poi_travel_matrix public read" ON public.poi_travel_matrix;
REVOKE SELECT ON public.tour_hour_tiers, public.vehicle_class_daily_capacity, public.template_fixed_prices, public.tour_rules, public.vehicle_mileage_tiers, public.content_blocks, public.poi_travel_matrix FROM anon;