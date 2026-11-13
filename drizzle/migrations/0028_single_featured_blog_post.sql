CREATE OR REPLACE FUNCTION public.blog_posts_single_featured()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.featured THEN
    UPDATE public.blog_posts SET featured = false WHERE featured AND id <> NEW.id;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.blog_posts_single_featured() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS blog_posts_single_featured ON public.blog_posts;
CREATE TRIGGER blog_posts_single_featured
AFTER INSERT OR UPDATE OF featured ON public.blog_posts
FOR EACH ROW WHEN (NEW.featured) EXECUTE FUNCTION public.blog_posts_single_featured();

-- Keep only the newest published featured post.
UPDATE public.blog_posts SET featured = false
WHERE featured AND id <> (
  SELECT id FROM public.blog_posts WHERE featured
  ORDER BY (status = 'published') DESC, published_at DESC NULLS LAST, updated_at DESC LIMIT 1);

CREATE UNIQUE INDEX IF NOT EXISTS blog_posts_one_featured ON public.blog_posts ((true)) WHERE featured;