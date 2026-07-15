REVOKE ALL ON FUNCTION public.set_booking_status(uuid, booking_status, uuid, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_booking_status(uuid, booking_status, uuid, text, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.set_booking_status(uuid, booking_status, uuid, text, boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.set_booking_status(uuid, booking_status, uuid, text, boolean) TO service_role;