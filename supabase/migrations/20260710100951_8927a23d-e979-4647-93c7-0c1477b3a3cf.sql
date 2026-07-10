-- Phase 1: Place-ID plumbing for pricing rules + idempotency for bookings.
-- All changes are additive; no data deletion, no dropped columns.

ALTER TABLE public.pricing_rules
  ADD COLUMN IF NOT EXISTS from_place_id text,
  ADD COLUMN IF NOT EXISTS to_place_id text,
  ADD COLUMN IF NOT EXISTS from_place_label text,
  ADD COLUMN IF NOT EXISTS to_place_label text,
  ADD COLUMN IF NOT EXISTS bidirectional boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS pricing_rules_place_pair_idx
  ON public.pricing_rules (from_place_id, to_place_id)
  WHERE from_place_id IS NOT NULL AND to_place_id IS NOT NULL;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS pickup_place_id text,
  ADD COLUMN IF NOT EXISTS dropoff_place_id text,
  ADD COLUMN IF NOT EXISTS distance_miles numeric;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_idempotency_key_uidx
  ON public.bookings (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
