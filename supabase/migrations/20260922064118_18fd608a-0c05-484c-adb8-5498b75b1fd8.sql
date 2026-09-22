DROP INDEX IF EXISTS public.pricing_rules_active_route_unique;

CREATE UNIQUE INDEX IF NOT EXISTS pricing_rules_active_class_route_unique
  ON public.pricing_rules (
    COALESCE(vehicle_class_id::text, ''),
    COALESCE(vehicle_id::text, ''),
    from_place_id,
    to_place_id
  )
  WHERE active = true;

CREATE OR REPLACE FUNCTION public.pricing_rule_prevent_bidirectional_conflict()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.active IS NOT TRUE THEN RETURN NEW; END IF;
  IF NEW.from_place_id IS NULL OR NEW.to_place_id IS NULL THEN RETURN NEW; END IF;

  IF EXISTS (
    SELECT 1 FROM public.pricing_rules pr
    WHERE pr.id <> NEW.id
      AND pr.active = true
      AND pr.vehicle_class_id IS NOT DISTINCT FROM NEW.vehicle_class_id
      AND pr.vehicle_id IS NOT DISTINCT FROM NEW.vehicle_id
      AND (
        (pr.from_place_id = NEW.from_place_id AND pr.to_place_id = NEW.to_place_id)
        OR
        ((pr.bidirectional OR NEW.bidirectional)
          AND pr.from_place_id = NEW.to_place_id
          AND pr.to_place_id = NEW.from_place_id)
      )
  ) THEN
    RAISE EXCEPTION 'A conflicting active pricing rule already exists for this vehicle class and route (check bidirectional flag).'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;