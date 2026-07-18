
-- 1. New columns on scenic_route_templates
ALTER TABLE public.scenic_route_templates
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS included jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS excluded jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recommended_vehicle_categories text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS recommended_start_time text,
  ADD COLUMN IF NOT EXISTS theme text,
  ADD COLUMN IF NOT EXISTS long_day boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS direct_distance_miles_cache numeric,
  ADD COLUMN IF NOT EXISTS direct_duration_seconds_cache integer,
  ADD COLUMN IF NOT EXISTS starting_price_pence_cache integer,
  ADD COLUMN IF NOT EXISTS starting_price_currency text,
  ADD COLUMN IF NOT EXISTS starting_price_calculated_at timestamptz,
  ADD COLUMN IF NOT EXISTS starting_price_vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL;

-- 2. Unique lowercase slug
CREATE UNIQUE INDEX IF NOT EXISTS scenic_route_templates_slug_lower_uidx
  ON public.scenic_route_templates ((lower(slug)));

-- 3. Publish-guard trigger
CREATE OR REPLACE FUNCTION public.scenic_template_publish_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE active_poi_count int;
BEGIN
  IF NEW.published IS TRUE THEN
    IF NEW.slug IS NULL OR btrim(NEW.slug) = '' THEN
      RAISE EXCEPTION 'Published tours require a slug' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.origin_place_id IS NULL OR btrim(NEW.origin_place_id) = ''
       OR NEW.destination_place_id IS NULL OR btrim(NEW.destination_place_id) = '' THEN
      RAISE EXCEPTION 'Published tours require both origin and destination Google Place IDs' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.active IS NOT TRUE THEN
      RAISE EXCEPTION 'A tour must be active before it can be published' USING ERRCODE = 'check_violation';
    END IF;
    SELECT count(*) INTO active_poi_count
      FROM public.scenic_route_template_pois srtp
      JOIN public.points_of_interest poi ON poi.id = srtp.poi_id
     WHERE srtp.route_template_id = NEW.id AND poi.active = true;
    IF active_poi_count = 0 THEN
      RAISE EXCEPTION 'Published tours require at least one active point of interest' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS scenic_template_publish_guard_trg ON public.scenic_route_templates;
CREATE TRIGGER scenic_template_publish_guard_trg
  BEFORE INSERT OR UPDATE ON public.scenic_route_templates
  FOR EACH ROW EXECUTE FUNCTION public.scenic_template_publish_guard();

-- 4. Public SELECT policy: only active + published
DROP POLICY IF EXISTS "Anyone can view active scenic templates" ON public.scenic_route_templates;
CREATE POLICY "Anyone can view published scenic templates"
  ON public.scenic_route_templates FOR SELECT TO public
  USING (active = true AND published = true);

-- 5. Cache invalidation
CREATE OR REPLACE FUNCTION public.scenic_template_invalidate_cache()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.origin_place_id IS DISTINCT FROM OLD.origin_place_id
       OR NEW.destination_place_id IS DISTINCT FROM OLD.destination_place_id
       OR NEW.recommended_vehicle_categories IS DISTINCT FROM OLD.recommended_vehicle_categories
       OR NEW.tour_fee_pence IS DISTINCT FROM OLD.tour_fee_pence THEN
      NEW.starting_price_pence_cache := NULL;
      NEW.starting_price_calculated_at := NULL;
      NEW.direct_distance_miles_cache := NULL;
      NEW.direct_duration_seconds_cache := NULL;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS scenic_template_invalidate_cache_trg ON public.scenic_route_templates;
CREATE TRIGGER scenic_template_invalidate_cache_trg
  BEFORE UPDATE ON public.scenic_route_templates
  FOR EACH ROW EXECUTE FUNCTION public.scenic_template_invalidate_cache();

CREATE OR REPLACE FUNCTION public.scenic_template_pois_invalidate_cache()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE tid uuid;
BEGIN
  tid := COALESCE(NEW.route_template_id, OLD.route_template_id);
  UPDATE public.scenic_route_templates
     SET starting_price_pence_cache = NULL,
         starting_price_calculated_at = NULL
   WHERE id = tid;
  RETURN COALESCE(NEW, OLD);
END; $$;
DROP TRIGGER IF EXISTS scenic_template_pois_invalidate_cache_trg ON public.scenic_route_template_pois;
CREATE TRIGGER scenic_template_pois_invalidate_cache_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.scenic_route_template_pois
  FOR EACH ROW EXECUTE FUNCTION public.scenic_template_pois_invalidate_cache();

CREATE OR REPLACE FUNCTION public.poi_change_invalidate_template_cache()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.scenic_route_templates srt
     SET starting_price_pence_cache = NULL,
         starting_price_calculated_at = NULL
   WHERE EXISTS (
     SELECT 1 FROM public.scenic_route_template_pois srtp
      WHERE srtp.route_template_id = srt.id
        AND srtp.poi_id = COALESCE(NEW.id, OLD.id)
   );
  RETURN COALESCE(NEW, OLD);
END; $$;
DROP TRIGGER IF EXISTS poi_change_invalidate_template_cache_trg ON public.points_of_interest;
CREATE TRIGGER poi_change_invalidate_template_cache_trg
  AFTER UPDATE OR DELETE ON public.points_of_interest
  FOR EACH ROW EXECUTE FUNCTION public.poi_change_invalidate_template_cache();

-- 6. Backfill the seeded template so /tours has real data on launch
UPDATE public.scenic_route_templates
   SET published = true,
       short_description = COALESCE(short_description,
         'Scenic private-chauffeur journey from Edinburgh to Fort William through Loch Lomond and Glencoe.'),
       hero_image_url = COALESCE(hero_image_url, '/tours/glencoe.jpg'),
       theme = COALESCE(theme, 'Scottish Highlands'),
       recommended_start_time = COALESCE(recommended_start_time, '08:30'),
       long_day = true
 WHERE slug = 'edinburgh-fort-william-scenic';
