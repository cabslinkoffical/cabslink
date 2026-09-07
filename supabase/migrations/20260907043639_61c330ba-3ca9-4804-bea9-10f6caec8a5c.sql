CREATE TYPE public.amendment_status AS ENUM ('pending_payment','awaiting_refund','applied','declined');

CREATE TABLE public.booking_amendments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  booking_ref text NOT NULL,
  customer_name text,
  email text,
  phone text,
  status public.amendment_status NOT NULL DEFAULT 'applied',
  old_price numeric,
  new_price numeric,
  delta numeric,
  payment_status_at_request text,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  previous jsonb NOT NULL DEFAULT '{}'::jsonb,
  customer_note text,
  refund_amount numeric,
  admin_notes text,
  top_up_paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX booking_amendments_ref_idx ON public.booking_amendments (booking_ref);
CREATE INDEX booking_amendments_status_idx ON public.booking_amendments (status, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_amendments TO authenticated;
GRANT ALL ON public.booking_amendments TO service_role;

ALTER TABLE public.booking_amendments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage booking amendments"
ON public.booking_amendments FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER booking_amendments_set_updated_at
BEFORE UPDATE ON public.booking_amendments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();