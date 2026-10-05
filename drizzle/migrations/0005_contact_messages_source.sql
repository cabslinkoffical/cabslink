ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'contact';
ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS source_page text;
UPDATE public.contact_messages SET source = CASE
  WHEN subject ILIKE 'Corporate Account Enquiry%' THEN 'corporate'
  WHEN subject ILIKE 'Driver / Partner Application%' THEN 'driver'
  WHEN subject ILIKE 'Tour booking:%' OR tour_status IS NOT NULL THEN 'tour'
  WHEN subject ILIKE 'Cancellation request:%' THEN 'cancellation'
  ELSE 'contact' END;
ALTER TABLE public.contact_messages ADD CONSTRAINT contact_messages_source_check
  CHECK (source IN ('contact','corporate','driver','tour','cancellation','other'));
CREATE INDEX IF NOT EXISTS contact_messages_source_idx ON public.contact_messages (source, created_at DESC);
COMMENT ON COLUMN public.contact_messages.source IS 'Which website form created the message. Set by the server, never by the browser.';
COMMENT ON COLUMN public.contact_messages.source_page IS 'Page path the form was submitted from (from the request Referer).';