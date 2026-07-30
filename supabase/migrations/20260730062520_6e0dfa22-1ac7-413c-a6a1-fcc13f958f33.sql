UPDATE public.vehicle_classes
SET hero_image = NULL
WHERE slug IN (
  'economy-saloon','standard-saloon','executive-saloon','luxury-chauffeur-saloon',
  'estate-car','standard-mpv','seven-seater-mpv','premium-mpv','eight-seater-van',
  'executive-minibus','coach','wheelchair-accessible','electric-saloon','electric-mpv'
);