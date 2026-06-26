
-- =========================================================
-- ENUMS
-- =========================================================
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'pending_allocation';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'bidding';

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('unpaid','paid','refunded','partial','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_class AS ENUM ('economy','business','first','executive_v','executive_van_8','green');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE driver_status AS ENUM ('active','inactive','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE discount_type AS ENUM ('fixed','percentage');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================
-- EXTEND bookings
-- =========================================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS driver_id uuid,
  ADD COLUMN IF NOT EXISTS price numeric(10,2),
  ADD COLUMN IF NOT EXISTS payment_status payment_status NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS booking_ref text,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_notes text;

-- Backfill booking_ref for existing rows
UPDATE public.bookings
  SET booking_ref = 'CL-' || lpad((floor(random()*900000)+100000)::int::text, 6, '0')
  WHERE booking_ref IS NULL;

-- =========================================================
-- EXTEND vehicles
-- =========================================================
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS tbms_id text,
  ADD COLUMN IF NOT EXISTS vehicle_class vehicle_class,
  ADD COLUMN IF NOT EXISTS base_fare numeric(10,2),
  ADD COLUMN IF NOT EXISTS per_mile_rate numeric(10,2),
  ADD COLUMN IF NOT EXISTS waiting_charge numeric(10,2),
  ADD COLUMN IF NOT EXISTS meet_greet_enabled boolean NOT NULL DEFAULT false;

-- =========================================================
-- addresses
-- =========================================================
CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  comparable_value text,
  pickup_charge numeric(10,2) NOT NULL DEFAULT 0,
  dropoff_charge numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT SELECT ON public.addresses TO anon;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active addresses" ON public.addresses FOR SELECT USING (active = true);
CREATE POLICY "Admins manage addresses" ON public.addresses FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER addresses_set_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- banned_addresses
-- =========================================================
CREATE TABLE IF NOT EXISTS public.banned_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address text NOT NULL,
  reason text,
  admin_notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banned_addresses TO authenticated;
GRANT ALL ON public.banned_addresses TO service_role;
ALTER TABLE public.banned_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage banned addresses" ON public.banned_addresses FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER banned_addresses_set_updated_at BEFORE UPDATE ON public.banned_addresses FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- drivers
-- =========================================================
CREATE TABLE IF NOT EXISTS public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  phone text,
  address text,
  license_number text,
  assigned_vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  status driver_status NOT NULL DEFAULT 'active',
  available boolean NOT NULL DEFAULT true,
  photo_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drivers TO authenticated;
GRANT ALL ON public.drivers TO service_role;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage drivers" ON public.drivers FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER drivers_set_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_driver_fk FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE SET NULL;

-- =========================================================
-- coupons
-- =========================================================
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type discount_type NOT NULL DEFAULT 'percentage',
  discount_value numeric(10,2) NOT NULL,
  min_booking_amount numeric(10,2) DEFAULT 0,
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  starts_at date,
  expires_at date,
  active boolean NOT NULL DEFAULT true,
  applicable_vehicle_classes text[],
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER coupons_set_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- payments
-- =========================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'GBP',
  method text,
  status payment_status NOT NULL DEFAULT 'unpaid',
  reference text,
  notes text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage payments" ON public.payments FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER payments_set_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX IF NOT EXISTS payments_booking_idx ON public.payments(booking_id);

-- =========================================================
-- site_settings (singleton)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.site_settings (
  id integer PRIMARY KEY DEFAULT 1,
  company_name text NOT NULL DEFAULT 'CabsLink',
  logo_url text,
  favicon_url text,
  primary_color text NOT NULL DEFAULT '#1e3a8a',
  contact_email text,
  contact_phone text,
  whatsapp_number text,
  business_address text,
  currency text NOT NULL DEFAULT 'GBP',
  timezone text NOT NULL DEFAULT 'Europe/London',
  tax_percentage numeric(5,2) NOT NULL DEFAULT 0,
  cancellation_policy text,
  default_booking_status booking_status NOT NULL DEFAULT 'new',
  maintenance_mode boolean NOT NULL DEFAULT false,
  smtp_host text,
  smtp_port integer,
  smtp_user text,
  google_maps_api_key text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);
GRANT SELECT, INSERT, UPDATE ON public.site_settings TO authenticated;
GRANT SELECT ON public.site_settings TO anon;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins update settings" ON public.site_settings FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert settings" ON public.site_settings FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER site_settings_set_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
