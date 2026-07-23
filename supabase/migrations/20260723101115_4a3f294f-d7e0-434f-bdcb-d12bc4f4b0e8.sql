
-- Helper: create hidden backing vehicles and pricing for classes lacking them
DO $$
DECLARE
  rec RECORD;
  new_vid UUID;
  pid UUID;
BEGIN
  FOR rec IN
    SELECT c.id AS class_id, c.name, c.slug, c.passengers, c.large_luggage, c.cabin_bags,
           c.hero_image
    FROM public.vehicle_classes c
    WHERE c.pricing_vehicle_id IS NULL
      AND c.slug <> 'unclassified'
      AND c.slug <> 'coach'
  LOOP
    INSERT INTO public.vehicles (name, category, image_url, description, passengers, luggage, hand_luggage, active, featured, display_order)
    VALUES (rec.name || ' (class pricing)', 'Class', COALESCE(rec.hero_image, ''), 'Internal pricing carrier — do not edit directly.', rec.passengers, rec.large_luggage, rec.cabin_bags, false, false, 999)
    RETURNING id INTO new_vid;

    UPDATE public.vehicle_classes SET pricing_vehicle_id = new_vid, quote_on_request = false WHERE id = rec.class_id;
  END LOOP;
END $$;

-- Seed pricing profiles + tiers for each class (skip classes that already have a profile, skip Coach & Unclassified)
DO $$
DECLARE
  rec RECORD;
  pid UUID;
  base NUMERIC; via NUMERIC;
  t1 NUMERIC; t2 NUMERIC; t3 NUMERIC; t4 NUMERIC; t5 NUMERIC;
BEGIN
  FOR rec IN
    SELECT c.id AS class_id, c.slug, c.pricing_vehicle_id
    FROM public.vehicle_classes c
    WHERE c.pricing_vehicle_id IS NOT NULL
      AND c.slug NOT IN ('unclassified')
      AND NOT EXISTS (SELECT 1 FROM public.vehicle_pricing_profiles p WHERE p.vehicle_id = c.pricing_vehicle_id)
  LOOP
    -- UK-sensible defaults per class slug
    CASE rec.slug
      WHEN 'economy-saloon'          THEN base:=25; via:=8;  t1:=0.01; t2:=3.20; t3:=2.00; t4:=1.70; t5:=1.50;
      WHEN 'standard-saloon'         THEN base:=30; via:=9;  t1:=0.01; t2:=3.50; t3:=2.20; t4:=1.85; t5:=1.65;
      WHEN 'estate-car'              THEN base:=32; via:=9;  t1:=0.01; t2:=3.70; t3:=2.30; t4:=1.95; t5:=1.75;
      WHEN 'standard-mpv'            THEN base:=38; via:=11; t1:=0.01; t2:=4.10; t3:=2.55; t4:=2.15; t5:=1.90;
      WHEN 'seven-seater-mpv'        THEN base:=44; via:=12; t1:=0.01; t2:=4.60; t3:=2.85; t4:=2.40; t5:=2.10;
      WHEN 'eight-seater-van'        THEN base:=48; via:=13; t1:=0.01; t2:=4.90; t3:=3.05; t4:=2.55; t5:=2.25;
      WHEN 'wheelchair-accessible'   THEN base:=42; via:=12; t1:=0.01; t2:=4.40; t3:=2.75; t4:=2.30; t5:=2.05;
      WHEN 'electric-saloon'         THEN base:=30; via:=9;  t1:=0.01; t2:=3.40; t3:=2.10; t4:=1.80; t5:=1.60;
      WHEN 'electric-mpv'            THEN base:=45; via:=12; t1:=0.01; t2:=4.70; t3:=2.90; t4:=2.45; t5:=2.15;
      ELSE base:=30; via:=9; t1:=0.01; t2:=3.50; t3:=2.20; t4:=1.85; t5:=1.65;
    END CASE;

    INSERT INTO public.vehicle_pricing_profiles
      (vehicle_id, base_price, via_price, status, vehicle_add_price_enabled, time_extra_amount, time_extra_type)
    VALUES (rec.pricing_vehicle_id, base, via, true, false, 0, 'fixed')
    RETURNING id INTO pid;

    INSERT INTO public.vehicle_mileage_tiers (pricing_profile_id, tier_name, miles, cost_per_mile, sort_order) VALUES
      (pid, 'Base',            10,  t1, 1),
      (pid, 'Next 10 miles',   10,  t2, 2),
      (pid, 'Next 20 miles',   20,  t3, 3),
      (pid, 'Next 50 miles',   50,  t4, 4),
      (pid, 'Next 999 miles', 999,  t5, 5);
  END LOOP;
END $$;

-- Ensure all priced classes are not marked quote_on_request (except Coach & Unclassified)
UPDATE public.vehicle_classes
SET quote_on_request = false
WHERE pricing_vehicle_id IS NOT NULL
  AND slug NOT IN ('coach', 'unclassified');
