
CREATE OR REPLACE FUNCTION public.seo_find_similar_pages(_threshold real DEFAULT 0.75)
RETURNS TABLE(a_id uuid, b_id uuid, a_path text, b_path text, title_sim real, meta_sim real)
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT a.id, b.id, a.path, b.path,
         extensions.similarity(a.seo_title, b.seo_title)::real,
         extensions.similarity(a.meta_description, b.meta_description)::real
    FROM public.seo_pages a
    JOIN public.seo_pages b
      ON a.id < b.id
     AND a.publication_status = 'published'
     AND b.publication_status = 'published'
   WHERE extensions.similarity(a.seo_title, b.seo_title) >= _threshold
      OR extensions.similarity(a.meta_description, b.meta_description) >= _threshold;
$$;

CREATE OR REPLACE FUNCTION public.seo_find_orphan_pages()
RETURNS TABLE(page_id uuid, path text, seo_title text)
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p.id, p.path, p.seo_title
    FROM public.seo_pages p
   WHERE p.publication_status = 'published'
     AND NOT EXISTS (
       SELECT 1
         FROM public.seo_page_sections s
        WHERE s.page_id <> p.id
          AND s.visible = true
          AND (
            COALESCE(s.body, '') ILIKE '%' || p.path || '%'
            OR s.structured_payload::text ILIKE '%' || p.path || '%'
          )
     );
$$;
