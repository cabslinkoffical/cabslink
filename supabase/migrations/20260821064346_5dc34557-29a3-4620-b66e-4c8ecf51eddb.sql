UPDATE public.seo_pages SET publication_status = 'retired'
WHERE path LIKE '/airports/%' AND length(split_part(path, '/', 3)) = 3;

INSERT INTO public.seo_redirects (from_path, to_path, status_code)
SELECT '/airports/' || lower(d.meta->>'iata'), '/airports/' || d.slug, '301'::seo_redirect_code
FROM public.destinations d
WHERE d.type = 'airport' AND d.meta->>'iata' IS NOT NULL
ON CONFLICT DO NOTHING;