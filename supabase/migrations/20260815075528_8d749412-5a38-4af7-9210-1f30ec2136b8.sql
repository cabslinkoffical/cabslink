ALTER TABLE public.availability_rules DROP CONSTRAINT IF EXISTS availability_rules_scope_check;
ALTER TABLE public.availability_rules ADD CONSTRAINT availability_rules_scope_check
  CHECK (rule_scope = ANY (ARRAY['global'::text,'service'::text,'vehicle_class'::text,'vehicle'::text,'route'::text,'location'::text]));

ALTER TABLE public.availability_rules
  ADD COLUMN IF NOT EXISTS to_place_id text,
  ADD COLUMN IF NOT EXISTS to_place_label text,
  ADD COLUMN IF NOT EXISTS to_lat numeric,
  ADD COLUMN IF NOT EXISTS to_lng numeric,
  ADD COLUMN IF NOT EXISTS to_radius_miles numeric,
  ADD COLUMN IF NOT EXISTS customer_message text;