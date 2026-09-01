CREATE POLICY "blog_images_read" ON storage.objects FOR SELECT USING (bucket_id = 'blog-images');
CREATE POLICY "blog_images_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'blog-images');
CREATE POLICY "blog_images_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'blog-images');
CREATE POLICY "blog_images_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'blog-images');