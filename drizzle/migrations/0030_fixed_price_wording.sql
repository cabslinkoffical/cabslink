create or replace function pg_temp.fp(t text) returns text language sql as $$
  select replace(replace(replace(replace(replace(replace(t,
   'Fixed Fares','Fixed Prices'),'Fixed Fare','Fixed Price'),'fixed fares','fixed prices'),'fixed fare','fixed price'),'Fixed fares','Fixed prices'),'Fixed fare','Fixed price') $$;
update public.vehicle_classes set seo_description=pg_temp.fp(seo_description) where seo_description ilike '%fixed fare%';
update public.blog_posts set title=pg_temp.fp(title),subtitle=pg_temp.fp(subtitle),excerpt=pg_temp.fp(excerpt),body_md=pg_temp.fp(body_md),seo_title=pg_temp.fp(seo_title),meta_description=pg_temp.fp(meta_description)
 where concat(title,subtitle,excerpt,body_md,seo_title,meta_description) ilike '%fixed fare%';
update public.seo_pages set seo_title=pg_temp.fp(seo_title),short_intro=pg_temp.fp(short_intro) where concat(seo_title,short_intro) ilike '%fixed fare%';
update public.seo_services set full_description=pg_temp.fp(full_description) where full_description ilike '%fixed fare%';