ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_service_type_check;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_original_service_type_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_service_type_check
  CHECK (service_type = ANY (ARRAY['direct_transfer','transfer_with_stop','sightseeing_transfer','private_tour','hourly_hire']));
ALTER TABLE public.bookings ADD CONSTRAINT bookings_original_service_type_check
  CHECK (original_service_type = ANY (ARRAY['direct_transfer','transfer_with_stop','sightseeing_transfer','private_tour','hourly_hire']));

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS hourly_hours integer;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS hourly_rate_per_hour numeric;

ALTER TABLE public.hourly_rates ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.hourly_rates ADD COLUMN IF NOT EXISTS notes text;