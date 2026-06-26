
CREATE POLICY "Public read vehicle images" ON storage.objects FOR SELECT USING (bucket_id = 'vehicle-images');
CREATE POLICY "Admins upload vehicle images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vehicle-images' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update vehicle images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'vehicle-images' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete vehicle images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'vehicle-images' AND has_role(auth.uid(), 'admin'::app_role));
