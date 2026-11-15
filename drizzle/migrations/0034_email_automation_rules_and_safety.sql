ALTER TABLE public.marketing_contacts ADD COLUMN IF NOT EXISTS suppressed_reason text, ADD COLUMN IF NOT EXISTS last_marketing_at timestamptz;

CREATE TABLE public.marketing_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  paused boolean NOT NULL DEFAULT false,
  daily_cap integer NOT NULL DEFAULT 500 CHECK (daily_cap BETWEEN 1 AND 10000),
  quiet_days integer NOT NULL DEFAULT 7 CHECK (quiet_days BETWEEN 0 AND 90),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.marketing_settings TO authenticated;
GRANT ALL ON public.marketing_settings TO service_role;
ALTER TABLE public.marketing_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage marketing settings" ON public.marketing_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.marketing_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_type text NOT NULL CHECK (trigger_type IN ('after_trip','lapsed','enquiry_no_booking')),
  delay_days integer NOT NULL DEFAULT 7 CHECK (delay_days BETWEEN 1 AND 730),
  subject text NOT NULL,
  body text NOT NULL,
  coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT false,
  total_sent integer NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_rules TO authenticated;
GRANT ALL ON public.automation_rules TO service_role;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage automation rules" ON public.automation_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER automation_rules_updated BEFORE UPDATE ON public.automation_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.automation_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  email text NOT NULL,
  trigger_key text NOT NULL,
  status text NOT NULL DEFAULT 'sending',
  provider_message_id text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rule_id, email, trigger_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_sends TO authenticated;
GRANT ALL ON public.automation_sends TO service_role;
ALTER TABLE public.automation_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read automation sends" ON public.automation_sends FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.campaigns_wake_run()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_token text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.marketing_settings WHERE paused) THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.email_campaigns WHERE status = 'active' AND next_run_at <= now())
     AND NOT EXISTS (SELECT 1 FROM public.automation_rules WHERE active) THEN RETURN; END IF;
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