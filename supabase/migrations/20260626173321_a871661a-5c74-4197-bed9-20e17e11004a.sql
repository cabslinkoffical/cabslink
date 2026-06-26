DROP POLICY IF EXISTS "Anyone can log a quote" ON public.quote_calculations;

CREATE POLICY "Anonymous can log a quote without customer"
  ON public.quote_calculations FOR INSERT
  TO anon
  WITH CHECK (customer_id IS NULL);

CREATE POLICY "Authenticated can log own quote"
  ON public.quote_calculations FOR INSERT
  TO authenticated
  WITH CHECK (customer_id IS NULL OR customer_id = auth.uid());