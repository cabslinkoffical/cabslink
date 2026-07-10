ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS idempotency_request_hash text;

-- Prevent activating a fixed-price rule that has no Place IDs on either side.
CREATE OR REPLACE FUNCTION public.pricing_rules_require_place_ids_when_active()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.active IS TRUE
     AND (NEW.from_place_id IS NULL OR btrim(NEW.from_place_id) = ''
       OR NEW.to_place_id IS NULL OR btrim(NEW.to_place_id) = '') THEN
    RAISE EXCEPTION 'Active pricing rules require both origin and destination Google Place IDs.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pricing_rules_require_place_ids_when_active_trg ON public.pricing_rules;
CREATE TRIGGER pricing_rules_require_place_ids_when_active_trg
BEFORE INSERT OR UPDATE ON public.pricing_rules
FOR EACH ROW EXECUTE FUNCTION public.pricing_rules_require_place_ids_when_active();

-- Deactivate any legacy rows that are currently active without Place IDs so
-- the trigger does not block subsequent unrelated updates on those rows.
UPDATE public.pricing_rules
   SET active = false
 WHERE active = true
   AND (from_place_id IS NULL OR btrim(from_place_id) = ''
     OR to_place_id IS NULL OR btrim(to_place_id) = '');