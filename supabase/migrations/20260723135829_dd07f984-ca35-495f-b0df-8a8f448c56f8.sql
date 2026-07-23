GRANT SELECT ON public.vehicle_classes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_classes TO authenticated;
GRANT ALL ON public.vehicle_classes TO service_role;

GRANT SELECT ON public.vehicle_models TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_models TO authenticated;
GRANT ALL ON public.vehicle_models TO service_role;

GRANT SELECT ON public.vehicle_pricing_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_pricing_profiles TO authenticated;
GRANT ALL ON public.vehicle_pricing_profiles TO service_role;

GRANT SELECT ON public.vehicle_mileage_tiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_mileage_tiers TO authenticated;
GRANT ALL ON public.vehicle_mileage_tiers TO service_role;

GRANT SELECT ON public.vehicles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;