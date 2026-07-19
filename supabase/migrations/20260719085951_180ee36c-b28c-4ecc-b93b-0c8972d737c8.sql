
UPDATE public.points_of_interest SET image_url = CASE name
  WHEN 'Aberfoyle' THEN '/__l5e/assets-v1/11789f7b-2577-4dbd-88e8-3ffb291f9922/poi-aberfoyle.jpg'
  WHEN 'Blackness Castle' THEN '/__l5e/assets-v1/0d2df755-9954-4769-943d-bb62859c94b6/poi-blackness-castle.jpg'
  WHEN 'Blair Drummond Safari Park' THEN '/__l5e/assets-v1/c0441d1b-6fc6-4a92-83f5-9ee24f8a0763/poi-blair-drummond.jpg'
  WHEN 'Callander' THEN '/__l5e/assets-v1/1bae1983-cbe9-4eff-82af-21e223d145bc/poi-callander.jpg'
  WHEN 'Craigmillar Castle' THEN '/__l5e/assets-v1/91d30f95-4887-4f4c-8264-8eb62bfe9d60/poi-craigmillar.jpg'
  WHEN 'Culross' THEN '/__l5e/assets-v1/fa100546-5fa4-4a39-8dd9-89b812b1c8b4/poi-culross.jpg'
  WHEN 'Doune Castle' THEN '/__l5e/assets-v1/03586799-214c-43b2-8b1c-c9d6648ae008/poi-doune.jpg'
  WHEN 'Falkirk Wheel' THEN '/__l5e/assets-v1/2409b345-a6ea-4c02-9413-b369644a4d65/poi-falkirk-wheel.jpg'
  WHEN 'Falkland' THEN '/__l5e/assets-v1/25b38554-a710-49ed-bd50-45407b3d1c80/poi-falkland.jpg'
  WHEN 'Fort William' THEN '/__l5e/assets-v1/39815d3e-529d-4e48-a4a4-5fb1898ae8fb/poi-fort-william.jpg'
  WHEN 'Glencoe' THEN '/__l5e/assets-v1/2f7f1130-1141-4f46-853a-6abfc2e9a5ab/poi-glencoe.jpg'
  WHEN 'Glenfinnan Viaduct' THEN '/__l5e/assets-v1/1d5e1ee5-da6f-4284-8845-716f3aa47c97/poi-glenfinnan.jpg'
  WHEN 'The Kelpies' THEN '/__l5e/assets-v1/9a4d11ff-56ec-45c5-899b-8631adeb7250/poi-kelpies.jpg'
  WHEN 'Linlithgow Palace' THEN '/__l5e/assets-v1/2785790e-5b3d-4e59-be90-a863b18ddd64/poi-linlithgow.jpg'
  WHEN 'Loch Lomond (Balloch)' THEN '/__l5e/assets-v1/21dbb257-560e-4aab-898f-868005922ca1/poi-loch-lomond.jpg'
  WHEN 'Loch Lubnaig' THEN '/__l5e/assets-v1/bc6b0da4-feb5-477f-a5b0-30ee0f151809/poi-loch-lubnaig.jpg'
  WHEN 'Lochearnhead' THEN '/__l5e/assets-v1/d36e7b56-aa33-4d2c-ab12-8a052f3dc430/poi-lochearnhead.jpg'
  WHEN 'Midhope Castle' THEN '/__l5e/assets-v1/09e2a128-edd4-49c0-aace-9a67a29db4ba/poi-midhope.jpg'
  WHEN 'Stirling Castle' THEN '/__l5e/assets-v1/5d22eee1-fc58-4cac-9dc3-ca0a6133c997/poi-stirling.jpg'
END
WHERE name IN (
  'Aberfoyle','Blackness Castle','Blair Drummond Safari Park','Callander','Craigmillar Castle',
  'Culross','Doune Castle','Falkirk Wheel','Falkland','Fort William','Glencoe','Glenfinnan Viaduct',
  'The Kelpies','Linlithgow Palace','Loch Lomond (Balloch)','Loch Lubnaig','Lochearnhead',
  'Midhope Castle','Stirling Castle'
);
