ALTER TABLE public.vehicle_pricing_profiles
  ADD COLUMN IF NOT EXISTS city_included_miles numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS waiting_fee_per_minute numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS airport_pickup_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS connecting_job_discount_percent numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.vehicle_pricing_profiles.city_included_miles IS 'Distance covered by base_price alone (city transfer fixed price up to this many miles). Mirrored as the first zero-rate mileage tier.';
COMMENT ON COLUMN public.vehicle_pricing_profiles.waiting_fee_per_minute IS 'Charged per minute of waiting beyond the free allowance.';
COMMENT ON COLUMN public.vehicle_pricing_profiles.airport_pickup_fee IS 'Added once when the journey is an airport pickup.';
COMMENT ON COLUMN public.vehicle_pricing_profiles.connecting_job_discount_percent IS 'Percentage taken off when the job connects to another booking.';