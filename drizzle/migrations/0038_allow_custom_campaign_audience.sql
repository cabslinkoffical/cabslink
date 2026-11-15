ALTER TABLE public.email_campaigns DROP CONSTRAINT email_campaigns_audience_chk;
ALTER TABLE public.email_campaigns ADD CONSTRAINT email_campaigns_audience_chk
  CHECK (audience IN ('all', 'booked', 'not_booked', 'custom'));