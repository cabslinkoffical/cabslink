
-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.seo_location_type AS ENUM ('country','nation','region','county','city','town','district');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.seo_operational_status AS ENUM ('active','partner','planned','not_serviced');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.seo_publication_status AS ENUM ('draft','needs_content','needs_review','approved','published','noindex','retired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.seo_page_type AS ENUM (
    'regional_hub','location_hub','location_service','airport_hub','airport_transfer',
    'airport_route','city_to_city_route','service','fleet_category','tour','local_guide'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.seo_entity_type AS ENUM ('location','airport','tour','port','train_station','service','fleet_category');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.seo_section_type AS ENUM (
    'hero','intro','service_overview','local_travel_info','airport_pickup_instructions',
    'route_overview','route_facts','fleet_recommendations','popular_destinations',
    'nearby_airports','nearby_cities','relevant_services','relevant_tours','booking_cta',
    'faqs','local_landmarks','corporate_travel_info','accessibility','custom_rich_text'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.seo_redirect_code AS ENUM ('301','308');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.seo_issue_severity AS ENUM ('info','warning','error','blocker');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ locations ============
CREATE TABLE public.seo_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  location_type public.seo_location_type NOT NULL,
  parent_id UUID REFERENCES public.seo_locations(id) ON DELETE SET NULL,
  country_code TEXT NOT NULL DEFAULT 'GB',
  nation TEXT,
  region TEXT,
  county TEXT,
  admin_area_1 TEXT,
  admin_area_2 TEXT,
  google_place_id TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  postcode_area TEXT,
  operational_status public.seo_operational_status NOT NULL DEFAULT 'planned',
  service_area_status public.seo_operational_status NOT NULL DEFAULT 'planned',
  published BOOLEAN NOT NULL DEFAULT false,
  featured BOOLEAN NOT NULL DEFAULT false,
  display_priority INT NOT NULL DEFAULT 100,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.seo_locations (location_type);
CREATE INDEX ON public.seo_locations (parent_id);
CREATE INDEX ON public.seo_locations (published) WHERE published;
GRANT SELECT ON public.seo_locations TO anon, authenticated;
GRANT ALL ON public.seo_locations TO service_role;
ALTER TABLE public.seo_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo_locations public read"    ON public.seo_locations FOR SELECT USING (published = true AND operational_status IN ('active','partner'));
CREATE POLICY "seo_locations admin read"     ON public.seo_locations FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "seo_locations admin write"    ON public.seo_locations FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_seo_locations_updated BEFORE UPDATE ON public.seo_locations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ airports ============
CREATE TABLE public.seo_airports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  iata_code TEXT UNIQUE,
  icao_code TEXT UNIQUE,
  google_place_id TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  location_id UUID REFERENCES public.seo_locations(id) ON DELETE SET NULL,
  terminal_information TEXT,
  pickup_instructions TEXT,
  dropoff_guidance TEXT,
  meet_and_greet_details TEXT,
  waiting_time_policy TEXT,
  flight_tracking_available BOOLEAN NOT NULL DEFAULT false,
  operating_hours_notes TEXT,
  parking_information TEXT,
  accessibility_notes TEXT,
  hero_image_url TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  featured BOOLEAN NOT NULL DEFAULT false,
  display_priority INT NOT NULL DEFAULT 100,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.seo_airports (location_id);
CREATE INDEX ON public.seo_airports (published) WHERE published;
GRANT SELECT ON public.seo_airports TO anon, authenticated;
GRANT ALL ON public.seo_airports TO service_role;
ALTER TABLE public.seo_airports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo_airports public read"    ON public.seo_airports FOR SELECT USING (published = true);
CREATE POLICY "seo_airports admin read"     ON public.seo_airports FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "seo_airports admin write"    ON public.seo_airports FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_seo_airports_updated BEFORE UPDATE ON public.seo_airports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ services (SEO catalog) ============
CREATE TABLE public.seo_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  full_description TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  eligibility TEXT,
  fleet_categories TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  hero_image_url TEXT,
  legacy_route_path TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  display_priority INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.seo_services (published) WHERE published;
GRANT SELECT ON public.seo_services TO anon, authenticated;
GRANT ALL ON public.seo_services TO service_role;
ALTER TABLE public.seo_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo_services public read"    ON public.seo_services FOR SELECT USING (published = true);
CREATE POLICY "seo_services admin read"     ON public.seo_services FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "seo_services admin write"    ON public.seo_services FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_seo_services_updated BEFORE UPDATE ON public.seo_services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ popular_routes ============
CREATE TABLE public.seo_popular_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_entity_type public.seo_entity_type NOT NULL,
  origin_entity_id UUID NOT NULL,
  destination_entity_type public.seo_entity_type NOT NULL,
  destination_entity_id UUID NOT NULL,
  origin_place_id TEXT NOT NULL,
  destination_place_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  bidirectional BOOLEAN NOT NULL DEFAULT true,
  direct_distance_miles_cache NUMERIC,
  direct_duration_seconds_cache INT,
  starting_price_pence_cache INT,
  distance_calculated_at TIMESTAMPTZ,
  price_calculated_at TIMESTAMPTZ,
  applicable_service_ids UUID[] NOT NULL DEFAULT ARRAY[]::uuid[],
  applicable_vehicle_ids UUID[] NOT NULL DEFAULT ARRAY[]::uuid[],
  operational_status public.seo_operational_status NOT NULL DEFAULT 'planned',
  published BOOLEAN NOT NULL DEFAULT false,
  featured BOOLEAN NOT NULL DEFAULT false,
  display_priority INT NOT NULL DEFAULT 100,
  route_notes TEXT,
  seasonal_notes TEXT,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.seo_popular_routes (origin_entity_type, origin_entity_id);
CREATE INDEX ON public.seo_popular_routes (destination_entity_type, destination_entity_id);
CREATE INDEX ON public.seo_popular_routes (published) WHERE published;
GRANT SELECT ON public.seo_popular_routes TO anon, authenticated;
GRANT ALL ON public.seo_popular_routes TO service_role;
ALTER TABLE public.seo_popular_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo_popular_routes public read" ON public.seo_popular_routes FOR SELECT USING (published = true AND operational_status IN ('active','partner'));
CREATE POLICY "seo_popular_routes admin read"  ON public.seo_popular_routes FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "seo_popular_routes admin write" ON public.seo_popular_routes FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_seo_popular_routes_updated BEFORE UPDATE ON public.seo_popular_routes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ seo_pages ============
CREATE TABLE public.seo_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type public.seo_page_type NOT NULL,
  primary_entity_type public.seo_entity_type NOT NULL,
  primary_entity_id UUID NOT NULL,
  secondary_entity_type public.seo_entity_type,
  secondary_entity_id UUID,
  service_id UUID REFERENCES public.seo_services(id) ON DELETE SET NULL,
  vehicle_category TEXT,
  slug TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  seo_title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  h1 TEXT NOT NULL,
  short_intro TEXT,
  canonical_override TEXT,
  robots_status TEXT NOT NULL DEFAULT 'index,follow',
  publication_status public.seo_publication_status NOT NULL DEFAULT 'draft',
  featured_image_url TEXT,
  og_image_url TEXT,
  display_priority INT NOT NULL DEFAULT 100,
  quality_score INT,
  duplicate_score INT,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_reviewed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ,
  canonical_parent_id UUID REFERENCES public.seo_pages(id) ON DELETE SET NULL,
  booking_cta_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.seo_pages (page_type);
CREATE INDEX ON public.seo_pages (primary_entity_type, primary_entity_id);
CREATE INDEX ON public.seo_pages (publication_status);
CREATE INDEX ON public.seo_pages (published_at DESC) WHERE publication_status = 'published';
GRANT SELECT ON public.seo_pages TO anon, authenticated;
GRANT ALL ON public.seo_pages TO service_role;
ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo_pages public read"  ON public.seo_pages FOR SELECT USING (publication_status = 'published');
CREATE POLICY "seo_pages admin read"   ON public.seo_pages FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "seo_pages admin write"  ON public.seo_pages FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_seo_pages_updated BEFORE UPDATE ON public.seo_pages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ seo_page_sections ============
CREATE TABLE public.seo_page_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.seo_pages(id) ON DELETE CASCADE,
  section_type public.seo_section_type NOT NULL,
  position INT NOT NULL DEFAULT 0,
  heading TEXT,
  body TEXT,
  structured_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  visible BOOLEAN NOT NULL DEFAULT true,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.seo_page_sections (page_id, position);
GRANT SELECT ON public.seo_page_sections TO anon, authenticated;
GRANT ALL ON public.seo_page_sections TO service_role;
ALTER TABLE public.seo_page_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo_page_sections public read" ON public.seo_page_sections FOR SELECT USING (
  visible = true AND EXISTS (
    SELECT 1 FROM public.seo_pages p WHERE p.id = page_id AND p.publication_status = 'published'
  )
);
CREATE POLICY "seo_page_sections admin read"  ON public.seo_page_sections FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "seo_page_sections admin write" ON public.seo_page_sections FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_seo_page_sections_updated BEFORE UPDATE ON public.seo_page_sections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ seo_redirects ============
CREATE TABLE public.seo_redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_path TEXT NOT NULL UNIQUE,
  to_path TEXT NOT NULL,
  status_code public.seo_redirect_code NOT NULL DEFAULT '301',
  active BOOLEAN NOT NULL DEFAULT true,
  hit_count BIGINT NOT NULL DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT seo_redirects_not_self CHECK (from_path <> to_path)
);
GRANT SELECT ON public.seo_redirects TO anon, authenticated;
GRANT ALL ON public.seo_redirects TO service_role;
ALTER TABLE public.seo_redirects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo_redirects public read"  ON public.seo_redirects FOR SELECT USING (active = true);
CREATE POLICY "seo_redirects admin read"   ON public.seo_redirects FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "seo_redirects admin write"  ON public.seo_redirects FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_seo_redirects_updated BEFORE UPDATE ON public.seo_redirects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ seo_citations ============
CREATE TABLE public.seo_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  directory_name TEXT NOT NULL,
  listing_url TEXT,
  nap_name TEXT,
  nap_address TEXT,
  nap_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.seo_citations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_citations TO authenticated;
ALTER TABLE public.seo_citations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo_citations admin all" ON public.seo_citations FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_seo_citations_updated BEFORE UPDATE ON public.seo_citations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ seo_review_requests ============
CREATE TABLE public.seo_review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  customer_email TEXT,
  eligible BOOLEAN NOT NULL DEFAULT false,
  platform TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.seo_review_requests TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_review_requests TO authenticated;
ALTER TABLE public.seo_review_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo_review_requests admin all" ON public.seo_review_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_seo_review_requests_updated BEFORE UPDATE ON public.seo_review_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ seo_search_console_snapshots ============
CREATE TABLE public.seo_search_console_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  impressions INT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0,
  ctr NUMERIC,
  average_position NUMERIC,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (page_path, snapshot_date)
);
GRANT ALL ON public.seo_search_console_snapshots TO service_role;
GRANT SELECT ON public.seo_search_console_snapshots TO authenticated;
ALTER TABLE public.seo_search_console_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo_gsc admin read" ON public.seo_search_console_snapshots FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ============ seo_publication_issues ============
CREATE TABLE public.seo_publication_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES public.seo_pages(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL,
  severity public.seo_issue_severity NOT NULL DEFAULT 'warning',
  message TEXT NOT NULL,
  payload JSONB,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.seo_publication_issues (page_id, resolved);
GRANT ALL ON public.seo_publication_issues TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_publication_issues TO authenticated;
ALTER TABLE public.seo_publication_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo_publication_issues admin all" ON public.seo_publication_issues FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_seo_publication_issues_updated BEFORE UPDATE ON public.seo_publication_issues FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ publication guard on seo_pages ============
CREATE OR REPLACE FUNCTION public.seo_pages_publish_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.publication_status = 'published' THEN
    IF NEW.slug IS NULL OR btrim(NEW.slug) = '' OR NEW.path IS NULL OR btrim(NEW.path) = '' THEN
      RAISE EXCEPTION 'Published SEO pages require slug and path' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.seo_title IS NULL OR NEW.meta_description IS NULL OR NEW.h1 IS NULL THEN
      RAISE EXCEPTION 'Published SEO pages require title, meta description, and H1' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.published_at IS NULL THEN NEW.published_at := now(); END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_seo_pages_publish_guard BEFORE INSERT OR UPDATE ON public.seo_pages
  FOR EACH ROW EXECUTE FUNCTION public.seo_pages_publish_guard();
