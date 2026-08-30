-- Remove the duplicate "Additional Child Seat" add-on: the canonical
-- "Child Seat" extra already supports quantities up to 4.
UPDATE public.extras SET active = false WHERE key = 'additional_child_seat';
-- Make the remaining child seat extra clearly quantity-based.
UPDATE public.extras
SET description = 'Rear-facing, forward-facing or booster-ready child seat fitted by the driver. Choose how many you need.'
WHERE key = 'child_seat';