
-- 1. VEHICLES TABLE
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Executive',
  image_url text NOT NULL,
  description text NOT NULL DEFAULT '',
  passengers int NOT NULL DEFAULT 4,
  luggage int NOT NULL DEFAULT 2,
  hand_luggage int NOT NULL DEFAULT 2,
  price_per_hour numeric(10,2),
  display_order int NOT NULL DEFAULT 0,
  featured boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vehicles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active vehicles"
  ON public.vehicles FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can view all vehicles"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert vehicles"
  ON public.vehicles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update vehicles"
  ON public.vehicles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete vehicles"
  ON public.vehicles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER vehicles_set_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. CONTACT MESSAGE STATUS
DO $$ BEGIN
  CREATE TYPE public.message_status AS ENUM ('new','read','resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS status public.message_status NOT NULL DEFAULT 'new';

-- 3. ADMIN POLICIES on existing tables
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
CREATE POLICY "Admins can view all bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;
CREATE POLICY "Admins can update bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete bookings" ON public.bookings;
CREATE POLICY "Admins can delete bookings"
  ON public.bookings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all messages" ON public.contact_messages;
CREATE POLICY "Admins can view all messages"
  ON public.contact_messages FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update messages" ON public.contact_messages;
CREATE POLICY "Admins can update messages"
  ON public.contact_messages FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete messages" ON public.contact_messages;
CREATE POLICY "Admins can delete messages"
  ON public.contact_messages FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all user_roles" ON public.user_roles;
CREATE POLICY "Admins can view all user_roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. SEED FLEET (only if empty)
INSERT INTO public.vehicles (name, category, image_url, description, passengers, luggage, hand_luggage, display_order, featured, active)
SELECT * FROM (VALUES
  ('Rolls-Royce Bentley', 'Ultra-luxury', 'https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3ff6f734-b7e5-4c4f-828e-d991ff89a359/rolls.png', 'The ultimate VIP statement. Handcrafted interiors, whisper-quiet ride and a uniformed chauffeur for weddings, premieres and special occasions.', 3, 2, 2, 1, true, true),
  ('Mercedes-Benz S-Class', 'Executive flagship', 'https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3ff6f734-b7e5-4c4f-828e-d991ff89a359/sclass.png', 'The benchmark in business travel — Nappa leather, climate-controlled rear cabin and effortless airport-to-meeting comfort.', 4, 2, 1, 2, false, true),
  ('Mercedes-Benz E-Class', 'Business class', 'https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3ff6f734-b7e5-4c4f-828e-d991ff89a359/eclass.png', 'Refined executive saloon for individuals and small groups — quiet, comfortable and impeccably presented.', 3, 2, 2, 3, false, true),
  ('Mercedes-Benz V-Class', 'Signature people carrier', 'https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3ff6f734-b7e5-4c4f-828e-d991ff89a359/vclass.png', 'Our signature 8-seater — captain seats, privacy glass and generous luggage space for families and corporate groups.', 8, 6, 2, 4, false, true),
  ('Range Rover', 'Luxury SUV', 'https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3ff6f734-b7e5-4c4f-828e-d991ff89a359/rangerover.png', 'Commanding presence and supreme comfort — the discreet luxury SUV for VIPs, security details and country journeys.', 4, 3, 2, 5, false, true),
  ('Mini Bus (16-seater)', 'Group travel', 'https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3ff6f734-b7e5-4c4f-828e-d991ff89a359/minibus.png', 'Modern 16-seat minibus for corporate groups, weddings, sports teams and airport runs with full luggage capacity.', 16, 16, 16, 6, false, true),
  ('Coaster Bus (24-seater)', 'Mid-size group', 'https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3ff6f734-b7e5-4c4f-828e-d991ff89a359/coaster.png', 'Comfortable 24-seat coaster for tours, conferences and event shuttles — air-conditioned with ample storage.', 24, 24, 20, 7, false, true),
  ('Coach Bus (55-seater)', 'Large groups & tours', 'https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3ff6f734-b7e5-4c4f-828e-d991ff89a359/coach.png', 'Full-size 55-seat coach for tours, weddings and corporate events — premium seating, climate control and on-board luggage hold.', 55, 55, 30, 8, false, true)
) AS v(name, category, image_url, description, passengers, luggage, hand_luggage, display_order, featured, active)
WHERE NOT EXISTS (SELECT 1 FROM public.vehicles);
