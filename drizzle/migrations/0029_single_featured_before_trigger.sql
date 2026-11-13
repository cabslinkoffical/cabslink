DROP TRIGGER IF EXISTS blog_posts_single_featured ON public.blog_posts;
CREATE TRIGGER blog_posts_single_featured
BEFORE INSERT OR UPDATE OF featured ON public.blog_posts
FOR EACH ROW WHEN (NEW.featured) EXECUTE FUNCTION public.blog_posts_single_featured();