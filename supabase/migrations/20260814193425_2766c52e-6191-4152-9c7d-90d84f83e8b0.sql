-- ============================================================
-- 1. Vehicle class linkage (additive; vehicle_id kept)
-- ============================================================
ALTER TABLE public.vehicle_pricing_profiles ADD COLUMN IF NOT EXISTS vehicle_class_id uuid REFERENCES public.vehicle_classes(id) ON DELETE SET NULL;
ALTER TABLE public.hourly_rates            ADD COLUMN IF NOT EXISTS vehicle_class_id uuid REFERENCES public.vehicle_classes(id) ON DELETE SET NULL;
ALTER TABLE public.pricing_rules           ADD COLUMN IF NOT EXISTS vehicle_class_id uuid REFERENCES public.vehicle_classes(id) ON DELETE SET NULL;
ALTER TABLE public.surcharges              ADD COLUMN IF NOT EXISTS vehicle_class_id uuid REFERENCES public.vehicle_classes(id) ON DELETE SET NULL;

UPDATE public.vehicle_pricing_profiles p SET vehicle_class_id = c.id
  FROM public.vehicle_classes c WHERE c.pricing_vehicle_id = p.vehicle_id AND p.vehicle_class_id IS NULL;
UPDATE public.hourly_rates h SET vehicle_class_id = c.id
  FROM public.vehicle_classes c WHERE c.pricing_vehicle_id = h.vehicle_id AND h.vehicle_class_id IS NULL;
UPDATE public.pricing_rules r SET vehicle_class_id = c.id
  FROM public.vehicle_classes c WHERE c.pricing_vehicle_id = r.vehicle_id AND r.vehicle_class_id IS NULL;
UPDATE public.surcharges s SET vehicle_class_id = c.id
  FROM public.vehicle_classes c WHERE c.pricing_vehicle_id = s.vehicle_id AND s.vehicle_class_id IS NULL;

-- ============================================================
-- 2. Fixed routes: radius, coords, priority, return validity
-- ============================================================
ALTER TABLE public.pricing_rules
  ADD COLUMN IF NOT EXISTS from_radius_miles numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS to_radius_miles   numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS from_lat numeric,
  ADD COLUMN IF NOT EXISTS from_lng numeric,
  ADD COLUMN IF NOT EXISTS to_lat   numeric,
  ADD COLUMN IF NOT EXISTS to_lng   numeric,
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS valid_for_return boolean NOT NULL DEFAULT true;

UPDATE public.pricing_rules r SET from_lat = pc.lat, from_lng = pc.lng
  FROM public.place_coords pc WHERE pc.place_id = r.from_place_id AND r.from_lat IS NULL;
UPDATE public.pricing_rules r SET to_lat = pc.lat, to_lng = pc.lng
  FROM public.place_coords pc WHERE pc.place_id = r.to_place_id AND r.to_lat IS NULL;

-- Relax the active-rule guard: allow (place ids) OR (coords + radius)
CREATE OR REPLACE FUNCTION public.pricing_rules_require_place_ids_when_active()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  has_from boolean;
  has_to boolean;
BEGIN
  IF NEW.active IS NOT TRUE THEN RETURN NEW; END IF;
  has_from := (NEW.from_place_id IS NOT NULL AND btrim(NEW.from_place_id) <> '')
              OR (NEW.from_lat IS NOT NULL AND NEW.from_lng IS NOT NULL AND COALESCE(NEW.from_radius_miles,0) > 0);
  has_to   := (NEW.to_place_id IS NOT NULL AND btrim(NEW.to_place_id) <> '')
              OR (NEW.to_lat IS NOT NULL AND NEW.to_lng IS NOT NULL AND COALESCE(NEW.to_radius_miles,0) > 0);
  IF NOT has_from OR NOT has_to THEN
    RAISE EXCEPTION 'Active fixed-route rules require a Google Place ID or coordinates + radius for both origin and destination.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $$;

-- ============================================================
-- 3. Surcharges: priority
-- ============================================================
ALTER TABLE public.surcharges ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 100;

-- ============================================================
-- 4. Coupons: scope, caps, stacking + redemption audit
-- ============================================================
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS applies_to_service_types text[],
  ADD COLUMN IF NOT EXISTS max_discount numeric,
  ADD COLUMN IF NOT EXISTS per_customer_limit integer,
  ADD COLUMN IF NOT EXISTS stackable boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  email text,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS coupon_redemptions_booking_unique ON public.coupon_redemptions (coupon_id, booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS coupon_redemptions_email_idx ON public.coupon_redemptions (coupon_id, lower(email));
GRANT SELECT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read coupon redemptions" ON public.coupon_redemptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 5. Hourly + daily
-- ============================================================
ALTER TABLE public.hourly_rates
  ADD COLUMN IF NOT EXISTS daily_price numeric,
  ADD COLUMN IF NOT EXISTS included_hours_per_day numeric,
  ADD COLUMN IF NOT EXISTS included_miles_per_hour numeric,
  ADD COLUMN IF NOT EXISTS included_miles_per_day numeric,
  ADD COLUMN IF NOT EXISTS extra_mile_rate numeric,
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 100;

-- ============================================================
-- 6. VAT mode
-- ============================================================
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS tax_mode text NOT NULL DEFAULT 'exclusive',
  ADD COLUMN IF NOT EXISTS tax_effective_from date;
ALTER TABLE public.site_settings DROP CONSTRAINT IF EXISTS site_settings_tax_mode_check;
ALTER TABLE public.site_settings ADD CONSTRAINT site_settings_tax_mode_check CHECK (tax_mode IN ('exclusive','inclusive'));

-- ============================================================
-- 7. Pricing provenance on bookings + quotes (additive)
-- ============================================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pricing_source text,
  ADD COLUMN IF NOT EXISTS applied_rules jsonb;
ALTER TABLE public.quote_calculations
  ADD COLUMN IF NOT EXISTS pricing_source text,
  ADD COLUMN IF NOT EXISTS applied_rules jsonb;

-- ============================================================
-- 8. location_pricing_rules
-- ============================================================
CREATE TABLE IF NOT EXISTS public.location_pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  place_id text,
  place_label text,
  lat numeric,
  lng numeric,
  radius_miles numeric NOT NULL DEFAULT 5,
  included_distance_miles numeric NOT NULL DEFAULT 0,
  price_type text NOT NULL DEFAULT 'fixed',
  price numeric NOT NULL DEFAULT 0,
  extra_per_mile numeric NOT NULL DEFAULT 0,
  scope text NOT NULL DEFAULT 'pickup',
  vehicle_class_id uuid REFERENCES public.vehicle_classes(id) ON DELETE CASCADE,
  priority integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT location_pricing_price_type_check CHECK (price_type IN ('fixed','base')),
  CONSTRAINT location_pricing_scope_check CHECK (scope IN ('pickup','destination','either'))
);
GRANT SELECT ON public.location_pricing_rules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.location_pricing_rules TO authenticated;
GRANT ALL ON public.location_pricing_rules TO service_role;
ALTER TABLE public.location_pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads active location pricing" ON public.location_pricing_rules FOR SELECT USING (active = true);
CREATE POLICY "Admins manage location pricing" ON public.location_pricing_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER location_pricing_rules_set_updated_at BEFORE UPDATE ON public.location_pricing_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER location_pricing_rules_log AFTER INSERT OR UPDATE OR DELETE ON public.location_pricing_rules FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();

-- ============================================================
-- 9. pricing_modifiers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pricing_modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  modifier_type text NOT NULL DEFAULT 'percent',
  value numeric NOT NULL DEFAULT 0,
  vehicle_class_id uuid REFERENCES public.vehicle_classes(id) ON DELETE CASCADE,
  service_types text[],
  place_id text,
  place_label text,
  lat numeric,
  lng numeric,
  radius_miles numeric,
  scope text NOT NULL DEFAULT 'either',
  date_from date,
  date_to date,
  days_of_week smallint[],
  time_from text,
  time_to text,
  stackable boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pricing_modifiers_type_check CHECK (modifier_type IN ('percent','fixed')),
  CONSTRAINT pricing_modifiers_scope_check CHECK (scope IN ('pickup','destination','either'))
);
GRANT SELECT ON public.pricing_modifiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_modifiers TO authenticated;
GRANT ALL ON public.pricing_modifiers TO service_role;
ALTER TABLE public.pricing_modifiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads active modifiers" ON public.pricing_modifiers FOR SELECT USING (active = true);
CREATE POLICY "Admins manage modifiers" ON public.pricing_modifiers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER pricing_modifiers_set_updated_at BEFORE UPDATE ON public.pricing_modifiers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER pricing_modifiers_log AFTER INSERT OR UPDATE OR DELETE ON public.pricing_modifiers FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();

-- ============================================================
-- 10. discount_rules (incl. admin-defined events)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.discount_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  basis text NOT NULL DEFAULT 'vehicle_class',
  discount_type text NOT NULL DEFAULT 'percent',
  value numeric NOT NULL DEFAULT 0,
  event_name text,
  place_id text,
  place_label text,
  lat numeric,
  lng numeric,
  radius_miles numeric,
  scope text NOT NULL DEFAULT 'either',
  starts_at timestamptz,
  ends_at timestamptz,
  vehicle_class_ids uuid[],
  service_types text[],
  max_discount numeric,
  stackable boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT discount_rules_basis_check CHECK (basis IN ('radius','vehicle_class','location','event')),
  CONSTRAINT discount_rules_type_check CHECK (discount_type IN ('percent','fixed')),
  CONSTRAINT discount_rules_scope_check CHECK (scope IN ('pickup','destination','either'))
);
GRANT SELECT ON public.discount_rules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discount_rules TO authenticated;
GRANT ALL ON public.discount_rules TO service_role;
ALTER TABLE public.discount_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads active discount rules" ON public.discount_rules FOR SELECT USING (active = true);
CREATE POLICY "Admins manage discount rules" ON public.discount_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER discount_rules_set_updated_at BEFORE UPDATE ON public.discount_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER discount_rules_log AFTER INSERT OR UPDATE OR DELETE ON public.discount_rules FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();

-- ============================================================
-- 11. availability_rules
-- ============================================================
CREATE TABLE IF NOT EXISTS public.availability_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rule_scope text NOT NULL DEFAULT 'global',
  vehicle_class_id uuid REFERENCES public.vehicle_classes(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE,
  service_types text[],
  effect text NOT NULL DEFAULT 'block',
  date_from date,
  date_to date,
  days_of_week smallint[],
  time_from text,
  time_to text,
  place_id text,
  place_label text,
  lat numeric,
  lng numeric,
  radius_miles numeric,
  scope text NOT NULL DEFAULT 'either',
  reason text,
  priority integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT availability_rules_scope_check CHECK (rule_scope IN ('global','service','vehicle_class','vehicle')),
  CONSTRAINT availability_rules_effect_check CHECK (effect IN ('block','allow')),
  CONSTRAINT availability_rules_geo_scope_check CHECK (scope IN ('pickup','destination','either'))
);
GRANT SELECT ON public.availability_rules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_rules TO authenticated;
GRANT ALL ON public.availability_rules TO service_role;
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads active availability rules" ON public.availability_rules FOR SELECT USING (active = true);
CREATE POLICY "Admins manage availability rules" ON public.availability_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER availability_rules_set_updated_at BEFORE UPDATE ON public.availability_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER availability_rules_log AFTER INSERT OR UPDATE OR DELETE ON public.availability_rules FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();

-- ============================================================
-- 12. bulk_import_jobs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bulk_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity text NOT NULL,
  filename text,
  mode text NOT NULL DEFAULT 'validate',
  total_rows integer NOT NULL DEFAULT 0,
  created_rows integer NOT NULL DEFAULT 0,
  updated_rows integer NOT NULL DEFAULT 0,
  error_rows integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  error_report jsonb,
  actor_id uuid,
  actor_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bulk_import_jobs TO authenticated;
GRANT ALL ON public.bulk_import_jobs TO service_role;
ALTER TABLE public.bulk_import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read bulk import jobs" ON public.bulk_import_jobs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write bulk import jobs" ON public.bulk_import_jobs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));