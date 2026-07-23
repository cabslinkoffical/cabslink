
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS meet_greet_fee_pence integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS return_journey_fee_pence integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS policy_non_refundable_percent numeric(5,2) NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS policy_non_refundable_min_pence integer NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS policy_flexible_percent numeric(5,2) NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS policy_flexible_min_pence integer NOT NULL DEFAULT 400;
