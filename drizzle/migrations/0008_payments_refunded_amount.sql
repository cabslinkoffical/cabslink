ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS refunded_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_refunded_amount_bounds;
ALTER TABLE public.payments ADD CONSTRAINT payments_refunded_amount_bounds
  CHECK (refunded_amount >= 0 AND refunded_amount <= amount);
UPDATE public.payments SET refunded_amount = amount
WHERE status = 'refunded' AND refunded_amount < amount;