ALTER TABLE public.email_campaigns ADD COLUMN audience_filter jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.email_campaigns.audience_filter IS 'Custom audience conditions (source, booked, trips, spend, tags, emails); applied when audience = custom.';

CREATE TABLE public.contact_tags (
  contact_id uuid NOT NULL REFERENCES public.marketing_contacts(id) ON DELETE CASCADE,
  tag text NOT NULL CHECK (char_length(tag) BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, tag)
);
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY contact_tags_admin ON public.contact_tags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT SELECT, INSERT, DELETE ON public.contact_tags TO authenticated;
GRANT SELECT ON public.contact_tags TO service_role;