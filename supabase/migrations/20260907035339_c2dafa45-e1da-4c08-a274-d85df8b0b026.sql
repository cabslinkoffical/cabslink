CREATE TYPE public.cancellation_request_status AS ENUM ('pending','in_review','approved','refunded','declined','completed');

CREATE TABLE public.cancellation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  booking_ref text NOT NULL,
  customer_name text,
  email text,
  phone text,
  reason text NOT NULL,
  details text,
  callback_phone text,
  refund_tier text NOT NULL DEFAULT 'partial',
  hours_until_pickup numeric,
  price_at_request numeric,
  payment_status_at_request text,
  pickup_date date,
  pickup_time text,
  pickup_address text,
  dropoff_address text,
  status public.cancellation_request_status NOT NULL DEFAULT 'pending',
  refund_amount numeric,
  admin_notes text,
  handled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cancellation_requests_status_idx ON public.cancellation_requests (status, created_at DESC);
CREATE INDEX cancellation_requests_ref_idx ON public.cancellation_requests (booking_ref);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cancellation_requests TO authenticated;
GRANT ALL ON public.cancellation_requests TO service_role;

ALTER TABLE public.cancellation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage cancellation requests"
ON public.cancellation_requests FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER cancellation_requests_set_updated_at
BEFORE UPDATE ON public.cancellation_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.cancellation_requests (
  booking_id, booking_ref, customer_name, email, phone, reason, details, refund_tier,
  price_at_request, payment_status_at_request, pickup_date, pickup_time, pickup_address, dropoff_address, created_at
)
SELECT
  b.id,
  COALESCE(b.booking_ref, substring(m.subject from 'Cancellation request: ([A-Za-z0-9-]+)')),
  m.name, m.email, m.phone,
  COALESCE(substring(m.message from 'Reason: ([^\n]+)'), 'Not specified'),
  m.message,
  CASE WHEN m.subject ILIKE '%full refund%' THEN 'full' WHEN m.subject ILIKE '%partial%' THEN 'partial' ELSE 'partial' END,
  b.price, b.payment_status::text, b.pickup_date, b.pickup_time, b.pickup_address, b.dropoff_address,
  m.created_at
FROM public.contact_messages m
LEFT JOIN public.bookings b
  ON b.booking_ref = substring(m.subject from 'Cancellation request: ([A-Za-z0-9-]+)')
WHERE m.subject ILIKE 'Cancellation request:%';