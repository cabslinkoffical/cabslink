-- 1. Booking status enum additions
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'payment_failed';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'expired';

-- 2. Tour hour tiers
CREATE TABLE public.tour_hour_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hours numeric NOT NULL UNIQUE,
  included_miles numeric NOT NULL DEFAULT 0,
  is_bookable boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tour_hour_tiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_hour_tiers TO authenticated;
GRANT ALL ON public.tour_hour_tiers TO service_role;
ALTER TABLE public.tour_hour_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tour_hour_tiers public read" ON public.tour_hour_tiers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "tour_hour_tiers admin manage" ON public.tour_hour_tiers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER tour_hour_tiers_updated_at BEFORE UPDATE ON public.tour_hour_tiers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Tour rules (single settings row)
CREATE TABLE public.tour_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  earliest_start_time time NOT NULL DEFAULT '07:00',
  latest_finish_time time NOT NULL DEFAULT '22:00',
  max_bookable_hours numeric NOT NULL DEFAULT 12,
  minimum_stop_minutes integer NOT NULL DEFAULT 20,
  pickup_buffer_minutes integer NOT NULL DEFAULT 15,
  mileage_tolerance_miles numeric NOT NULL DEFAULT 10,
  minimum_notice_hours integer NOT NULL DEFAULT 24,
  checkout_hold_minutes integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tour_rules TO anon;
GRANT SELECT, INSERT, UPDATE ON public.tour_rules TO authenticated;
GRANT ALL ON public.tour_rules TO service_role;
ALTER TABLE public.tour_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tour_rules public read" ON public.tour_rules FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "tour_rules admin manage" ON public.tour_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER tour_rules_updated_at BEFORE UPDATE ON public.tour_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Daily capacity per vehicle class
CREATE TABLE public.vehicle_class_daily_capacity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_class_id uuid NOT NULL REFERENCES public.vehicle_classes(id) ON DELETE CASCADE UNIQUE,
  max_tours_per_day integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vehicle_class_daily_capacity TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_class_daily_capacity TO authenticated;
GRANT ALL ON public.vehicle_class_daily_capacity TO service_role;
ALTER TABLE public.vehicle_class_daily_capacity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vcdc public read" ON public.vehicle_class_daily_capacity FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "vcdc admin manage" ON public.vehicle_class_daily_capacity FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER vcdc_updated_at BEFORE UPDATE ON public.vehicle_class_daily_capacity
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Vehicle class tour rate card
ALTER TABLE public.vehicle_classes
  ADD COLUMN IF NOT EXISTS hourly_rate numeric,
  ADD COLUMN IF NOT EXISTS extra_hour_rate numeric,
  ADD COLUMN IF NOT EXISTS extra_mile_rate numeric,
  ADD COLUMN IF NOT EXISTS min_hours numeric,
  ADD COLUMN IF NOT EXISTS max_hours numeric,
  ADD COLUMN IF NOT EXISTS max_passengers integer,
  ADD COLUMN IF NOT EXISTS max_luggage integer;

-- 6. Tour template booking fields
ALTER TABLE public.scenic_route_templates
  ADD COLUMN IF NOT EXISTS default_duration_hours numeric,
  ADD COLUMN IF NOT EXISTS min_duration_hours numeric,
  ADD COLUMN IF NOT EXISTS max_duration_hours numeric,
  ADD COLUMN IF NOT EXISTS included_miles numeric,
  ADD COLUMN IF NOT EXISTS start_mode text NOT NULL DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS fixed_start_address text,
  ADD COLUMN IF NOT EXISTS fixed_start_lat numeric,
  ADD COLUMN IF NOT EXISTS fixed_start_lng numeric,
  ADD COLUMN IF NOT EXISTS is_bookable boolean NOT NULL DEFAULT false;

CREATE TABLE public.template_fixed_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_template_id uuid NOT NULL REFERENCES public.scenic_route_templates(id) ON DELETE CASCADE,
  vehicle_class_id uuid NOT NULL REFERENCES public.vehicle_classes(id) ON DELETE CASCADE,
  price numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_template_id, vehicle_class_id)
);
GRANT SELECT ON public.template_fixed_prices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_fixed_prices TO authenticated;
GRANT ALL ON public.template_fixed_prices TO service_role;
ALTER TABLE public.template_fixed_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "template_fixed_prices public read" ON public.template_fixed_prices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "template_fixed_prices admin manage" ON public.template_fixed_prices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER template_fixed_prices_updated_at BEFORE UPDATE ON public.template_fixed_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Travel time / distance cache between stops
CREATE TABLE public.poi_travel_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_ref text NOT NULL,
  destination_ref text NOT NULL,
  drive_minutes numeric NOT NULL,
  distance_miles numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (origin_ref, destination_ref)
);
GRANT SELECT ON public.poi_travel_matrix TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poi_travel_matrix TO authenticated;
GRANT ALL ON public.poi_travel_matrix TO service_role;
ALTER TABLE public.poi_travel_matrix ENABLE ROW LEVEL SECURITY;
CREATE POLICY "poi_travel_matrix public read" ON public.poi_travel_matrix FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "poi_travel_matrix admin manage" ON public.poi_travel_matrix FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER poi_travel_matrix_updated_at BEFORE UPDATE ON public.poi_travel_matrix
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. Booking tour execution fields
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_mode text,
  ADD COLUMN IF NOT EXISTS booked_hours numeric,
  ADD COLUMN IF NOT EXISTS included_miles numeric,
  ADD COLUMN IF NOT EXISTS estimated_miles numeric,
  ADD COLUMN IF NOT EXISTS estimated_drive_minutes integer,
  ADD COLUMN IF NOT EXISTS estimated_extra_miles numeric,
  ADD COLUMN IF NOT EXISTS quoted_total numeric,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS payment_method_token text,
  ADD COLUMN IF NOT EXISTS clock_start_at timestamptz,
  ADD COLUMN IF NOT EXISTS clock_end_at timestamptz,
  ADD COLUMN IF NOT EXISTS odometer_start integer,
  ADD COLUMN IF NOT EXISTS odometer_end integer,
  ADD COLUMN IF NOT EXISTS actual_miles numeric,
  ADD COLUMN IF NOT EXISTS extra_hours_authorised numeric,
  ADD COLUMN IF NOT EXISTS final_extra_miles numeric,
  ADD COLUMN IF NOT EXISTS final_total numeric,
  ADD COLUMN IF NOT EXISTS reconciliation_status text;

-- 9. Placeholder settings so the admin screens open with data
INSERT INTO public.tour_rules (id) VALUES (gen_random_uuid());
INSERT INTO public.tour_hour_tiers (hours, included_miles, sort_order) VALUES
  (4, 80, 1), (5, 100, 2), (6, 120, 3), (8, 160, 4), (10, 200, 5), (12, 240, 6);