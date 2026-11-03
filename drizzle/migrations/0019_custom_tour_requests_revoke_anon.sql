REVOKE ALL ON public.custom_tour_requests FROM anon;
REVOKE ALL ON public.custom_tour_request_notes FROM anon;
REVOKE ALL ON SEQUENCE public.custom_tour_ref_seq FROM anon, authenticated;