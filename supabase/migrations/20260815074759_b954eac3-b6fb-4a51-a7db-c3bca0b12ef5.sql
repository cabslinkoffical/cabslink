-- 1. Explicit publication flag on destinations
ALTER TABLE public.destinations
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false;

UPDATE public.destinations SET published = (active = true AND seo_tier <> 4);

CREATE OR REPLACE FUNCTION public.destinations_sync_published()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.published := (NEW.active = true AND NEW.seo_tier <> 4);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS destinations_sync_published_trg ON public.destinations;
CREATE TRIGGER destinations_sync_published_trg
  BEFORE INSERT OR UPDATE ON public.destinations
  FOR EACH ROW EXECUTE FUNCTION public.destinations_sync_published();

DROP POLICY IF EXISTS "Public reads active non-draft destinations" ON public.destinations;
CREATE POLICY "Public reads published destinations"
  ON public.destinations FOR SELECT
  TO anon, authenticated
  USING (published = true AND active = true AND seo_tier <> 4);

-- 2. Sanity bounds on anonymously created quote records
ALTER TABLE public.quote_calculations
  DROP CONSTRAINT IF EXISTS quote_calculations_price_bounds_chk;
ALTER TABLE public.quote_calculations
  ADD CONSTRAINT quote_calculations_price_bounds_chk CHECK (
    (final_price IS NULL OR (final_price >= 0 AND final_price <= 1000000))
    AND (base_price IS NULL OR (base_price >= 0 AND base_price <= 1000000))
    AND (mileage_price IS NULL OR (mileage_price >= 0 AND mileage_price <= 1000000))
    AND (surcharge_price IS NULL OR (surcharge_price >= 0 AND surcharge_price <= 1000000))
    AND (discount_price IS NULL OR (discount_price >= 0 AND discount_price <= 1000000))
    AND (tax_price IS NULL OR (tax_price >= 0 AND tax_price <= 1000000))
    AND (fixed_price_amount IS NULL OR (fixed_price_amount >= 0 AND fixed_price_amount <= 1000000))
    AND (distance_miles IS NULL OR (distance_miles >= 0 AND distance_miles <= 5000))
    AND (via_stops IS NULL OR (via_stops >= 0 AND via_stops <= 50))
    AND (vehicle_count IS NULL OR (vehicle_count >= 0 AND vehicle_count <= 100))
    AND (tax_rate IS NULL OR (tax_rate >= 0 AND tax_rate <= 1))
    AND (pickup_address IS NULL OR length(pickup_address) <= 500)
    AND (dropoff_address IS NULL OR length(dropoff_address) <= 500)
  ) NOT VALID;

-- 3. Harden credentials table against accidental public exposure
REVOKE ALL ON public.site_credentials FROM anon;
REVOKE ALL ON public.private_settings FROM anon;