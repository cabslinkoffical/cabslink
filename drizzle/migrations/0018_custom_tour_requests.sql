CREATE SEQUENCE IF NOT EXISTS public.custom_tour_ref_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_custom_tour_ref()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT 'CL-CT-' || to_char(now() AT TIME ZONE 'Europe/London', 'YYYY') || '-' ||
         lpad(nextval('public.custom_tour_ref_seq')::text, 5, '0')
$$;

CREATE TABLE public.custom_tour_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code text NOT NULL UNIQUE DEFAULT public.generate_custom_tour_ref(),
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewing', 'quoted', 'accepted', 'rejected', 'completed')),
  customer_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  start_label text NOT NULL,
  start_place_id text NOT NULL,
  end_label text,
  end_place_id text,
  tour_date date NOT NULL,
  start_time text NOT NULL,
  hours numeric NOT NULL,
  passengers integer NOT NULL CHECK (passengers > 0),
  luggage integer NOT NULL DEFAULT 0 CHECK (luggage >= 0),
  vehicle_class_id uuid REFERENCES public.vehicle_classes(id) ON DELETE SET NULL,
  vehicle_name text,
  stops jsonb NOT NULL DEFAULT '[]'::jsonb,
  original_stops jsonb,
  flight_number text,
  customer_notes text,
  route_miles numeric,
  drive_minutes integer,
  dwell_minutes integer,
  estimated_total numeric,
  price_snapshot jsonb,
  price_note text,
  quoted_total numeric CHECK (quoted_total IS NULL OR quoted_total >= 0),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX custom_tour_requests_status_created_idx ON public.custom_tour_requests (status, created_at DESC);
CREATE INDEX custom_tour_requests_email_idx ON public.custom_tour_requests (lower(email));

CREATE TABLE public.custom_tour_request_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.custom_tour_requests(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'note' CHECK (kind IN ('note', 'status', 'quote')),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  visible_to_customer boolean NOT NULL DEFAULT false,
  author_id uuid,
  author_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX custom_tour_request_notes_request_idx ON public.custom_tour_request_notes (request_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_tour_requests TO authenticated;
GRANT ALL ON public.custom_tour_requests TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_tour_request_notes TO authenticated;
GRANT ALL ON public.custom_tour_request_notes TO service_role;
GRANT USAGE ON SEQUENCE public.custom_tour_ref_seq TO service_role;
REVOKE ALL ON FUNCTION public.generate_custom_tour_ref() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_custom_tour_ref() TO service_role;

ALTER TABLE public.custom_tour_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_tour_request_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage custom tour requests"
  ON public.custom_tour_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage custom tour request notes"
  ON public.custom_tour_request_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER custom_tour_requests_set_updated_at
  BEFORE UPDATE ON public.custom_tour_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();