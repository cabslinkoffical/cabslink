
-- =========================================================
-- Task 1 — Mileage tier & profile guardrails
-- =========================================================

-- One active pricing profile per vehicle
CREATE UNIQUE INDEX IF NOT EXISTS vehicle_pricing_profiles_active_unique
  ON public.vehicle_pricing_profiles (vehicle_id)
  WHERE status = true;

-- Tier sort_order unique per profile
ALTER TABLE public.vehicle_mileage_tiers
  DROP CONSTRAINT IF EXISTS vehicle_mileage_tiers_profile_sort_unique;
ALTER TABLE public.vehicle_mileage_tiers
  ADD CONSTRAINT vehicle_mileage_tiers_profile_sort_unique
  UNIQUE (pricing_profile_id, sort_order);

-- Tier sanity: miles > 0, cost >= 0
ALTER TABLE public.vehicle_mileage_tiers
  DROP CONSTRAINT IF EXISTS vehicle_mileage_tiers_miles_positive;
ALTER TABLE public.vehicle_mileage_tiers
  ADD CONSTRAINT vehicle_mileage_tiers_miles_positive CHECK (miles > 0);

ALTER TABLE public.vehicle_mileage_tiers
  DROP CONSTRAINT IF EXISTS vehicle_mileage_tiers_cost_nonneg;
ALTER TABLE public.vehicle_mileage_tiers
  ADD CONSTRAINT vehicle_mileage_tiers_cost_nonneg CHECK (cost_per_mile >= 0);

-- Profile sanity: base_price >= 0, via_price >= 0
ALTER TABLE public.vehicle_pricing_profiles
  DROP CONSTRAINT IF EXISTS vehicle_pricing_profiles_base_nonneg;
ALTER TABLE public.vehicle_pricing_profiles
  ADD CONSTRAINT vehicle_pricing_profiles_base_nonneg CHECK (base_price >= 0);

ALTER TABLE public.vehicle_pricing_profiles
  DROP CONSTRAINT IF EXISTS vehicle_pricing_profiles_via_nonneg;
ALTER TABLE public.vehicle_pricing_profiles
  ADD CONSTRAINT vehicle_pricing_profiles_via_nonneg CHECK (via_price >= 0);

-- Trigger: active profile must have >=1 tier and cover long journeys (>=500 mi in top tier)
CREATE OR REPLACE FUNCTION public.pricing_profile_requires_valid_tiers()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  tier_count int;
  top_miles numeric;
  affected_profile_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'vehicle_pricing_profiles' THEN
    IF NEW.status IS NOT TRUE THEN RETURN NEW; END IF;
    affected_profile_id := NEW.id;
  ELSE
    affected_profile_id := COALESCE(NEW.pricing_profile_id, OLD.pricing_profile_id);
  END IF;

  SELECT count(*), COALESCE(max(miles), 0)
    INTO tier_count, top_miles
  FROM public.vehicle_mileage_tiers
  WHERE pricing_profile_id = affected_profile_id;

  -- Only enforce when profile is active
  IF NOT EXISTS (
    SELECT 1 FROM public.vehicle_pricing_profiles
    WHERE id = affected_profile_id AND status = true
  ) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF tier_count = 0 THEN
    RAISE EXCEPTION 'Active pricing profile must have at least one mileage tier'
      USING ERRCODE = 'check_violation';
  END IF;

  IF top_miles < 500 THEN
    RAISE EXCEPTION 'Active pricing profile top tier must cover long journeys (>= 500 miles)'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_valid_tiers_on_profile ON public.vehicle_pricing_profiles;
CREATE CONSTRAINT TRIGGER trg_profile_valid_tiers_on_profile
  AFTER INSERT OR UPDATE ON public.vehicle_pricing_profiles
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.pricing_profile_requires_valid_tiers();

-- =========================================================
-- Task 2 — Fixed route pricing rule uniqueness & bidirectional conflict
-- =========================================================

CREATE UNIQUE INDEX IF NOT EXISTS pricing_rules_active_route_unique
  ON public.pricing_rules (vehicle_id, from_place_id, to_place_id)
  WHERE active = true;

CREATE OR REPLACE FUNCTION public.pricing_rule_prevent_bidirectional_conflict()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.active IS NOT TRUE THEN RETURN NEW; END IF;
  IF NEW.from_place_id IS NULL OR NEW.to_place_id IS NULL THEN RETURN NEW; END IF;

  IF EXISTS (
    SELECT 1 FROM public.pricing_rules pr
    WHERE pr.id <> NEW.id
      AND pr.active = true
      AND pr.vehicle_id IS NOT DISTINCT FROM NEW.vehicle_id
      AND (
        -- Same direction
        (pr.from_place_id = NEW.from_place_id AND pr.to_place_id = NEW.to_place_id)
        OR
        -- Reverse direction, when either side is bidirectional
        ((pr.bidirectional OR NEW.bidirectional)
          AND pr.from_place_id = NEW.to_place_id
          AND pr.to_place_id = NEW.from_place_id)
      )
  ) THEN
    RAISE EXCEPTION 'A conflicting active pricing rule already exists for this vehicle/route (check bidirectional flag).'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pricing_rule_bidirectional ON public.pricing_rules;
CREATE TRIGGER trg_pricing_rule_bidirectional
  BEFORE INSERT OR UPDATE ON public.pricing_rules
  FOR EACH ROW EXECUTE FUNCTION public.pricing_rule_prevent_bidirectional_conflict();

-- =========================================================
-- Task 3 — Address surcharges: add place_id & label
-- =========================================================

ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS place_id text;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS label text;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS updated_by uuid;

CREATE INDEX IF NOT EXISTS addresses_place_id_idx
  ON public.addresses (place_id) WHERE place_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS addresses_comparable_value_lower_idx
  ON public.addresses (lower(comparable_value)) WHERE active = true;

-- =========================================================
-- Task 4 — Tax & currency settings
-- =========================================================

ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS tax_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS tax_label text NOT NULL DEFAULT 'VAT';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS currency_symbol text NOT NULL DEFAULT '£';

-- =========================================================
-- Task 6 — Extended quote snapshot columns
-- =========================================================

ALTER TABLE public.quote_calculations ADD COLUMN IF NOT EXISTS engine_version text;
ALTER TABLE public.quote_calculations ADD COLUMN IF NOT EXISTS profile_id uuid;
ALTER TABLE public.quote_calculations ADD COLUMN IF NOT EXISTS fixed_price_applied boolean DEFAULT false;
ALTER TABLE public.quote_calculations ADD COLUMN IF NOT EXISTS fixed_price_amount numeric;
ALTER TABLE public.quote_calculations ADD COLUMN IF NOT EXISTS pickup_surcharge numeric DEFAULT 0;
ALTER TABLE public.quote_calculations ADD COLUMN IF NOT EXISTS dropoff_surcharge numeric DEFAULT 0;
ALTER TABLE public.quote_calculations ADD COLUMN IF NOT EXISTS via_stops integer DEFAULT 0;
ALTER TABLE public.quote_calculations ADD COLUMN IF NOT EXISTS via_price numeric DEFAULT 0;
ALTER TABLE public.quote_calculations ADD COLUMN IF NOT EXISTS time_extra numeric DEFAULT 0;
ALTER TABLE public.quote_calculations ADD COLUMN IF NOT EXISTS tax_rate numeric DEFAULT 0;
ALTER TABLE public.quote_calculations ADD COLUMN IF NOT EXISTS vehicle_count integer DEFAULT 1;
ALTER TABLE public.quote_calculations ADD COLUMN IF NOT EXISTS snapshot jsonb;

-- Bookings snapshot (extend if column missing)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pricing_snapshot jsonb;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS engine_version text;
