
-- ============================================================
-- Vehicle Classes + Vehicle Models
-- ============================================================

-- 1. vehicle_classes
CREATE TABLE public.vehicle_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  hero_image text,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  short_description text,
  long_description text,
  passengers integer NOT NULL DEFAULT 4,
  large_luggage integer NOT NULL DEFAULT 2,
  cabin_bags integer NOT NULL DEFAULT 2,
  hand_luggage integer NOT NULL DEFAULT 0,
  child_seats_supported boolean NOT NULL DEFAULT true,
  wheelchair_accessible boolean NOT NULL DEFAULT false,
  fuel_type text NOT NULL DEFAULT 'petrol_diesel',
  recommended_for jsonb NOT NULL DEFAULT '{}'::jsonb, -- {airport,corporate,long_distance,tours,weddings,executive}
  featured boolean NOT NULL DEFAULT false,
  badge text,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  quote_on_request boolean NOT NULL DEFAULT false,
  pricing_vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  seo_title text,
  seo_description text,
  seo_keywords text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vehicle_classes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_classes TO authenticated;
GRANT ALL ON public.vehicle_classes TO service_role;

ALTER TABLE public.vehicle_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active vehicle classes"
  ON public.vehicle_classes FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can view all vehicle classes"
  ON public.vehicle_classes FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert vehicle classes"
  ON public.vehicle_classes FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update vehicle classes"
  ON public.vehicle_classes FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete vehicle classes"
  ON public.vehicle_classes FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER vehicle_classes_set_updated_at
  BEFORE UPDATE ON public.vehicle_classes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER log_vehicle_classes_actions
  AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_classes
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();

CREATE INDEX vehicle_classes_display_order_idx ON public.vehicle_classes (display_order, name);

-- 2. vehicle_models
CREATE TABLE public.vehicle_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_class_id uuid NOT NULL REFERENCES public.vehicle_classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  manufacturer text,
  active boolean NOT NULL DEFAULT true,
  notes text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vehicle_models TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_models TO authenticated;
GRANT ALL ON public.vehicle_models TO service_role;

ALTER TABLE public.vehicle_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active vehicle models"
  ON public.vehicle_models FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can view all vehicle models"
  ON public.vehicle_models FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert vehicle models"
  ON public.vehicle_models FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update vehicle models"
  ON public.vehicle_models FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete vehicle models"
  ON public.vehicle_models FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER vehicle_models_set_updated_at
  BEFORE UPDATE ON public.vehicle_models
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER log_vehicle_models_actions
  AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_models
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();

CREATE INDEX vehicle_models_class_idx ON public.vehicle_models (vehicle_class_id, display_order);

-- 3. Extend bookings + quote_calculations (additive)
ALTER TABLE public.bookings
  ADD COLUMN vehicle_class_id uuid REFERENCES public.vehicle_classes(id) ON DELETE SET NULL,
  ADD COLUMN vehicle_class_name_snapshot text;

CREATE INDEX bookings_vehicle_class_id_idx ON public.bookings (vehicle_class_id);

ALTER TABLE public.quote_calculations
  ADD COLUMN vehicle_class_id uuid REFERENCES public.vehicle_classes(id) ON DELETE SET NULL;

CREATE INDEX quote_calc_vehicle_class_id_idx ON public.quote_calculations (vehicle_class_id);

-- 4. Seed 14 classes + Unclassified
INSERT INTO public.vehicle_classes
  (name, slug, passengers, large_luggage, cabin_bags, hand_luggage, child_seats_supported, wheelchair_accessible, fuel_type, recommended_for, display_order, short_description, long_description, featured, badge)
VALUES
  ('Economy Saloon', 'economy-saloon', 3, 2, 2, 0, true, false, 'petrol_hybrid',
   '{"airport":true,"corporate":false,"long_distance":true,"tours":false,"weddings":false,"executive":false}'::jsonb,
   10, 'Comfortable, efficient private transfer.',
   'Reliable everyday travel in a modern, well-maintained saloon. Ideal for airport transfers and city journeys where value matters.', false, null),

  ('Standard Saloon', 'standard-saloon', 3, 2, 2, 0, true, false, 'petrol_diesel',
   '{"airport":true,"corporate":true,"long_distance":true,"tours":false,"weddings":false,"executive":false}'::jsonb,
   20, 'Refined saloon for everyday business travel.',
   'A step up from economy with additional comfort, quiet cabins, and professional presentation.', false, null),

  ('Executive Saloon', 'executive-saloon', 3, 2, 2, 0, true, false, 'petrol_diesel',
   '{"airport":true,"corporate":true,"long_distance":true,"tours":true,"weddings":true,"executive":true}'::jsonb,
   30, 'Premium executive travel with a professional driver.',
   'Our most popular class. Latest E-Class, 5 Series, A6-tier vehicles with leather interiors, chilled bottled water, and professional chauffeurs.', true, 'Most popular'),

  ('Luxury Chauffeur Saloon', 'luxury-chauffeur-saloon', 3, 2, 2, 0, true, false, 'petrol_diesel',
   '{"airport":true,"corporate":true,"long_distance":true,"tours":true,"weddings":true,"executive":true}'::jsonb,
   40, 'Flagship luxury saloons for VIP travel.',
   'The absolute top tier — S-Class, 7 Series, A8, Range Rover. Rear-cabin comfort, executive privacy, and the highest standard of service.', true, 'Luxury'),

  ('Estate Car', 'estate-car', 4, 4, 2, 0, true, false, 'petrol_diesel',
   '{"airport":true,"corporate":false,"long_distance":true,"tours":false,"weddings":false,"executive":false}'::jsonb,
   50, 'Extra luggage space in a comfortable saloon.',
   'Perfect for families or business travellers with extra luggage. Same comfort as a saloon, with generous boot capacity.', false, null),

  ('Standard MPV', 'standard-mpv', 5, 4, 3, 0, true, false, 'petrol_diesel',
   '{"airport":true,"corporate":false,"long_distance":true,"tours":true,"weddings":false,"executive":false}'::jsonb,
   60, 'Spacious MPV for groups up to five.',
   'Room for the whole family plus luggage. Great for airport runs and day trips.', false, null),

  ('Seven-Seater MPV', 'seven-seater-mpv', 7, 5, 3, 0, true, false, 'petrol_diesel',
   '{"airport":true,"corporate":false,"long_distance":true,"tours":true,"weddings":false,"executive":false}'::jsonb,
   70, 'Room for larger groups with plenty of luggage.',
   'Seven passenger seats plus significant luggage capacity. Ideal for families, small teams, and airport transfers.', false, null),

  ('Premium MPV', 'premium-mpv', 7, 7, 4, 0, true, false, 'petrol_diesel',
   '{"airport":true,"corporate":true,"long_distance":true,"tours":true,"weddings":true,"executive":true}'::jsonb,
   80, 'First-class MPV — the executive V-Class experience.',
   'Mercedes V-Class and equivalents. Conference-style seating, tinted glass, and generous luggage capacity. The go-to for VIP groups and corporate travel.', true, 'Premium'),

  ('Eight-Seater Van', 'eight-seater-van', 8, 8, 4, 0, true, false, 'petrol_diesel',
   '{"airport":true,"corporate":false,"long_distance":true,"tours":true,"weddings":false,"executive":false}'::jsonb,
   90, 'High-capacity van for group airport travel.',
   'A practical, spacious van for group transfers with substantial luggage.', false, null),

  ('Executive Minibus', 'executive-minibus', 16, 16, 8, 0, false, false, 'diesel',
   '{"airport":true,"corporate":true,"long_distance":true,"tours":true,"weddings":true,"executive":false}'::jsonb,
   100, 'Minibus for larger corporate groups and events.',
   'Mercedes Sprinter class minibuses seating up to 16 with executive interiors. Great for weddings, corporate events, and group tours.', false, null),

  ('Coach', 'coach', 55, 40, 20, 0, false, false, 'diesel',
   '{"airport":true,"corporate":true,"long_distance":true,"tours":true,"weddings":true,"executive":false}'::jsonb,
   110, 'Full-size coach for large groups and events.',
   'Up to 55 passengers with air-conditioning, panoramic windows, and dedicated luggage holds. Quote on request based on itinerary.', false, 'Quote on request'),

  ('Wheelchair Accessible Vehicle', 'wheelchair-accessible', 4, 2, 2, 0, false, true,
   'petrol_diesel',
   '{"airport":true,"corporate":false,"long_distance":true,"tours":true,"weddings":false,"executive":false}'::jsonb,
   120, 'Ramp-equipped WAV for accessible travel.',
   'Wheelchair Accessible Vehicles with rear ramps and secure clamping systems. Dedicated drivers trained in accessible travel.', false, 'Accessible'),

  ('Electric Saloon', 'electric-saloon', 3, 2, 2, 0, true, false, 'electric',
   '{"airport":true,"corporate":true,"long_distance":false,"tours":true,"weddings":false,"executive":true}'::jsonb,
   130, 'Zero-emission premium saloon.',
   'Fully electric saloons — Tesla, EQE, Polestar, i5. Silent, sustainable, and premium.', true, 'Zero emission'),

  ('Electric MPV', 'electric-mpv', 7, 5, 3, 0, true, false, 'electric',
   '{"airport":true,"corporate":true,"long_distance":false,"tours":true,"weddings":false,"executive":true}'::jsonb,
   140, 'Zero-emission group travel.',
   'Fully electric MPVs — EQV, ID.Buzz, e-Traveller. Sustainable group transport with executive interiors.', false, 'Zero emission'),

  ('Unclassified', 'unclassified', 4, 2, 2, 0, false, false, 'petrol_diesel',
   '{}'::jsonb, 999, 'Legacy vehicles pending review.',
   'Vehicles that need admin re-classification.', false, null);

-- 5. Link existing vehicles to their new classes (preserves all pricing)
UPDATE public.vehicle_classes SET pricing_vehicle_id = (SELECT id FROM public.vehicles WHERE name ILIKE '%E-Class%' LIMIT 1)
  WHERE slug = 'executive-saloon';
UPDATE public.vehicle_classes SET pricing_vehicle_id = (SELECT id FROM public.vehicles WHERE name ILIKE '%S-Class%' LIMIT 1)
  WHERE slug = 'luxury-chauffeur-saloon';
UPDATE public.vehicle_classes SET pricing_vehicle_id = (SELECT id FROM public.vehicles WHERE name ILIKE '%V-Class%' LIMIT 1)
  WHERE slug = 'premium-mpv';

-- 6. Seed representative vehicle models
INSERT INTO public.vehicle_models (vehicle_class_id, name, manufacturer, display_order)
SELECT c.id, m.name, m.manufacturer, m.ord FROM public.vehicle_classes c
JOIN (VALUES
  ('economy-saloon','Toyota Corolla','Toyota',10),
  ('economy-saloon','Toyota Prius','Toyota',20),
  ('economy-saloon','Hyundai Ioniq','Hyundai',30),
  ('economy-saloon','Kia Niro','Kia',40),
  ('economy-saloon','Skoda Octavia','Skoda',50),
  ('economy-saloon','Volkswagen Passat','Volkswagen',60),
  ('economy-saloon','Ford Mondeo','Ford',70),
  ('standard-saloon','Skoda Superb','Skoda',10),
  ('standard-saloon','Volkswagen Passat','Volkswagen',20),
  ('standard-saloon','Toyota Camry','Toyota',30),
  ('standard-saloon','Volvo S60','Volvo',40),
  ('standard-saloon','Peugeot 508','Peugeot',50),
  ('standard-saloon','Hyundai Sonata','Hyundai',60),
  ('standard-saloon','Mercedes-Benz C-Class','Mercedes-Benz',70),
  ('executive-saloon','Mercedes-Benz E-Class','Mercedes-Benz',10),
  ('executive-saloon','BMW 5 Series','BMW',20),
  ('executive-saloon','Audi A6','Audi',30),
  ('executive-saloon','Volvo S90','Volvo',40),
  ('executive-saloon','Jaguar XF','Jaguar',50),
  ('executive-saloon','Lexus ES','Lexus',60),
  ('executive-saloon','Tesla Model S','Tesla',70),
  ('luxury-chauffeur-saloon','Mercedes-Benz S-Class','Mercedes-Benz',10),
  ('luxury-chauffeur-saloon','BMW 7 Series','BMW',20),
  ('luxury-chauffeur-saloon','Audi A8','Audi',30),
  ('luxury-chauffeur-saloon','Range Rover','Land Rover',40),
  ('luxury-chauffeur-saloon','Bentley Flying Spur','Bentley',50),
  ('luxury-chauffeur-saloon','Rolls-Royce Ghost','Rolls-Royce',60),
  ('luxury-chauffeur-saloon','Mercedes-Maybach S-Class','Mercedes-Benz',70),
  ('estate-car','Skoda Superb Estate','Skoda',10),
  ('estate-car','Volkswagen Passat Estate','Volkswagen',20),
  ('estate-car','Mercedes-Benz E-Class Estate','Mercedes-Benz',30),
  ('estate-car','BMW 5 Series Touring','BMW',40),
  ('estate-car','Volvo V90','Volvo',50),
  ('estate-car','Audi A6 Avant','Audi',60),
  ('estate-car','Toyota Corolla Touring Sports','Toyota',70),
  ('standard-mpv','Volkswagen Touran','Volkswagen',10),
  ('standard-mpv','Ford Galaxy','Ford',20),
  ('standard-mpv','Ford S-Max','Ford',30),
  ('standard-mpv','SEAT Alhambra','SEAT',40),
  ('standard-mpv','Volkswagen Sharan','Volkswagen',50),
  ('standard-mpv','Citroën Grand C4 SpaceTourer','Citroën',60),
  ('standard-mpv','Peugeot 5008','Peugeot',70),
  ('seven-seater-mpv','Volkswagen Sharan','Volkswagen',10),
  ('seven-seater-mpv','SEAT Alhambra','SEAT',20),
  ('seven-seater-mpv','Ford Galaxy','Ford',30),
  ('seven-seater-mpv','Kia Sorento','Kia',40),
  ('seven-seater-mpv','Hyundai Santa Fe','Hyundai',50),
  ('seven-seater-mpv','Volvo XC90','Volvo',60),
  ('seven-seater-mpv','Peugeot 5008','Peugeot',70),
  ('seven-seater-mpv','Skoda Kodiaq','Skoda',80),
  ('premium-mpv','Mercedes-Benz V-Class','Mercedes-Benz',10),
  ('premium-mpv','Volkswagen Multivan','Volkswagen',20),
  ('premium-mpv','Lexus LM','Lexus',30),
  ('premium-mpv','Toyota Alphard','Toyota',40),
  ('premium-mpv','Toyota Vellfire','Toyota',50),
  ('premium-mpv','Volkswagen Caravelle','Volkswagen',60),
  ('eight-seater-van','Mercedes-Benz Vito Tourer','Mercedes-Benz',10),
  ('eight-seater-van','Volkswagen Transporter Shuttle','Volkswagen',20),
  ('eight-seater-van','Ford Tourneo Custom','Ford',30),
  ('eight-seater-van','Peugeot Traveller','Peugeot',40),
  ('eight-seater-van','Citroën SpaceTourer','Citroën',50),
  ('eight-seater-van','Toyota Proace Verso','Toyota',60),
  ('eight-seater-van','Vauxhall Vivaro Life','Vauxhall',70),
  ('executive-minibus','Mercedes-Benz Sprinter','Mercedes-Benz',10),
  ('executive-minibus','Ford Transit Minibus','Ford',20),
  ('executive-minibus','Volkswagen Crafter','Volkswagen',30),
  ('executive-minibus','MAN TGE Minibus','MAN',40),
  ('executive-minibus','Iveco Daily Minibus','Iveco',50),
  ('executive-minibus','Renault Master Minibus','Renault',60),
  ('coach','Mercedes-Benz Tourismo','Mercedes-Benz',10),
  ('coach','Volvo 9700','Volvo',20),
  ('coach','Scania Touring','Scania',30),
  ('coach','Irizar i6','Irizar',40),
  ('coach','Plaxton Panther','Plaxton',50),
  ('coach','Van Hool TX','Van Hool',60),
  ('coach','Temsa HD','Temsa',70),
  ('wheelchair-accessible','Volkswagen Caddy Maxi Life','Volkswagen',10),
  ('wheelchair-accessible','Ford Tourneo Connect','Ford',20),
  ('wheelchair-accessible','Peugeot Rifter','Peugeot',30),
  ('wheelchair-accessible','Citroën Berlingo','Citroën',40),
  ('wheelchair-accessible','Renault Kangoo','Renault',50),
  ('wheelchair-accessible','Mercedes-Benz Vito WAV','Mercedes-Benz',60),
  ('wheelchair-accessible','Ford Tourneo Custom WAV','Ford',70),
  ('electric-saloon','Tesla Model 3','Tesla',10),
  ('electric-saloon','Tesla Model S','Tesla',20),
  ('electric-saloon','BMW i5','BMW',30),
  ('electric-saloon','Mercedes-Benz EQE','Mercedes-Benz',40),
  ('electric-saloon','Hyundai Ioniq 6','Hyundai',50),
  ('electric-saloon','Polestar 2','Polestar',60),
  ('electric-saloon','Volkswagen ID.7','Volkswagen',70),
  ('electric-mpv','Mercedes-Benz EQV','Mercedes-Benz',10),
  ('electric-mpv','Volkswagen ID. Buzz','Volkswagen',20),
  ('electric-mpv','Peugeot e-Traveller','Peugeot',30),
  ('electric-mpv','Citroën ë-SpaceTourer','Citroën',40),
  ('electric-mpv','Vauxhall Vivaro Electric Life','Vauxhall',50),
  ('electric-mpv','Toyota Proace Verso Electric','Toyota',60),
  ('electric-mpv','Ford E-Tourneo Custom','Ford',70)
) AS m(slug, name, manufacturer, ord) ON m.slug = c.slug;

-- Quote-on-request on Coach
UPDATE public.vehicle_classes SET quote_on_request = true WHERE slug = 'coach';

-- 7. Backfill bookings.vehicle_class_id / snapshot from existing vehicle_id
UPDATE public.bookings b
SET vehicle_class_id = c.id,
    vehicle_class_name_snapshot = c.name
FROM public.vehicles v
JOIN public.vehicle_classes c ON c.pricing_vehicle_id = v.id
WHERE b.vehicle_id = v.id AND b.vehicle_class_id IS NULL;
