ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'dispatch';

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS dispatch_notes text;

CREATE TABLE public.dispatch_endpoints (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  url text NOT NULL,
  secret_name text NOT NULL DEFAULT 'DISPATCH_WEBHOOK_SECRET',
  active boolean NOT NULL DEFAULT true,
  last_delivery_at timestamptz,
  last_delivery_ok boolean,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatch_endpoints TO authenticated;
GRANT ALL ON public.dispatch_endpoints TO service_role;
ALTER TABLE public.dispatch_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage dispatch endpoints" ON public.dispatch_endpoints
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER dispatch_endpoints_set_updated_at
  BEFORE UPDATE ON public.dispatch_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.dispatch_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint_id uuid REFERENCES public.dispatch_endpoints(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  booking_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  delivered_at timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX dispatch_events_status_idx ON public.dispatch_events (status, next_attempt_at);
CREATE INDEX dispatch_events_created_idx ON public.dispatch_events (created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatch_events TO authenticated;
GRANT ALL ON public.dispatch_events TO service_role;
ALTER TABLE public.dispatch_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage dispatch events" ON public.dispatch_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER dispatch_events_set_updated_at
  BEFORE UPDATE ON public.dispatch_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();