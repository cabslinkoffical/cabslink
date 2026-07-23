
CREATE TYPE public.destination_type AS ENUM (
  'location','route','airport','station','cruise_port','university','hospital',
  'corporate','attraction','distillery','business_park','service','guide','region','council'
);

CREATE TABLE public.destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.destination_type NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  display_name text,
  short_name text,
  country text NOT NULL DEFAULT 'GB',
  region text,
  council text,
  town text,
  parent_id uuid REFERENCES public.destinations(id) ON DELETE SET NULL,
  lat numeric(9,6),
  lng numeric(9,6),
  place_id text,
  keywords text[] NOT NULL DEFAULT '{}',
  synonyms text[] NOT NULL DEFAULT '{}',
  nearby_ids uuid[] NOT NULL DEFAULT '{}',
  popular_route_ids uuid[] NOT NULL DEFAULT '{}',
  related_service_ids uuid[] NOT NULL DEFAULT '{}',
  seo_tier smallint NOT NULL DEFAULT 4 CHECK (seo_tier BETWEEN 1 AND 4),
  noindex boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  linked_page_id uuid REFERENCES public.seo_pages(id) ON DELETE SET NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  search_vector tsvector,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT destinations_slug_type_unique UNIQUE (type, slug),
  CONSTRAINT destinations_tier1_requires_page CHECK (
    seo_tier <> 1 OR linked_page_id IS NOT NULL
  )
);

CREATE INDEX destinations_search_gin ON public.destinations USING gin(search_vector);
CREATE INDEX destinations_keywords_gin ON public.destinations USING gin(keywords);
CREATE INDEX destinations_synonyms_gin ON public.destinations USING gin(synonyms);
CREATE INDEX destinations_type_tier_active ON public.destinations (type, seo_tier, active);
CREATE INDEX destinations_slug ON public.destinations (slug);
CREATE INDEX destinations_name_trgm ON public.destinations USING gin (name extensions.gin_trgm_ops);
CREATE UNIQUE INDEX destinations_place_id_unique ON public.destinations (place_id) WHERE place_id IS NOT NULL;

GRANT SELECT ON public.destinations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.destinations TO authenticated;
GRANT ALL ON public.destinations TO service_role;

ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads active non-draft destinations"
  ON public.destinations FOR SELECT
  TO anon, authenticated
  USING (active = true AND seo_tier <> 4);

CREATE POLICY "Admins manage destinations"
  ON public.destinations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER destinations_set_updated_at
  BEFORE UPDATE ON public.destinations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Maintain search_vector via trigger (avoids immutability issue on GENERATED)
CREATE OR REPLACE FUNCTION public.destinations_refresh_search_vector()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name,'')), 'A') ||
    setweight(to_tsvector('english', array_to_string(coalesce(NEW.synonyms,'{}'), ' ')), 'B') ||
    setweight(to_tsvector('english', array_to_string(coalesce(NEW.keywords,'{}'), ' ')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.region,'') || ' ' || coalesce(NEW.council,'') || ' ' || coalesce(NEW.town,'')), 'D');
  RETURN NEW;
END; $$;

CREATE TRIGGER destinations_search_vector_trg
  BEFORE INSERT OR UPDATE OF name, synonyms, keywords, region, council, town ON public.destinations
  FOR EACH ROW EXECUTE FUNCTION public.destinations_refresh_search_vector();

CREATE OR REPLACE FUNCTION public.destinations_publish_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.seo_tier = 1 THEN
    IF NEW.linked_page_id IS NULL THEN
      RAISE EXCEPTION 'Tier 1 destinations require a linked_page_id' USING ERRCODE = 'check_violation';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.seo_pages p
      WHERE p.id = NEW.linked_page_id AND p.publication_status = 'published'
    ) THEN
      RAISE EXCEPTION 'Tier 1 destinations require the linked SEO page to be published' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.slug IS NULL OR btrim(NEW.slug) = '' THEN
      RAISE EXCEPTION 'Tier 1 destinations require a slug' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER destinations_publish_guard_trg
  BEFORE INSERT OR UPDATE ON public.destinations
  FOR EACH ROW EXECUTE FUNCTION public.destinations_publish_guard();

CREATE TRIGGER destinations_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON public.destinations
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();

COMMENT ON TABLE public.destinations IS
  'Canonical source of truth for every searchable place. Tier 1=Indexed page, 2=Hub-only, 3=Search/booking-only, 4=Draft/Future.';
