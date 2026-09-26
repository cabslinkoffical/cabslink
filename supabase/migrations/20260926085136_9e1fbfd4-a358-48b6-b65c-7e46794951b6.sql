CREATE TABLE public.site_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL CHECK (kind IN ('pageview','event')),
  name text NOT NULL,
  path text NOT NULL,
  visitor_id text,
  session_id text,
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device text,
  browser text,
  os text,
  country text,
  props jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX site_events_created_idx ON public.site_events (created_at DESC);
GRANT SELECT ON public.site_events TO authenticated;
GRANT ALL ON public.site_events TO service_role;
ALTER TABLE public.site_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read site events" ON public.site_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));