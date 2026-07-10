
ALTER TABLE public.notification_log DROP CONSTRAINT IF EXISTS notification_log_status_check;
ALTER TABLE public.notification_log
  ADD CONSTRAINT notification_log_status_check
  CHECK (status IN ('pending','sent','failed','suppressed','not_configured'));
