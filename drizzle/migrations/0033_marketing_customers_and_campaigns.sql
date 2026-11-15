CREATE TABLE public.marketing_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  phone text,
  opted_in boolean NOT NULL DEFAULT false,
  opted_in_at timestamptz,
  opt_in_source text,
  unsubscribed_at timestamptz,
  unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_contacts TO authenticated;
GRANT ALL ON public.marketing_contacts TO service_role;
ALTER TABLE public.marketing_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage marketing contacts" ON public.marketing_contacts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER marketing_contacts_updated BEFORE UPDATE ON public.marketing_contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  audience text NOT NULL DEFAULT 'all',
  frequency text NOT NULL DEFAULT 'once',
  send_hour smallint NOT NULL DEFAULT 10,
  weekday smallint,
  month_day smallint,
  starts_on date,
  status text NOT NULL DEFAULT 'draft',
  next_run_at timestamptz,
  last_run_at timestamptz,
  last_run_sent integer NOT NULL DEFAULT 0,
  total_sent integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_campaigns_audience_chk CHECK (audience IN ('all','booked','not_booked')),
  CONSTRAINT email_campaigns_frequency_chk CHECK (frequency IN ('once','daily','weekly','fortnightly','monthly')),
  CONSTRAINT email_campaigns_status_chk CHECK (status IN ('draft','active','paused','completed')),
  CONSTRAINT email_campaigns_hour_chk CHECK (send_hour BETWEEN 0 AND 23),
  CONSTRAINT email_campaigns_weekday_chk CHECK (weekday IS NULL OR weekday BETWEEN 0 AND 6),
  CONSTRAINT email_campaigns_monthday_chk CHECK (month_day IS NULL OR month_day BETWEEN 1 AND 28)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaigns TO authenticated;
GRANT ALL ON public.email_campaigns TO service_role;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage campaigns" ON public.email_campaigns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER email_campaigns_updated BEFORE UPDATE ON public.email_campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.email_campaign_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  run_key text NOT NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  provider_message_id text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, run_key, email)
);
GRANT SELECT ON public.email_campaign_sends TO authenticated;
GRANT ALL ON public.email_campaign_sends TO service_role;
ALTER TABLE public.email_campaign_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read campaign sends" ON public.email_campaign_sends FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX email_campaign_sends_campaign_idx ON public.email_campaign_sends (campaign_id, created_at DESC);

INSERT INTO public.private_settings (key, value)
SELECT 'campaigns_run_token', encode(extensions.gen_random_bytes(32), 'hex')
WHERE NOT EXISTS (SELECT 1 FROM public.private_settings WHERE key = 'campaigns_run_token');

CREATE OR REPLACE FUNCTION public.campaigns_wake_run()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_token text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.email_campaigns WHERE status = 'active' AND next_run_at <= now()) THEN RETURN; END IF;
  SELECT value INTO v_token FROM public.private_settings WHERE key = 'campaigns_run_token';
  IF v_token IS NULL OR length(v_token) < 32 THEN RETURN; END IF;
  PERFORM net.http_post(
    url := 'https://project--e2d845db-9efd-4dac-bae6-365b62867b96.lovable.app/api/public/campaigns/run',
    headers := jsonb_build_object('content-type', 'application/json', 'x-campaigns-token', v_token),
    body := '{}'::jsonb
  );
EXCEPTION WHEN OTHERS THEN NULL;
END;
$function$;
REVOKE ALL ON FUNCTION public.campaigns_wake_run() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('email-campaigns-runner', '2 * * * *', 'SELECT public.campaigns_wake_run()');