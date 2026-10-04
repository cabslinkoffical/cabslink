-- Mirror of drizzle 0001. Safe to run more than once.
DROP INDEX IF EXISTS public.payments_reference_uidx;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_reference_key' AND conrelid = 'public.payments'::regclass
  ) THEN
    ALTER TABLE public.payments ADD CONSTRAINT payments_reference_key UNIQUE (reference);
  END IF;
END $$;
