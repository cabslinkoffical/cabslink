ALTER TABLE public.scenic_route_templates
  ADD COLUMN IF NOT EXISTS itinerary_md text,
  ADD COLUMN IF NOT EXISTS included_md text,
  ADD COLUMN IF NOT EXISTS excluded_md text,
  ADD COLUMN IF NOT EXISTS suits_md text,
  ADD COLUMN IF NOT EXISTS faq jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS duration_hours numeric,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS signature boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS theme_group text;

UPDATE public.scenic_route_templates SET theme_group = CASE
  WHEN theme IN ('Castles & History','History & Castles','Royal History','Jacobite History') THEN 'Castles & History'
  WHEN theme IN ('Outlander & Film','Castles & Outlander','Film & TV','Highlands & Film') THEN 'Outlander & Film'
  WHEN theme IN ('Highlands','Scottish Highlands','Highlands & Lochs') THEN 'Highlands & Glencoe'
  WHEN theme IN ('Lochs & Lowlands','Lochs & Landscapes','Lochs & National Park') THEN 'Lochs & National Park'
  WHEN theme IN ('Villages & History','Villages & Nature') THEN 'Villages & Heritage'
  WHEN theme IN ('Family & Kids') THEN 'Family Days'
  WHEN theme IN ('Landmarks & Heritage','Landmarks & Coast') THEN 'Coast & Landmarks'
  ELSE NULL END
WHERE theme_group IS NULL;

UPDATE public.scenic_route_templates SET duration_hours = default_duration_hours WHERE duration_hours IS NULL;

ALTER TABLE public.scenic_route_templates
  ADD CONSTRAINT scenic_route_templates_theme_group_check CHECK (theme_group IS NULL OR theme_group IN
  ('Castles & History','Outlander & Film','Highlands & Glencoe','Lochs & National Park','Villages & Heritage','Family Days','Coast & Landmarks'));

COMMENT ON COLUMN public.scenic_route_templates.theme IS 'Free-text editorial theme; filters use theme_group (max 7 values).';

CREATE TABLE public.tour_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.scenic_route_templates(id) ON DELETE CASCADE,
  reviewer_name text NOT NULL,
  review_date date NOT NULL,
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  body text NOT NULL,
  source_url text,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tour_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_reviews TO authenticated;
GRANT ALL ON public.tour_reviews TO service_role;
ALTER TABLE public.tour_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads published tour reviews" ON public.tour_reviews FOR SELECT TO anon, authenticated USING (published = true);
CREATE POLICY "Admins manage tour reviews" ON public.tour_reviews FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX tour_reviews_template_idx ON public.tour_reviews(template_id, review_date DESC);
CREATE TRIGGER tour_reviews_updated_at BEFORE UPDATE ON public.tour_reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();