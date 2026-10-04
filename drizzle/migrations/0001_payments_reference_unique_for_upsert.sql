-- A full unique constraint (NULLs stay distinct) so payment rows can be upserted on the Stripe session reference.
DROP INDEX IF EXISTS public.payments_reference_uidx;
ALTER TABLE public.payments ADD CONSTRAINT payments_reference_key UNIQUE (reference);