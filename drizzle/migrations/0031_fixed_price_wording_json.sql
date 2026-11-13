update public.blog_posts set
 faqs = replace(replace(replace(replace(faqs::text,'fixed fares','fixed prices'),'fixed fare','fixed price'),'Fixed fares','Fixed prices'),'Fixed fare','Fixed price')::jsonb,
 key_takeaways = replace(replace(replace(replace(key_takeaways::text,'fixed fares','fixed prices'),'fixed fare','fixed price'),'Fixed fares','Fixed prices'),'Fixed fare','Fixed price')::jsonb,
 toc = replace(replace(replace(replace(toc::text,'fixed fares','fixed prices'),'fixed fare','fixed price'),'Fixed fares','Fixed prices'),'Fixed fare','Fixed price')::jsonb
where concat(faqs::text,key_takeaways::text,toc::text) ilike '%fixed fare%';