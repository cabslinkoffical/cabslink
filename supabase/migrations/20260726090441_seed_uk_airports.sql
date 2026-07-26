-- Seed remaining major UK airports so /airports/<iata> resolves to a real entity.
INSERT INTO public.destinations (type, slug, name, display_name, region, council, town, lat, lng, seo_tier, active, keywords, meta)
VALUES
  ('airport','heathrow-airport','Heathrow Airport','London Heathrow Airport (LHR)','England','Hillingdon','London',51.470020,-0.454295,2,true,ARRAY['LHR','Heathrow','London Heathrow']::text[],'{"iata":"LHR"}'::jsonb),
  ('airport','gatwick-airport','Gatwick Airport','London Gatwick Airport (LGW)','England','Crawley','Crawley',51.153662,-0.182220,2,true,ARRAY['LGW','Gatwick','London Gatwick']::text[],'{"iata":"LGW"}'::jsonb),
  ('airport','stansted-airport','Stansted Airport','London Stansted Airport (STN)','England','Uttlesford','Stansted',51.885000,0.235000,2,true,ARRAY['STN','Stansted']::text[],'{"iata":"STN"}'::jsonb),
  ('airport','luton-airport','Luton Airport','London Luton Airport (LTN)','England','Luton','Luton',51.874722,-0.368333,2,true,ARRAY['LTN','Luton']::text[],'{"iata":"LTN"}'::jsonb),
  ('airport','london-city-airport','London City Airport','London City Airport (LCY)','England','Newham','London',51.505278,0.055278,2,true,ARRAY['LCY','London City']::text[],'{"iata":"LCY"}'::jsonb),
  ('airport','manchester-airport','Manchester Airport','Manchester Airport (MAN)','England','Manchester','Manchester',53.365000,-2.272500,2,true,ARRAY['MAN','Manchester Airport']::text[],'{"iata":"MAN"}'::jsonb),
  ('airport','birmingham-airport','Birmingham Airport','Birmingham Airport (BHX)','England','Solihull','Birmingham',52.453856,-1.748028,2,true,ARRAY['BHX','Birmingham Airport']::text[],'{"iata":"BHX"}'::jsonb),
  ('airport','newcastle-airport','Newcastle Airport','Newcastle International Airport (NCL)','England','Newcastle','Newcastle upon Tyne',55.037500,-1.691667,2,true,ARRAY['NCL','Newcastle']::text[],'{"iata":"NCL"}'::jsonb),
  ('airport','liverpool-airport','Liverpool Airport','Liverpool John Lennon Airport (LPL)','England','Liverpool','Liverpool',53.333611,-2.849722,2,true,ARRAY['LPL','Liverpool John Lennon']::text[],'{"iata":"LPL"}'::jsonb),
  ('airport','bristol-airport','Bristol Airport','Bristol Airport (BRS)','England','North Somerset','Bristol',51.382669,-2.719089,2,true,ARRAY['BRS','Bristol']::text[],'{"iata":"BRS"}'::jsonb),
  ('airport','east-midlands-airport','East Midlands Airport','East Midlands Airport (EMA)','England','North West Leicestershire','Castle Donington',52.831111,-1.328056,2,true,ARRAY['EMA','East Midlands']::text[],'{"iata":"EMA"}'::jsonb),
  ('airport','leeds-bradford-airport','Leeds Bradford Airport','Leeds Bradford Airport (LBA)','England','Leeds','Leeds',53.865897,-1.660531,2,true,ARRAY['LBA','Leeds Bradford']::text[],'{"iata":"LBA"}'::jsonb),
  ('airport','southampton-airport','Southampton Airport','Southampton Airport (SOU)','England','Eastleigh','Southampton',50.950278,-1.356667,2,true,ARRAY['SOU','Southampton']::text[],'{"iata":"SOU"}'::jsonb),
  ('airport','cardiff-airport','Cardiff Airport','Cardiff Airport (CWL)','Wales','Vale of Glamorgan','Cardiff',51.396667,-3.343333,2,true,ARRAY['CWL','Cardiff']::text[],'{"iata":"CWL"}'::jsonb),
  ('airport','belfast-international-airport','Belfast International Airport','Belfast International Airport (BFS)','Northern Ireland','Antrim and Newtownabbey','Belfast',54.657500,-6.215833,2,true,ARRAY['BFS','Belfast International']::text[],'{"iata":"BFS"}'::jsonb),
  ('airport','belfast-city-airport','Belfast City Airport','George Best Belfast City Airport (BHD)','Northern Ireland','Belfast','Belfast',54.618056,-5.872500,2,true,ARRAY['BHD','Belfast City']::text[],'{"iata":"BHD"}'::jsonb)
ON CONFLICT (type, slug) DO NOTHING;
