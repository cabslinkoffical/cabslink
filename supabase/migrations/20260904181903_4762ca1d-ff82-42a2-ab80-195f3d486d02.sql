DO $$ BEGIN
  CREATE TYPE public.tour_booking_status AS ENUM (
    'new', 'read', 'pending', 'booked', 'paid', 'confirmed', 'resolved', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS tour_status public.tour_booking_status NOT NULL DEFAULT 'new';