-- Mirror of drizzle/migrations/0004_booking_confirmation_salt.sql (applied live).
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS confirmation_salt uuid;
-- Existing rows keep a NULL salt so their links (derived without a salt) keep working.
ALTER TABLE public.bookings ALTER COLUMN confirmation_salt SET DEFAULT gen_random_uuid();
COMMENT ON COLUMN public.bookings.confirmation_salt IS 'Mixed into the confirmation-link HMAC. NULL = legacy link derived without salt. Regenerate by setting a new value.';
