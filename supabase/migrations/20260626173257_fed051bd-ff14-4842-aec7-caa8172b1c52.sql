-- =========================================
-- vehicle_pricing_profiles
-- =========================================
CREATE TABLE public.vehicle_pricing_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE UNIQUE,
  base_price numeric(10,2) NOT NULL DEFAULT 0,
  via_price numeric(10,2) NOT NULL DEFAULT 0,
  vehicle_add_price_enabled boolean NOT NULL DEFAULT false,
  time_extra_from time,
  time_extra_to time,
  time_extra_amount numeric(10,2) NOT NULL DEFAULT 0,
  time_extra_type text NOT NULL DEFAULT 'fixed' CHECK (time_extra_type IN ('fixed','percent')),
  status boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vehicle_pricing_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_pricing_profiles TO authenticated;
GRANT ALL ON public.vehicle_pricing_profiles TO service_role;

ALTER TABLE public.vehicle_pricing_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active pricing profiles"
  ON public.vehicle_pricing_profiles FOR SELECT
  USING (status = true);

CREATE POLICY "Admins manage pricing profiles"
  ON public.vehicle_pricing_profiles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_updated_at_vehicle_pricing_profiles
  BEFORE UPDATE ON public.vehicle_pricing_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- vehicle_mileage_tiers
-- =========================================
CREATE TABLE public.vehicle_mileage_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_profile_id uuid NOT NULL REFERENCES public.vehicle_pricing_profiles(id) ON DELETE CASCADE,
  tier_name text NOT NULL,
  miles numeric(10,2) NOT NULL,
  cost_per_mile numeric(10,4) NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX vehicle_mileage_tiers_profile_idx
  ON public.vehicle_mileage_tiers(pricing_profile_id, sort_order);

GRANT SELECT ON public.vehicle_mileage_tiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_mileage_tiers TO authenticated;
GRANT ALL ON public.vehicle_mileage_tiers TO service_role;

ALTER TABLE public.vehicle_mileage_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read mileage tiers"
  ON public.vehicle_mileage_tiers FOR SELECT
  USING (true);

CREATE POLICY "Admins manage mileage tiers"
  ON public.vehicle_mileage_tiers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_updated_at_vehicle_mileage_tiers
  BEFORE UPDATE ON public.vehicle_mileage_tiers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- quote_calculations
-- =========================================
CREATE TABLE public.quote_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid,
  pickup_address text NOT NULL,
  dropoff_address text NOT NULL,
  distance_miles numeric(10,2) NOT NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  base_price numeric(10,2) NOT NULL DEFAULT 0,
  mileage_price numeric(10,2) NOT NULL DEFAULT 0,
  surcharge_price numeric(10,2) NOT NULL DEFAULT 0,
  discount_price numeric(10,2) NOT NULL DEFAULT 0,
  tax_price numeric(10,2) NOT NULL DEFAULT 0,
  final_price numeric(10,2) NOT NULL DEFAULT 0,
  calculation_breakdown jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX quote_calculations_created_idx ON public.quote_calculations(created_at DESC);

GRANT INSERT ON public.quote_calculations TO anon;
GRANT SELECT, INSERT ON public.quote_calculations TO authenticated;
GRANT ALL ON public.quote_calculations TO service_role;

ALTER TABLE public.quote_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log a quote"
  ON public.quote_calculations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins view all quotes"
  ON public.quote_calculations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================
-- Seed: profile + 5 tiers per active vehicle
-- =========================================
DO $$
DECLARE
  v RECORD;
  profile_id uuid;
  mult numeric;
BEGIN
  FOR v IN SELECT id, name, category FROM public.vehicles WHERE active = true LOOP
    -- choose multiplier per class
    mult := CASE
      WHEN v.name ILIKE '%E-Class%' THEN 1.00
      WHEN v.name ILIKE '%S-Class%' THEN 1.45
      WHEN v.name ILIKE '%V-Class%' THEN 1.45
      WHEN v.name ILIKE '%Range Rover%' THEN 1.55
      WHEN v.name ILIKE '%Rolls%' OR v.name ILIKE '%Bentley%' THEN 2.15
      WHEN v.name ILIKE '%Mini Bus%' THEN 1.65
      WHEN v.name ILIKE '%Coaster%' THEN 2.05
      WHEN v.name ILIKE '%Coach%' THEN 2.65
      ELSE 1.20
    END;

    INSERT INTO public.vehicle_pricing_profiles
      (vehicle_id, base_price, via_price, vehicle_add_price_enabled, status)
    VALUES (v.id, ROUND(35 * mult, 2), ROUND(10 * mult, 2), false, true)
    RETURNING id INTO profile_id;

    INSERT INTO public.vehicle_mileage_tiers (pricing_profile_id, tier_name, miles, cost_per_mile, sort_order) VALUES
      (profile_id, 'Next 10 miles', 10,  ROUND(0.01 * mult, 4), 1),
      (profile_id, 'Next 10 miles', 10,  ROUND(3.50 * mult, 4), 2),
      (profile_id, 'Next 20 miles', 20,  ROUND(2.20 * mult, 4), 3),
      (profile_id, 'Next 50 miles', 50,  ROUND(2.30 * mult, 4), 4),
      (profile_id, 'Next 999 miles', 999, ROUND(2.40 * mult, 4), 5);
  END LOOP;
END $$;