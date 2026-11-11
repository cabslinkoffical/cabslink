CREATE TABLE public.indexnow_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL DEFAULT 'full',
  url_count integer NOT NULL DEFAULT 0,
  http_status integer,
  submitted_by uuid
);
GRANT SELECT, INSERT ON public.indexnow_submissions TO authenticated;
GRANT ALL ON public.indexnow_submissions TO service_role;
ALTER TABLE public.indexnow_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read indexnow log" ON public.indexnow_submissions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write indexnow log" ON public.indexnow_submissions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX indexnow_submissions_kind_created ON public.indexnow_submissions (kind, created_at DESC);