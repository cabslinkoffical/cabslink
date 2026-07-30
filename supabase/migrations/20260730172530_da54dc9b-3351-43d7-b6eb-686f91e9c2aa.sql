update public.destinations d set meta = coalesce(d.meta,'{}'::jsonb) || jsonb_build_object('iata', v.iata)
from (values
 ('edinburgh-airport','EDI'),
 ('glasgow-airport','GLA'),
 ('aberdeen-airport','ABZ'),
 ('inverness-airport','INV'),
 ('prestwick-airport','PIK'),
 ('dundee-airport','DND')
) as v(slug, iata)
where d.slug = v.slug and d.type = 'airport';