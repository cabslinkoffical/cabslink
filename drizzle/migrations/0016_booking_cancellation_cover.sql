ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancellation_cover text,
  ADD COLUMN IF NOT EXISTS cancellation_cover_amount numeric(10,2);

UPDATE public.bookings SET cancellation_cover = CASE
    WHEN notes ~* 'Cancellation (policy|cover): Non-refundable' THEN 'non_refundable'
    WHEN notes ~* 'Cancellation (policy|cover): Flexible' THEN 'flexible'
    WHEN notes ~* 'Cancellation (policy|cover): Standard' THEN 'standard'
  END
WHERE cancellation_cover IS NULL AND notes ~* 'Cancellation (policy|cover): ';

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_cancellation_cover_check
  CHECK (cancellation_cover IS NULL OR cancellation_cover IN ('standard','non_refundable','flexible'));

COMMENT ON COLUMN public.bookings.cancellation_cover IS 'Cancellation cover chosen at checkout: standard, non_refundable or flexible. NULL = not recorded (older or staff-entered bookings).';
COMMENT ON COLUMN public.bookings.cancellation_cover_amount IS 'Price change for the chosen cover, GBP: negative = non-refundable saving, positive = flexible charge.';