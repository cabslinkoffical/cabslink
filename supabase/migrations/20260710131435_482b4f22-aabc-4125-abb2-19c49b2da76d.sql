
-- ==================================================================
-- Phase 2A completion — private admin settings, event-key dedup, statuses
-- ==================================================================

-- 1) Private admin settings (RLS admin-only). Move admin_notification_email here.
CREATE TABLE IF NOT EXISTS public.private_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Data API grants: no anon; only authenticated (RLS) + service_role.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.private_settings TO authenticated;
GRANT ALL ON public.private_settings TO service_role;

ALTER TABLE public.private_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read private settings" ON public.private_settings;
CREATE POLICY "Admins can read private settings"
  ON public.private_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can write private settings" ON public.private_settings;
CREATE POLICY "Admins can write private settings"
  ON public.private_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) Migrate any existing admin_notification_email from site_settings → private_settings
DO $$
DECLARE existing_email text;
BEGIN
  SELECT admin_notification_email INTO existing_email
    FROM public.site_settings
   WHERE admin_notification_email IS NOT NULL
   LIMIT 1;
  IF existing_email IS NOT NULL AND btrim(existing_email) <> '' THEN
    INSERT INTO public.private_settings (key, value)
    VALUES ('admin_notification_email', btrim(existing_email))
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  END IF;
EXCEPTION WHEN undefined_column THEN
  -- column may not exist in some environments; ignore
  NULL;
END $$;

-- 3) Remove admin_notification_email from the publicly-readable site_settings.
ALTER TABLE public.site_settings DROP COLUMN IF EXISTS admin_notification_email;

-- 4) Notification log: add event_key + event_type columns for deduplication.
ALTER TABLE public.notification_log
  ADD COLUMN IF NOT EXISTS event_key text;

-- Unique per booking (nullable event_key allowed for legacy rows)
CREATE UNIQUE INDEX IF NOT EXISTS notification_log_booking_event_key_uidx
  ON public.notification_log (booking_id, event_key)
  WHERE booking_id IS NOT NULL AND event_key IS NOT NULL;

-- 5) Update trigger for private_settings
CREATE TRIGGER trg_private_settings_set_updated_at
  BEFORE UPDATE ON public.private_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
