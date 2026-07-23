-- 1. AUTHORS ------------------------------------------------------------
CREATE TABLE public.blog_authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  role text,
  bio text,
  avatar_url text,
  links jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_authors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_authors TO authenticated;
GRANT ALL ON public.blog_authors TO service_role;
ALTER TABLE public.blog_authors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Blog authors public read" ON public.blog_authors FOR SELECT USING (active = true);
CREATE POLICY "Admins manage authors" ON public.blog_authors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER blog_authors_updated BEFORE UPDATE ON public.blog_authors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. CATEGORIES ---------------------------------------------------------
CREATE TABLE public.blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  hero_image_url text,
  seo_title text,
  meta_description text,
  sort_order int NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_categories TO authenticated;
GRANT ALL ON public.blog_categories TO service_role;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Blog categories public read" ON public.blog_categories FOR SELECT USING (active = true);
CREATE POLICY "Admins manage categories" ON public.blog_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER blog_categories_updated BEFORE UPDATE ON public.blog_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. TAGS ---------------------------------------------------------------
CREATE TABLE public.blog_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_tags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_tags TO authenticated;
GRANT ALL ON public.blog_tags TO service_role;
ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Blog tags public read" ON public.blog_tags FOR SELECT USING (true);
CREATE POLICY "Admins manage tags" ON public.blog_tags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. POSTS --------------------------------------------------------------
CREATE TYPE public.blog_post_status AS ENUM ('draft','review','scheduled','published','archived');

CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  subtitle text,
  excerpt text,
  body_md text NOT NULL DEFAULT '',
  body_html_cache text,
  category_id uuid REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  author_id uuid REFERENCES public.blog_authors(id) ON DELETE SET NULL,
  featured_image_url text,
  featured_image_alt text,
  status public.blog_post_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  last_reviewed_at timestamptz,
  reading_minutes int NOT NULL DEFAULT 3,
  seo_title text,
  meta_description text,
  og_image_url text,
  canonical_override text,
  robots_status text NOT NULL DEFAULT 'index,follow',
  toc jsonb NOT NULL DEFAULT '[]'::jsonb,
  faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  key_takeaways jsonb NOT NULL DEFAULT '[]'::jsonb,
  cluster_key text,
  pillar boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  related_service_slugs text[] NOT NULL DEFAULT '{}',
  related_location_slugs text[] NOT NULL DEFAULT '{}',
  related_route_slugs text[] NOT NULL DEFAULT '{}',
  related_post_ids uuid[] NOT NULL DEFAULT '{}',
  views_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Blog posts public read published" ON public.blog_posts FOR SELECT
  USING (status = 'published' AND published_at IS NOT NULL AND published_at <= now());
CREATE POLICY "Admins manage posts" ON public.blog_posts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX blog_posts_status_published_idx ON public.blog_posts (status, published_at DESC);
CREATE INDEX blog_posts_category_idx ON public.blog_posts (category_id);
CREATE INDEX blog_posts_cluster_idx ON public.blog_posts (cluster_key);
CREATE INDEX blog_posts_search_idx ON public.blog_posts
  USING gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(excerpt,'') || ' ' || coalesce(body_md,'')));

CREATE TRIGGER blog_posts_updated BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.blog_posts_publish_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'published' THEN
    IF NEW.title IS NULL OR btrim(NEW.title) = '' THEN
      RAISE EXCEPTION 'Published posts require a title' USING ERRCODE = 'check_violation'; END IF;
    IF NEW.slug IS NULL OR btrim(NEW.slug) = '' THEN
      RAISE EXCEPTION 'Published posts require a slug' USING ERRCODE = 'check_violation'; END IF;
    IF NEW.category_id IS NULL THEN
      RAISE EXCEPTION 'Published posts require a category' USING ERRCODE = 'check_violation'; END IF;
    IF NEW.featured_image_url IS NULL OR btrim(NEW.featured_image_url) = '' THEN
      RAISE EXCEPTION 'Published posts require a featured image' USING ERRCODE = 'check_violation'; END IF;
    IF NEW.seo_title IS NULL OR btrim(NEW.seo_title) = '' THEN
      RAISE EXCEPTION 'Published posts require an SEO title' USING ERRCODE = 'check_violation'; END IF;
    IF NEW.meta_description IS NULL OR btrim(NEW.meta_description) = '' THEN
      RAISE EXCEPTION 'Published posts require a meta description' USING ERRCODE = 'check_violation'; END IF;
    IF length(coalesce(NEW.body_md,'')) < 600 THEN
      RAISE EXCEPTION 'Published posts require at least 600 characters of body content' USING ERRCODE = 'check_violation'; END IF;
    IF NEW.published_at IS NULL THEN NEW.published_at := now(); END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER blog_posts_publish_guard_trg BEFORE INSERT OR UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.blog_posts_publish_guard();

-- 5. POST/TAG JOIN ------------------------------------------------------
CREATE TABLE public.blog_post_tags (
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);
GRANT SELECT ON public.blog_post_tags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_post_tags TO authenticated;
GRANT ALL ON public.blog_post_tags TO service_role;
ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Blog post tags public read"
  ON public.blog_post_tags FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.blog_posts p
    WHERE p.id = post_id AND p.status = 'published'
      AND p.published_at IS NOT NULL AND p.published_at <= now()));
CREATE POLICY "Admins manage post tags" ON public.blog_post_tags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX blog_post_tags_tag_idx ON public.blog_post_tags (tag_id);

-- 6. SEED CATEGORIES, TAGS, AND DEFAULT AUTHOR --------------------------
INSERT INTO public.blog_authors (slug, name, role, bio) VALUES
  ('cabslink-team', 'CabsLink Team', 'Editorial', 'Editorial team at CabsLink writing about private travel, airport transfers and Scottish day tours.')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.blog_categories (slug, name, description, sort_order) VALUES
  ('airport-guides', 'Airport Guides', 'Terminal-by-terminal guides to UK airports and how to arrive on time.', 10),
  ('travel-guides', 'Travel Guides', 'City, town and area guides for pre-booked private travel across the UK.', 20),
  ('airport-transfer-tips', 'Airport Transfer Tips', 'Practical advice for stress-free airport pickups and drop-offs.', 30),
  ('chauffeur-executive-travel', 'Executive & Private Travel', 'Corporate and premium private travel across the UK.', 40),
  ('cruise-transfers', 'Cruise Transfers', 'Cruise terminal transfers and multi-day port itineraries.', 50),
  ('university-travel', 'University Travel', 'Move-in, term and freshers travel for UK universities.', 60),
  ('business-travel', 'Business Travel', 'Reliable travel for teams, offices and corporate events.', 70),
  ('family-travel', 'Family Travel', 'Comfortable, child-seat-equipped private travel for families.', 80),
  ('scotland-travel', 'Scotland Travel', 'The best of Scotland by private car — routes, day trips, itineraries.', 90),
  ('attractions', 'Attractions', 'Guides to castles, museums, and landmarks with pre-booked travel.', 100),
  ('golf-trips', 'Golf Trips', 'St Andrews, Muirfield, Gleneagles and beyond by private car.', 110),
  ('whisky-distillery-tours', 'Whisky & Distillery Tours', 'Distillery day tours from Edinburgh, Glasgow and the Highlands.', 120),
  ('local-area-guides', 'Local Area Guides', 'Neighbourhood-level travel guides across the UK.', 130),
  ('events', 'Events', 'Weddings, festivals, concerts and match-day travel.', 140),
  ('news', 'News', 'CabsLink service updates and industry news.', 150)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.blog_tags (slug, name) VALUES
  ('edinburgh-airport','Edinburgh Airport'),
  ('glasgow-airport','Glasgow Airport'),
  ('aberdeen-airport','Aberdeen Airport'),
  ('inverness-airport','Inverness Airport'),
  ('st-andrews','St Andrews'),
  ('livingston','Livingston'),
  ('taxi','Taxi'),
  ('airport-transfer','Airport Transfer'),
  ('cab','Cab'),
  ('private-hire','Private Hire'),
  ('chauffeur','Executive'),
  ('corporate','Corporate'),
  ('executive','Executive Travel'),
  ('cruise','Cruise'),
  ('family','Family'),
  ('students','Students'),
  ('business','Business'),
  ('hotels','Hotels'),
  ('golf','Golf'),
  ('whisky','Whisky'),
  ('travel-tips','Travel Tips'),
  ('meet-greet','Meet & Greet'),
  ('flight-monitoring','Flight Monitoring')
ON CONFLICT (slug) DO NOTHING;

-- 7. VIEW COUNT INCREMENT (SECURITY DEFINER, rate-limit is enforced in server fn) ----
CREATE OR REPLACE FUNCTION public.increment_blog_post_view(_post_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.blog_posts SET views_count = views_count + 1 WHERE id = _post_id AND status = 'published';
$$;
GRANT EXECUTE ON FUNCTION public.increment_blog_post_view(uuid) TO anon, authenticated;
