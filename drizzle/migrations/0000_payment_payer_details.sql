ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payer_name text,
  ADD COLUMN IF NOT EXISTS payer_email text,
  ADD COLUMN IF NOT EXISTS card_brand text,
  ADD COLUMN IF NOT EXISTS card_last4 text,
  ADD COLUMN IF NOT EXISTS payment_intent_id text,
  ADD COLUMN IF NOT EXISTS processor_status text,
  ADD COLUMN IF NOT EXISTS environment text;

CREATE UNIQUE INDEX IF NOT EXISTS payments_reference_uidx ON public.payments(reference) WHERE reference IS NOT NULL;

-- Backfill: bookings already marked paid but with no payment record.
INSERT INTO public.payments (booking_id, amount, currency, method, status, reference, notes, paid_at, payer_name, payer_email, processor_status)
SELECT b.id, COALESCE(b.price, 0), 'GBP', 'card', 'paid', NULL,
       'Recorded from booking (paid online before payment details were captured)',
       b.updated_at, b.customer_name, b.email, 'succeeded'
FROM public.bookings b
WHERE b.payment_status = 'paid'
  AND NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.booking_id = b.id);