DROP POLICY IF EXISTS "Public read vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "blog_images_read" ON storage.objects;
CREATE POLICY "Admins read vehicle images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'vehicle-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins read blog images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));