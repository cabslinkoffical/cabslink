REVOKE ALL ON FUNCTION public.save_pricing_scheme_base(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.save_pricing_scheme_base(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_pricing_scheme_base(jsonb) TO authenticated;