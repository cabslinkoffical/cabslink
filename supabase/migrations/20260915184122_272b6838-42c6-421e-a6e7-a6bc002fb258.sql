ALTER TABLE public.tour_rules
  ADD COLUMN IF NOT EXISTS allow_same_day boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS same_day_cutoff_time time NOT NULL DEFAULT '12:00',
  ADD COLUMN IF NOT EXISTS poi_radius_factor numeric NOT NULL DEFAULT 0.5;