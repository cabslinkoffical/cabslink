CREATE TABLE public.extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price_pence integer NOT NULL DEFAULT 0,
  price_basis text NOT NULL DEFAULT 'per_unit',
  max_quantity integer NOT NULL DEFAULT 1,
  applies_to_all_classes boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT extras_price_basis_check CHECK (price_basis IN ('per_unit','per_booking','per_hour')),
  CONSTRAINT extras_price_nonneg CHECK (price_pence >= 0),
  CONSTRAINT extras_max_qty CHECK (max_quantity >= 1 AND max_quantity <= 20)
);

GRANT SELECT ON public.extras TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.extras TO authenticated;
GRANT ALL ON public.extras TO service_role;

ALTER TABLE public.extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active extras" ON public.extras
  FOR SELECT USING (active = true);
CREATE POLICY "Admins manage extras" ON public.extras
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER extras_set_updated_at BEFORE UPDATE ON public.extras
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.extra_vehicle_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extra_id uuid NOT NULL REFERENCES public.extras(id) ON DELETE CASCADE,
  vehicle_class_id uuid NOT NULL REFERENCES public.vehicle_classes(id) ON DELETE CASCADE,
  price_pence integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (extra_id, vehicle_class_id),
  CONSTRAINT extra_vc_price_nonneg CHECK (price_pence IS NULL OR price_pence >= 0)
);

GRANT SELECT ON public.extra_vehicle_classes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.extra_vehicle_classes TO authenticated;
GRANT ALL ON public.extra_vehicle_classes TO service_role;

ALTER TABLE public.extra_vehicle_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view extra class links" ON public.extra_vehicle_classes
  FOR SELECT USING (true);
CREATE POLICY "Admins manage extra class links" ON public.extra_vehicle_classes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.extras (key, name, description, price_pence, price_basis, max_quantity, applies_to_all_classes, active, sort_order)
SELECT 'child_seat', 'Child Seat', 'Rear-facing or forward-facing child seat fitted by the driver.',
       COALESCE((SELECT child_seat_fee_pence FROM public.site_settings LIMIT 1), 1000),
       'per_unit', 4, true, true, 10
UNION ALL SELECT 'additional_child_seat', 'Additional Child Seat', 'Each extra child seat beyond the first.',
       COALESCE((SELECT child_seat_fee_pence FROM public.site_settings LIMIT 1), 1000),
       'per_unit', 4, true, false, 20
UNION ALL SELECT 'booster_seat', 'Booster Seat', 'Booster cushion for older children.',
       COALESCE((SELECT child_seat_fee_pence FROM public.site_settings LIMIT 1), 1000),
       'per_unit', 4, true, false, 30
UNION ALL SELECT 'meet_greet', 'Meet & Greet', 'Driver waits inside the terminal with a name board.',
       COALESCE((SELECT meet_greet_fee_pence FROM public.site_settings LIMIT 1), 1500),
       'per_booking', 1, true, true, 40
UNION ALL SELECT 'additional_pickup', 'Additional Pickup', 'Extra pickup or drop-off stop on the way.',
       2000, 'per_unit', 5, true, true, 50
UNION ALL SELECT 'waiting_time', 'Waiting Time', 'Pre-booked waiting beyond the free allowance.',
       450, 'per_hour', 8, true, false, 60;