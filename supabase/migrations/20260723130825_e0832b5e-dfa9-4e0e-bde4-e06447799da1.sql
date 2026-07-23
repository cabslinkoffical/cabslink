
-- 1. Extend destination_type enum with all future categories.
ALTER TYPE public.destination_type ADD VALUE IF NOT EXISTS 'country';
ALTER TYPE public.destination_type ADD VALUE IF NOT EXISTS 'city';
ALTER TYPE public.destination_type ADD VALUE IF NOT EXISTS 'town';
ALTER TYPE public.destination_type ADD VALUE IF NOT EXISTS 'village';
ALTER TYPE public.destination_type ADD VALUE IF NOT EXISTS 'college';
ALTER TYPE public.destination_type ADD VALUE IF NOT EXISTS 'castle';
ALTER TYPE public.destination_type ADD VALUE IF NOT EXISTS 'museum';
ALTER TYPE public.destination_type ADD VALUE IF NOT EXISTS 'golf_course';
ALTER TYPE public.destination_type ADD VALUE IF NOT EXISTS 'hotel';
ALTER TYPE public.destination_type ADD VALUE IF NOT EXISTS 'brewery';
ALTER TYPE public.destination_type ADD VALUE IF NOT EXISTS 'wedding_venue';
ALTER TYPE public.destination_type ADD VALUE IF NOT EXISTS 'event_venue';
ALTER TYPE public.destination_type ADD VALUE IF NOT EXISTS 'car_rental';
ALTER TYPE public.destination_type ADD VALUE IF NOT EXISTS 'campervan_rental';
ALTER TYPE public.destination_type ADD VALUE IF NOT EXISTS 'ferry_terminal';
ALTER TYPE public.destination_type ADD VALUE IF NOT EXISTS 'bus_station';
ALTER TYPE public.destination_type ADD VALUE IF NOT EXISTS 'tour_category';
ALTER TYPE public.destination_type ADD VALUE IF NOT EXISTS 'blog';

-- 2. Global taxonomy: keywords ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.taxonomy_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  normalized text GENERATED ALWAYS AS (lower(btrim(keyword))) STORED,
  category text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT taxonomy_keywords_normalized_unique UNIQUE (normalized)
);
CREATE INDEX IF NOT EXISTS taxonomy_keywords_category_idx ON public.taxonomy_keywords(category);
CREATE INDEX IF NOT EXISTS taxonomy_keywords_trgm ON public.taxonomy_keywords USING gin (normalized extensions.gin_trgm_ops);
GRANT SELECT ON public.taxonomy_keywords TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.taxonomy_keywords TO authenticated;
GRANT ALL ON public.taxonomy_keywords TO service_role;
ALTER TABLE public.taxonomy_keywords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads keywords" ON public.taxonomy_keywords FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage keywords" ON public.taxonomy_keywords FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER taxonomy_keywords_updated_at BEFORE UPDATE ON public.taxonomy_keywords
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Global taxonomy: tags -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.taxonomy_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag text NOT NULL,
  normalized text GENERATED ALWAYS AS (lower(btrim(tag))) STORED,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT taxonomy_tags_normalized_unique UNIQUE (normalized)
);
CREATE INDEX IF NOT EXISTS taxonomy_tags_trgm ON public.taxonomy_tags USING gin (normalized extensions.gin_trgm_ops);
GRANT SELECT ON public.taxonomy_tags TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.taxonomy_tags TO authenticated;
GRANT ALL ON public.taxonomy_tags TO service_role;
ALTER TABLE public.taxonomy_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads tags" ON public.taxonomy_tags FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage tags" ON public.taxonomy_tags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER taxonomy_tags_updated_at BEFORE UPDATE ON public.taxonomy_tags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Global taxonomy: search intents ---------------------------------------
CREATE TABLE IF NOT EXISTS public.taxonomy_search_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent text NOT NULL,
  normalized text GENERATED ALWAYS AS (lower(btrim(intent))) STORED,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT taxonomy_search_intents_normalized_unique UNIQUE (normalized)
);
GRANT SELECT ON public.taxonomy_search_intents TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.taxonomy_search_intents TO authenticated;
GRANT ALL ON public.taxonomy_search_intents TO service_role;
ALTER TABLE public.taxonomy_search_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads intents" ON public.taxonomy_search_intents FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage intents" ON public.taxonomy_search_intents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER taxonomy_search_intents_updated_at BEFORE UPDATE ON public.taxonomy_search_intents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Junction: destination <-> keywords ------------------------------------
CREATE TABLE IF NOT EXISTS public.destination_keywords (
  destination_id uuid NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  keyword_id uuid NOT NULL REFERENCES public.taxonomy_keywords(id) ON DELETE CASCADE,
  weight smallint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (destination_id, keyword_id)
);
CREATE INDEX IF NOT EXISTS destination_keywords_keyword_idx ON public.destination_keywords(keyword_id);
GRANT SELECT ON public.destination_keywords TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.destination_keywords TO authenticated;
GRANT ALL ON public.destination_keywords TO service_role;
ALTER TABLE public.destination_keywords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads destination_keywords" ON public.destination_keywords FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage destination_keywords" ON public.destination_keywords FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Junction: destination <-> tags ----------------------------------------
CREATE TABLE IF NOT EXISTS public.destination_tags (
  destination_id uuid NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.taxonomy_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (destination_id, tag_id)
);
CREATE INDEX IF NOT EXISTS destination_tags_tag_idx ON public.destination_tags(tag_id);
GRANT SELECT ON public.destination_tags TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.destination_tags TO authenticated;
GRANT ALL ON public.destination_tags TO service_role;
ALTER TABLE public.destination_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads destination_tags" ON public.destination_tags FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage destination_tags" ON public.destination_tags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. Junction: destination <-> search intents ------------------------------
CREATE TABLE IF NOT EXISTS public.destination_search_intents (
  destination_id uuid NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  intent_id uuid NOT NULL REFERENCES public.taxonomy_search_intents(id) ON DELETE CASCADE,
  priority smallint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (destination_id, intent_id)
);
CREATE INDEX IF NOT EXISTS destination_search_intents_intent_idx ON public.destination_search_intents(intent_id);
GRANT SELECT ON public.destination_search_intents TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.destination_search_intents TO authenticated;
GRANT ALL ON public.destination_search_intents TO service_role;
ALTER TABLE public.destination_search_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads destination_search_intents" ON public.destination_search_intents FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage destination_search_intents" ON public.destination_search_intents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. Typed relationships ---------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.destination_relationship_type AS ENUM (
    'nearby','serves','belongs_to','popular_route',
    'nearest_airport','nearest_station','nearest_hospital','nearest_university',
    'related_service','related_attraction','related_hotel','related_business_park'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.destination_relationships (
  from_id uuid NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  to_id uuid NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  rel_type public.destination_relationship_type NOT NULL,
  distance_miles numeric(8,2),
  rank smallint NOT NULL DEFAULT 100,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (from_id, to_id, rel_type),
  CHECK (from_id <> to_id)
);
CREATE INDEX IF NOT EXISTS destination_relationships_reverse_idx ON public.destination_relationships(to_id, rel_type);
CREATE INDEX IF NOT EXISTS destination_relationships_from_type_rank_idx ON public.destination_relationships(from_id, rel_type, rank);
GRANT SELECT ON public.destination_relationships TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.destination_relationships TO authenticated;
GRANT ALL ON public.destination_relationships TO service_role;
ALTER TABLE public.destination_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads destination_relationships" ON public.destination_relationships FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage destination_relationships" ON public.destination_relationships FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER destination_relationships_updated_at BEFORE UPDATE ON public.destination_relationships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 9. Per-destination SEO drafts (unpublished until Tier 1 promotion) -------
CREATE TABLE IF NOT EXISTS public.destination_seo (
  destination_id uuid PRIMARY KEY REFERENCES public.destinations(id) ON DELETE CASCADE,
  seo_title text,
  meta_description text,
  canonical_url text,
  h1 text,
  og_title text,
  og_description text,
  og_image text,
  twitter_title text,
  twitter_description text,
  twitter_image text,
  breadcrumb jsonb NOT NULL DEFAULT '[]'::jsonb,
  schema_jsonld jsonb NOT NULL DEFAULT '{}'::jsonb,
  faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  internal_link_target_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.destination_seo TO authenticated;
GRANT ALL ON public.destination_seo TO service_role;
ALTER TABLE public.destination_seo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage destination_seo" ON public.destination_seo FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER destination_seo_updated_at BEFORE UPDATE ON public.destination_seo
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 10. Booking-search helper: exposes minimal fields for every active
--     destination regardless of SEO tier, so drafts stay unindexed but
--     remain instantly bookable in the widget/autocomplete.
CREATE OR REPLACE FUNCTION public.search_bookable_destinations(_q text, _limit int DEFAULT 20)
RETURNS TABLE(
  id uuid, type public.destination_type, slug text, name text,
  town text, region text, council text,
  lat numeric, lng numeric, place_id text, seo_tier smallint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.id, d.type, d.slug, d.name, d.town, d.region, d.council,
         d.lat, d.lng, d.place_id, d.seo_tier
  FROM public.destinations d
  WHERE d.active = true
    AND (
      _q IS NULL OR btrim(_q) = ''
      OR d.name ILIKE '%'||_q||'%'
      OR COALESCE(d.town,'')   ILIKE '%'||_q||'%'
      OR COALESCE(d.region,'') ILIKE '%'||_q||'%'
      OR COALESCE(d.council,'')ILIKE '%'||_q||'%'
      OR EXISTS (SELECT 1 FROM unnest(d.synonyms) s WHERE s ILIKE '%'||_q||'%')
      OR EXISTS (SELECT 1 FROM unnest(d.keywords) k WHERE k ILIKE '%'||_q||'%')
    )
  ORDER BY d.seo_tier ASC, d.name ASC
  LIMIT LEAST(GREATEST(_limit, 1), 50)
$$;
REVOKE ALL ON FUNCTION public.search_bookable_destinations(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_bookable_destinations(text, int) TO anon, authenticated, service_role;
