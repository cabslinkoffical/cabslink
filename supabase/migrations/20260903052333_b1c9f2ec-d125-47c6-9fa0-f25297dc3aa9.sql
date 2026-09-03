DROP POLICY IF EXISTS blog_images_insert ON storage.objects;
DROP POLICY IF EXISTS blog_images_update ON storage.objects;
DROP POLICY IF EXISTS blog_images_delete ON storage.objects;

CREATE POLICY blog_images_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin') AND owner = auth.uid());

CREATE POLICY blog_images_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin') AND owner = auth.uid())
WITH CHECK (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin') AND owner = auth.uid());

CREATE POLICY blog_images_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin') AND owner = auth.uid());