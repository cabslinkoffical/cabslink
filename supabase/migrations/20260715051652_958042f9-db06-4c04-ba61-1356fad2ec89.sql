ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS child_seat_fee_pence integer NOT NULL DEFAULT 500;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS child_seat_count integer NOT NULL DEFAULT 0;

-- Backfill: any existing booking with child_seat = true gets a count of 1.
UPDATE public.bookings SET child_seat_count = 1 WHERE child_seat = TRUE AND child_seat_count = 0;