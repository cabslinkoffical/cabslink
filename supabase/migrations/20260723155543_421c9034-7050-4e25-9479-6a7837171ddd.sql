
-- Business parks (Corporate)
INSERT INTO public.destinations (type, slug, name, display_name, country, region, council, town, lat, lng, seo_tier, active, keywords, synonyms)
VALUES
  ('business_park', 'edinburgh-park',    'Edinburgh Park',              'Edinburgh Park',             'GB', 'Scotland',  'City of Edinburgh', 'Edinburgh',   55.9269, -3.3050, 2, true, ARRAY['edinburgh park taxi','corporate transfer edinburgh park']::text[], ARRAY['Edinburgh Business Park']::text[]),
  ('business_park', 'gogarburn',         'RBS Gogarburn',               'Gogarburn Business Campus',  'GB', 'Scotland',  'City of Edinburgh', 'Edinburgh',   55.9349, -3.3454, 2, true, ARRAY['gogarburn taxi','rbs gogarburn transfer']::text[], ARRAY['RBS HQ']::text[]),
  ('business_park', 'bioquarter',        'Edinburgh BioQuarter',        'Edinburgh BioQuarter',       'GB', 'Scotland',  'City of Edinburgh', 'Edinburgh',   55.9207, -3.1362, 2, true, ARRAY['bioquarter taxi','little france transfer']::text[], ARRAY['Little France']::text[]),
  ('business_park', 'quartermile',       'Quartermile',                 'Quartermile Edinburgh',      'GB', 'Scotland',  'City of Edinburgh', 'Edinburgh',   55.9432, -3.1946, 2, true, ARRAY['quartermile taxi','quartermile corporate']::text[], ARRAY[]::text[]),
  ('business_park', 'eurocentral',       'Eurocentral',                 'Eurocentral Business Park',  'GB', 'Scotland',  'North Lanarkshire', 'Motherwell',  55.8362, -3.9500, 2, true, ARRAY['eurocentral taxi','eurocentral corporate']::text[], ARRAY[]::text[]),
  ('business_park', 'rosyth-dockyard',   'Rosyth Dockyard',             'Rosyth Business Park',       'GB', 'Scotland',  'Fife',              'Rosyth',      56.0244, -3.4361, 2, true, ARRAY['rosyth taxi','rosyth dockyard transfer']::text[], ARRAY['Rosyth Naval Base']::text[])
ON CONFLICT (type, slug) DO NOTHING;

-- Distilleries
INSERT INTO public.destinations (type, slug, name, display_name, country, region, council, town, lat, lng, seo_tier, active, keywords, synonyms)
VALUES
  ('distillery','glenfiddich',         'Glenfiddich Distillery',        'Glenfiddich Distillery',       'GB','Speyside','Moray',          'Dufftown',      57.4536, -3.1259, 2, true, ARRAY['glenfiddich tour','speyside whisky tour']::text[], ARRAY[]::text[]),
  ('distillery','the-macallan',        'The Macallan Distillery',       'The Macallan Distillery',      'GB','Speyside','Moray',          'Craigellachie', 57.4880, -3.2020, 2, true, ARRAY['macallan tour','macallan distillery visit']::text[], ARRAY[]::text[]),
  ('distillery','glenlivet',           'The Glenlivet Distillery',      'The Glenlivet Distillery',     'GB','Speyside','Moray',          'Ballindalloch', 57.3286, -3.2678, 2, true, ARRAY['glenlivet tour']::text[], ARRAY[]::text[]),
  ('distillery','aberlour',            'Aberlour Distillery',           'Aberlour Distillery',          'GB','Speyside','Moray',          'Aberlour',      57.4636, -3.2247, 2, true, ARRAY['aberlour tour']::text[], ARRAY[]::text[]),
  ('distillery','laphroaig',           'Laphroaig Distillery',          'Laphroaig Distillery',         'GB','Islay',   'Argyll and Bute','Port Ellen',    55.6301, -6.1517, 2, true, ARRAY['laphroaig tour','islay whisky tour']::text[], ARRAY[]::text[]),
  ('distillery','ardbeg',              'Ardbeg Distillery',             'Ardbeg Distillery',            'GB','Islay',   'Argyll and Bute','Port Ellen',    55.6394, -6.1083, 2, true, ARRAY['ardbeg tour']::text[], ARRAY[]::text[]),
  ('distillery','bowmore',             'Bowmore Distillery',            'Bowmore Distillery',           'GB','Islay',   'Argyll and Bute','Bowmore',       55.7583, -6.2892, 2, true, ARRAY['bowmore tour']::text[], ARRAY[]::text[]),
  ('distillery','glenmorangie',        'Glenmorangie Distillery',       'Glenmorangie Distillery',      'GB','Highland','Highland',       'Tain',          57.8047, -4.0736, 2, true, ARRAY['glenmorangie tour','highland whisky tour']::text[], ARRAY[]::text[]),
  ('distillery','oban-distillery',     'Oban Distillery',               'Oban Distillery',              'GB','Highland','Argyll and Bute','Oban',          56.4127, -5.4728, 2, true, ARRAY['oban distillery tour']::text[], ARRAY[]::text[]),
  ('distillery','dalmore',             'Dalmore Distillery',            'The Dalmore Distillery',       'GB','Highland','Highland',       'Alness',        57.6889, -4.2603, 2, true, ARRAY['dalmore tour']::text[], ARRAY[]::text[]),
  ('distillery','glenkinchie',         'Glenkinchie Distillery',        'Glenkinchie Distillery',       'GB','Lowland','East Lothian',    'Pencaitland',   55.9067, -2.8617, 2, true, ARRAY['glenkinchie tour','edinburgh whisky tour']::text[], ARRAY[]::text[]),
  ('distillery','auchentoshan',        'Auchentoshan Distillery',       'Auchentoshan Distillery',      'GB','Lowland','West Dunbartonshire','Clydebank',   55.9219, -4.4392, 2, true, ARRAY['auchentoshan tour','glasgow whisky tour']::text[], ARRAY[]::text[])
ON CONFLICT (type, slug) DO NOTHING;
