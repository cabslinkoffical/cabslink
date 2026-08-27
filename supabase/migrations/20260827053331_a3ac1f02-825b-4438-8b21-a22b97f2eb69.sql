DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'extras','extra_vehicle_classes','blog_posts','blog_categories','blog_tags','blog_authors',
    'seo_pages','seo_locations','seo_airports','seo_services','seo_popular_routes',
    'seo_page_sections','seo_redirects','vehicle_pricing_profiles','vehicle_mileage_tiers',
    'notification_templates','banned_addresses','scenic_route_template_pois','destination_seo'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS log_%1$s_actions ON public.%1$s', t);
    EXECUTE format('CREATE TRIGGER log_%1$s_actions AFTER INSERT OR UPDATE OR DELETE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.log_admin_action()', t);
  END LOOP;
END $$;