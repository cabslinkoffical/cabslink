-- Mirror of drizzle 0003. Safe to run more than once.
CREATE OR REPLACE FUNCTION public.bookings_lowercase_email()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    NEW.email := lower(trim(NEW.email));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_lowercase_email ON public.bookings;
CREATE TRIGGER bookings_lowercase_email
BEFORE INSERT OR UPDATE OF email ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.bookings_lowercase_email();

UPDATE public.bookings SET email = lower(email) WHERE email IS NOT NULL AND email <> lower(email);