REVOKE EXECUTE ON FUNCTION public.current_driver_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_driver_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_driver_id() TO authenticated;