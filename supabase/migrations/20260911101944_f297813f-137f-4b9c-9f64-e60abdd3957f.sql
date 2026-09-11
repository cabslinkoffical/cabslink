ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS tour_slug text,
  ADD COLUMN IF NOT EXISTS tour_name text,
  ADD COLUMN IF NOT EXISTS tour_stops jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS price_quoted_at timestamptz;

CREATE INDEX IF NOT EXISTS bookings_service_type_idx ON public.bookings (service_type);

-- Backfill existing tour enquiries from contact_messages into bookings.
INSERT INTO public.bookings (
  booking_ref, customer_name, email, phone,
  pickup_address, dropoff_address, pickup_date, pickup_time,
  passengers, luggage, vehicle_type, notes,
  service_type, original_service_type, status, payment_status,
  tour_name, created_at
)
SELECT
  public.generate_booking_ref(),
  cm.name,
  cm.email,
  COALESCE(cm.phone, ''),
  'Tour enquiry',
  'Tour enquiry',
  (cm.created_at AT TIME ZONE 'UTC')::date,
  '09:00',
  1,
  0,
  'tour',
  cm.message,
  'private_tour',
  'private_tour',
  CASE
    WHEN cm.tour_status = 'cancelled' THEN 'cancelled'::booking_status
    WHEN cm.tour_status IN ('paid','confirmed') THEN 'confirmed'::booking_status
    WHEN cm.tour_status = 'resolved' THEN 'completed'::booking_status
    ELSE 'new'::booking_status
  END,
  CASE WHEN cm.tour_status = 'paid' THEN 'paid'::payment_status ELSE 'unpaid'::payment_status END,
  NULLIF(btrim(split_part(cm.subject, ':', 2)), ''),
  cm.created_at
FROM public.contact_messages cm
WHERE lower(COALESCE(cm.subject, '')) LIKE 'tour booking:%'
   OR lower(COALESCE(cm.message, '')) LIKE '%tour enquiry%';

DELETE FROM public.contact_messages cm
WHERE lower(COALESCE(cm.subject, '')) LIKE 'tour booking:%'
   OR lower(COALESCE(cm.message, '')) LIKE '%tour enquiry%';