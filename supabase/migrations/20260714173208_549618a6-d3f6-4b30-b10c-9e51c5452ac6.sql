
-- ============================================================
-- Phase 2B-2 · Route POIs, Scenic Templates, Tour Conversion
-- Additive only. No destructive changes.
-- ============================================================

-- ---------- 1. points_of_interest ----------
CREATE TABLE public.points_of_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id text NOT NULL DEFAULT '',
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  short_description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'landmark',
  latitude numeric(9,6),
  longitude numeric(9,6),
  address_label text NOT NULL DEFAULT '',
  image_url text,
  recommended_visit_minutes integer NOT NULL DEFAULT 30 CHECK (recommended_visit_minutes >= 0),
  minimum_visit_minutes integer NOT NULL DEFAULT 15 CHECK (minimum_visit_minutes >= 0),
  maximum_visit_minutes integer NOT NULL DEFAULT 240 CHECK (maximum_visit_minutes >= 0),
  stop_fee_pence integer NOT NULL DEFAULT 0 CHECK (stop_fee_pence >= 0),
  parking_fee_pence integer NOT NULL DEFAULT 0 CHECK (parking_fee_pence >= 0),
  admission_note text,
  opening_hours_note text,
  active boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  scenic_score integer NOT NULL DEFAULT 0 CHECK (scenic_score BETWEEN 0 AND 100),
  admin_priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT poi_visit_bounds CHECK (minimum_visit_minutes <= maximum_visit_minutes),
  CONSTRAINT poi_active_needs_place_id CHECK (
    active = false OR (place_id ~ '^[A-Za-z0-9_\-:.=@]+$' AND length(place_id) BETWEEN 1 AND 300)
  )
);

GRANT SELECT ON public.points_of_interest TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.points_of_interest TO authenticated;
GRANT ALL ON public.points_of_interest TO service_role;

ALTER TABLE public.points_of_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active POIs"
  ON public.points_of_interest FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can view all POIs"
  ON public.points_of_interest FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage POIs"
  ON public.points_of_interest FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_poi_set_updated_at
  BEFORE UPDATE ON public.points_of_interest
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_poi_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON public.points_of_interest
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();

CREATE INDEX idx_poi_active ON public.points_of_interest (active) WHERE active = true;
CREATE INDEX idx_poi_place_id ON public.points_of_interest (place_id) WHERE place_id <> '';
CREATE INDEX idx_poi_category ON public.points_of_interest (category);

-- ---------- 2. scenic_route_templates ----------
CREATE TABLE public.scenic_route_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  origin_place_id text NOT NULL DEFAULT '',
  origin_label text NOT NULL DEFAULT '',
  destination_place_id text NOT NULL DEFAULT '',
  destination_label text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  service_type text NOT NULL DEFAULT 'sightseeing_transfer'
    CHECK (service_type IN ('direct_transfer','transfer_with_stop','sightseeing_transfer','private_tour')),
  bidirectional boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  default_order_locked boolean NOT NULL DEFAULT true,
  optimisation_allowed boolean NOT NULL DEFAULT false,
  tour_fee_pence integer NOT NULL DEFAULT 0 CHECK (tour_fee_pence >= 0),
  seasonal_note text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scenic_active_needs_place_ids CHECK (
    active = false OR (
      origin_place_id ~ '^[A-Za-z0-9_\-:.=@]+$' AND
      destination_place_id ~ '^[A-Za-z0-9_\-:.=@]+$'
    )
  )
);

CREATE UNIQUE INDEX scenic_template_unique_active_pair
  ON public.scenic_route_templates (origin_place_id, destination_place_id)
  WHERE active = true;

GRANT SELECT ON public.scenic_route_templates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scenic_route_templates TO authenticated;
GRANT ALL ON public.scenic_route_templates TO service_role;

ALTER TABLE public.scenic_route_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active scenic templates"
  ON public.scenic_route_templates FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can view all scenic templates"
  ON public.scenic_route_templates FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage scenic templates"
  ON public.scenic_route_templates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_scenic_template_set_updated_at
  BEFORE UPDATE ON public.scenic_route_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_scenic_template_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON public.scenic_route_templates
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();

-- ---------- 3. scenic_route_template_pois (join) ----------
CREATE TABLE public.scenic_route_template_pois (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_template_id uuid NOT NULL REFERENCES public.scenic_route_templates(id) ON DELETE CASCADE,
  poi_id uuid NOT NULL REFERENCES public.points_of_interest(id) ON DELETE RESTRICT,
  stop_order integer NOT NULL CHECK (stop_order > 0),
  recommended boolean NOT NULL DEFAULT true,
  default_selected boolean NOT NULL DEFAULT false,
  recommended_visit_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_template_id, poi_id),
  UNIQUE (route_template_id, stop_order) DEFERRABLE INITIALLY DEFERRED
);

GRANT SELECT ON public.scenic_route_template_pois TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scenic_route_template_pois TO authenticated;
GRANT ALL ON public.scenic_route_template_pois TO service_role;

ALTER TABLE public.scenic_route_template_pois ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view template POIs"
  ON public.scenic_route_template_pois FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage template POIs"
  ON public.scenic_route_template_pois FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_scenic_template_poi_set_updated_at
  BEFORE UPDATE ON public.scenic_route_template_pois
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_scenic_template_pois_template ON public.scenic_route_template_pois (route_template_id, stop_order);
CREATE INDEX idx_scenic_template_pois_poi ON public.scenic_route_template_pois (poi_id);

-- ---------- 4. site_settings extension ----------
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS sightseeing_threshold_minutes integer NOT NULL DEFAULT 30 CHECK (sightseeing_threshold_minutes >= 0),
  ADD COLUMN IF NOT EXISTS tour_threshold_minutes integer NOT NULL DEFAULT 120 CHECK (tour_threshold_minutes >= 0),
  ADD COLUMN IF NOT EXISTS tour_threshold_stops integer NOT NULL DEFAULT 3 CHECK (tour_threshold_stops >= 0),
  ADD COLUMN IF NOT EXISTS max_selected_stops integer NOT NULL DEFAULT 8 CHECK (max_selected_stops BETWEEN 0 AND 25),
  ADD COLUMN IF NOT EXISTS max_detour_miles numeric(6,2) NOT NULL DEFAULT 30 CHECK (max_detour_miles >= 0),
  ADD COLUMN IF NOT EXISTS max_detour_minutes integer NOT NULL DEFAULT 45 CHECK (max_detour_minutes >= 0),
  ADD COLUMN IF NOT EXISTS max_poi_suggestions integer NOT NULL DEFAULT 12 CHECK (max_poi_suggestions >= 0),
  ADD COLUMN IF NOT EXISTS poi_discovery_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allowed_stop_duration_minutes integer[] NOT NULL DEFAULT ARRAY[15,30,45,60,90,120],
  ADD COLUMN IF NOT EXISTS included_stop_minutes integer NOT NULL DEFAULT 15 CHECK (included_stop_minutes >= 0),
  ADD COLUMN IF NOT EXISTS price_per_extra_15min_pence integer NOT NULL DEFAULT 500 CHECK (price_per_extra_15min_pence >= 0),
  ADD COLUMN IF NOT EXISTS tour_conversion_wording text NOT NULL DEFAULT 'Your journey is now a private tour. Please confirm before booking.';

-- ---------- 5. quote_calculations extension ----------
ALTER TABLE public.quote_calculations
  ADD COLUMN IF NOT EXISTS direct_distance_miles numeric(8,2),
  ADD COLUMN IF NOT EXISTS direct_duration_seconds integer,
  ADD COLUMN IF NOT EXISTS driving_duration_seconds integer,
  ADD COLUMN IF NOT EXISTS planned_stop_duration_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_journey_seconds integer,
  ADD COLUMN IF NOT EXISTS route_mode text NOT NULL DEFAULT 'direct'
    CHECK (route_mode IN ('direct','scenic','optimised')),
  ADD COLUMN IF NOT EXISTS original_service_type text NOT NULL DEFAULT 'direct_transfer',
  ADD COLUMN IF NOT EXISTS final_service_type text NOT NULL DEFAULT 'direct_transfer',
  ADD COLUMN IF NOT EXISTS classification_reason text,
  ADD COLUMN IF NOT EXISTS selected_pois jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS route_legs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS polyline_ref text,
  ADD COLUMN IF NOT EXISTS stops_fingerprint text,
  ADD COLUMN IF NOT EXISTS scenic_template_id uuid REFERENCES public.scenic_route_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quote_calc_stops_fp ON public.quote_calculations (stops_fingerprint)
  WHERE stops_fingerprint IS NOT NULL;

-- ---------- 6. bookings extension ----------
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT 'direct_transfer'
    CHECK (service_type IN ('direct_transfer','transfer_with_stop','sightseeing_transfer','private_tour')),
  ADD COLUMN IF NOT EXISTS original_service_type text NOT NULL DEFAULT 'direct_transfer'
    CHECK (original_service_type IN ('direct_transfer','transfer_with_stop','sightseeing_transfer','private_tour')),
  ADD COLUMN IF NOT EXISTS tour_conversion_ack_at timestamptz,
  ADD COLUMN IF NOT EXISTS stops_fingerprint text,
  ADD COLUMN IF NOT EXISTS scenic_template_id uuid REFERENCES public.scenic_route_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS planned_stop_duration_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS driving_duration_seconds integer,
  ADD COLUMN IF NOT EXISTS total_journey_seconds integer,
  ADD COLUMN IF NOT EXISTS selected_pois jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS route_legs jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ---------- 7. Edinburgh → Fort William draft seed ----------
-- Template + 7 POIs. All inactive. place_id empty; admin must resolve
-- each through the POI admin page and then activate.
INSERT INTO public.points_of_interest (name, slug, category, short_description, recommended_visit_minutes, minimum_visit_minutes, maximum_visit_minutes, admin_priority, scenic_score)
VALUES
  ('The Kelpies',        'the-kelpies',       'landmark',      '30-metre horse-head sculptures beside the Forth & Clyde Canal.', 30, 15, 90,  90, 80),
  ('Falkirk Wheel',      'falkirk-wheel',     'landmark',      'The world''s only rotating boat lift, connecting two canals.',    45, 30, 120, 85, 75),
  ('Stirling Castle',    'stirling-castle',   'castle',        'One of Scotland''s grandest castles, on a volcanic crag.',        90, 45, 180, 95, 90),
  ('Doune Castle',       'doune-castle',      'castle',        '14th-century courtyard castle famed from film and TV.',           60, 30, 120, 70, 70),
  ('Callander',          'callander-village', 'village',       'Trossachs gateway village for tea, walks and photos.',            30, 15, 90,  60, 55),
  ('Lochearnhead',       'lochearnhead',      'viewpoint',     'Loch Earn head with mountain and water views.',                   20, 15, 60,  50, 65),
  ('Glencoe',            'glencoe',           'viewpoint',     'Dramatic glacial valley — iconic Highland viewpoint.',            45, 30, 120, 98, 100)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.scenic_route_templates (name, slug, description, service_type, tour_fee_pence, default_order_locked, optimisation_allowed, active, featured, display_order)
VALUES (
  'Edinburgh to Fort William Scenic Journey',
  'edinburgh-fort-william-scenic',
  'Curated scenic route from Edinburgh to Fort William through the Kelpies, Stirling, the Trossachs and Glencoe. Admin must resolve every Google Place ID before this template can be activated.',
  'private_tour',
  2500,
  true,
  false,
  false,
  true,
  10
) ON CONFLICT (slug) DO NOTHING;

-- Attach POIs in the suggested scenic order.
DO $$
DECLARE
  tpl_id uuid;
  slugs text[] := ARRAY[
    'the-kelpies',
    'falkirk-wheel',
    'stirling-castle',
    'doune-castle',
    'callander-village',
    'lochearnhead',
    'glencoe'
  ];
  minutes int[] := ARRAY[30, 45, 90, 60, 30, 20, 45];
  i int;
  poi_id_v uuid;
BEGIN
  SELECT id INTO tpl_id FROM public.scenic_route_templates WHERE slug = 'edinburgh-fort-william-scenic';
  IF tpl_id IS NULL THEN RETURN; END IF;

  FOR i IN 1..array_length(slugs, 1) LOOP
    SELECT id INTO poi_id_v FROM public.points_of_interest WHERE slug = slugs[i];
    IF poi_id_v IS NOT NULL THEN
      INSERT INTO public.scenic_route_template_pois (route_template_id, poi_id, stop_order, recommended, default_selected, recommended_visit_minutes)
      VALUES (tpl_id, poi_id_v, i, true, i <= 3, minutes[i])
      ON CONFLICT (route_template_id, poi_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;
