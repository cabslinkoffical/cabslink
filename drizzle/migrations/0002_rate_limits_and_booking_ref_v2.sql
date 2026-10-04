CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.rate_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  hits integer NOT NULL DEFAULT 0
);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (which bypasses RLS) may touch this table.
CREATE INDEX rate_limits_window_start_idx ON public.rate_limits (window_start);

CREATE OR REPLACE FUNCTION public.rate_limit_hit(_key text, _max integer, _window_seconds integer)
RETURNS TABLE(allowed boolean, hits integer, reset_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.rate_limits%ROWTYPE;
BEGIN
  INSERT INTO public.rate_limits AS rl (key, window_start, hits)
  VALUES (_key, now(), 1)
  ON CONFLICT (key) DO UPDATE SET
    window_start = CASE WHEN rl.window_start <= now() - make_interval(secs => _window_seconds) THEN now() ELSE rl.window_start END,
    hits = CASE WHEN rl.window_start <= now() - make_interval(secs => _window_seconds) THEN 1 ELSE rl.hits + 1 END
  RETURNING rl.* INTO r;
  RETURN QUERY SELECT r.hits <= _max, r.hits, r.window_start + make_interval(secs => _window_seconds);
END;
$$;
REVOKE ALL ON FUNCTION public.rate_limit_hit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(text, integer, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.rate_limits_cleanup()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 day';
$$;
REVOKE ALL ON FUNCTION public.rate_limits_cleanup() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limits_cleanup() TO service_role;

SELECT cron.schedule('rate-limits-daily-cleanup', '17 3 * * *', $$SELECT public.rate_limits_cleanup()$$);

CREATE OR REPLACE FUNCTION public.generate_booking_ref()
RETURNS text
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  candidate text;
  attempt int := 0;
  -- Ambiguity-free 32-char alphabet (no 0/O/1/I); 256 % 32 = 0 so byte % 32 is unbiased.
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea;
  seg text;
  i int;
  found boolean;
BEGIN
  LOOP
    bytes := extensions.gen_random_bytes(8);
    seg := '';
    FOR i IN 0..7 LOOP
      seg := seg || substr(alphabet, 1 + (get_byte(bytes, i) % 32), 1);
    END LOOP;
    candidate := 'CL-' || to_char(now() AT TIME ZONE 'UTC', 'YYMMDD') || '-' || seg;
    SELECT EXISTS (SELECT 1 FROM public.bookings WHERE booking_ref = candidate) INTO found;
    IF NOT found THEN
      RETURN candidate;
    END IF;
    attempt := attempt + 1;
    IF attempt > 12 THEN
      RAISE EXCEPTION 'Unable to generate unique booking reference after % attempts', attempt;
    END IF;
  END LOOP;
END;
$$;