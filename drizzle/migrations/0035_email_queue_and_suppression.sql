ALTER TABLE public.marketing_contacts
  ADD COLUMN IF NOT EXISTS source text CHECK (source IS NULL OR source IN ('booking','enquiry','import','manual')),
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

CREATE TABLE public.suppression_list (
  email text PRIMARY KEY CHECK (email = lower(btrim(email))),
  reason text NOT NULL CHECK (reason IN ('unsubscribed','bounced','complained','manual')),
  note text,
  added_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppression_list TO authenticated;
GRANT ALL ON public.suppression_list TO service_role;
ALTER TABLE public.suppression_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage suppression list" ON public.suppression_list FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.suppression_list (email, reason, added_at)
SELECT lower(btrim(email)),
       CASE WHEN suppressed_reason IN ('bounced','complained','manual') THEN suppressed_reason ELSE 'unsubscribed' END,
       coalesce(unsubscribed_at, now())
FROM public.marketing_contacts
WHERE unsubscribed_at IS NOT NULL OR suppressed_reason IS NOT NULL
ON CONFLICT (email) DO NOTHING;

ALTER TABLE public.email_campaigns DROP CONSTRAINT IF EXISTS email_campaigns_status_chk;
ALTER TABLE public.email_campaigns ADD CONSTRAINT email_campaigns_status_chk CHECK (status IN ('draft','active','paused','completed','sending','failed'));
ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Europe/London',
  ADD COLUMN IF NOT EXISTS created_by_kind text NOT NULL DEFAULT 'staff' CHECK (created_by_kind IN ('staff','ai')),
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS audience_id uuid;
COMMENT ON COLUMN public.email_campaigns.next_run_at IS 'send_at: next UK-time send moment (Europe/London)';
COMMENT ON COLUMN public.email_campaigns.status IS 'active = scheduled, completed = sent';

ALTER TABLE public.automation_rules
  ADD COLUMN IF NOT EXISTS audience_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS quiet_days integer NOT NULL DEFAULT 7 CHECK (quiet_days BETWEEN 0 AND 90);

CREATE TABLE public.email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.marketing_contacts(id) ON DELETE CASCADE,
  email text NOT NULL,
  campaign_id uuid REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  run_key text NOT NULL,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed','skipped')),
  skip_reason text,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  last_error text,
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_queue_one_source CHECK ((campaign_id IS NULL) <> (rule_id IS NULL)),
  CONSTRAINT email_queue_campaign_once UNIQUE (campaign_id, run_key, contact_id),
  CONSTRAINT email_queue_rule_once UNIQUE (rule_id, run_key, contact_id)
);
CREATE INDEX email_queue_due_idx ON public.email_queue (status, next_attempt_at);
CREATE INDEX email_queue_email_idx ON public.email_queue (email);
CREATE INDEX email_queue_provider_idx ON public.email_queue (provider_message_id);
GRANT SELECT ON public.email_queue TO authenticated;
GRANT ALL ON public.email_queue TO service_role;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read email queue" ON public.email_queue FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER email_queue_updated BEFORE UPDATE ON public.email_queue FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id uuid REFERENCES public.email_queue(id) ON DELETE SET NULL,
  email text,
  type text NOT NULL CHECK (type IN ('delivered','opened','clicked','bounced','complained','unsubscribed')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  provider_event_id text UNIQUE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX email_events_queue_idx ON public.email_events (queue_id);
GRANT SELECT ON public.email_events TO authenticated;
GRANT ALL ON public.email_events TO service_role;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read email events" ON public.email_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Claim due queue rows for one send batch. Rows stuck in "sending" are never resent
-- (the provider may already have delivered them); they are marked failed instead.
CREATE OR REPLACE FUNCTION public.claim_email_queue(_limit integer)
RETURNS SETOF public.email_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.email_queue SET status = 'failed', last_error = 'Send outcome unknown (timed out); not retried to avoid a duplicate', locked_at = NULL
  WHERE status = 'sending' AND locked_at < now() - interval '30 minutes';
  RETURN QUERY
  UPDATE public.email_queue q SET status = 'sending', locked_at = now(), attempts = q.attempts + 1
  WHERE q.id IN (
    SELECT id FROM public.email_queue
    WHERE status = 'pending' AND next_attempt_at <= now() AND scheduled_for <= now()
    ORDER BY scheduled_for, created_at
    LIMIT greatest(0, least(_limit, 100))
    FOR UPDATE SKIP LOCKED
  )
  RETURNING q.*;
END;
$function$;
REVOKE ALL ON FUNCTION public.claim_email_queue(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_email_queue(integer) TO service_role;

CREATE OR REPLACE VIEW public.contacts WITH (security_invoker = true) AS
WITH drv AS (
  SELECT lower(btrim(email)) AS e FROM public.drivers WHERE email IS NOT NULL
  UNION
  SELECT lower(btrim(email)) FROM public.contact_messages
  WHERE email IS NOT NULL AND (source = 'driver' OR subject ~* '(driver|partner application)')
),
b AS (
  SELECT lower(btrim(email)) AS e, max(customer_name) AS name, count(*)::int AS n,
         max(pickup_date) AS last_b, min(created_at) AS first_at
  FROM public.bookings WHERE deleted_at IS NULL AND email IS NOT NULL AND btrim(email) <> ''
  GROUP BY 1
),
q AS (
  SELECT lower(btrim(email)) AS e, max(name) AS name, max(created_at) AS last_q
  FROM (
    SELECT email, name, created_at FROM public.contact_messages
    UNION ALL SELECT email, customer_name, created_at FROM public.custom_tour_requests
  ) x WHERE email IS NOT NULL AND btrim(email) <> ''
  GROUP BY 1
),
em AS (SELECT e FROM b UNION SELECT e FROM q UNION SELECT lower(btrim(email)) FROM public.marketing_contacts)
SELECT
  coalesce(mc.id, md5(em.e)::uuid) AS id,
  coalesce(mc.name, b.name, q.name) AS name,
  em.e AS email,
  coalesce(mc.source, CASE WHEN b.e IS NOT NULL THEN 'booking' WHEN q.e IS NOT NULL THEN 'enquiry' ELSE 'manual' END) AS source,
  (s.email IS NULL AND mc.unsubscribed_at IS NULL AND mc.suppressed_reason IS NULL
     AND (coalesce(mc.opted_in, false) OR b.e IS NOT NULL)) AS marketing_consent,
  CASE WHEN mc.opted_in THEN mc.opted_in_at WHEN b.e IS NOT NULL THEN b.first_at END AS consent_date,
  CASE WHEN mc.opted_in THEN mc.opt_in_source WHEN b.e IS NOT NULL THEN 'past_booking' END AS consent_source,
  coalesce(mc.unsubscribed_at, CASE WHEN s.reason = 'unsubscribed' THEN s.added_at END) AS unsubscribed_at,
  s.reason AS suppression_reason,
  b.last_b AS last_booking_date,
  q.last_q AS last_enquiry_date,
  coalesce(b.n, 0) AS total_bookings,
  coalesce(mc.tags, '{}'::text[]) AS tags
FROM em
LEFT JOIN public.marketing_contacts mc ON mc.email = em.e
LEFT JOIN b ON b.e = em.e
LEFT JOIN q ON q.e = em.e
LEFT JOIN public.suppression_list s ON s.email = em.e
WHERE em.e LIKE '%@%'
  AND NOT EXISTS (SELECT 1 FROM drv WHERE drv.e = em.e)
  AND ((SELECT auth.role()) = 'service_role' OR public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.contacts TO authenticated;
GRANT SELECT ON public.contacts TO service_role;

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
     AND NOT EXISTS (SELECT 1 FROM public.automation_rules WHERE active)
     AND NOT EXISTS (SELECT 1 FROM public.email_queue WHERE status = 'pending' AND next_attempt_at <= now()) THEN RETURN; END IF;
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