ALTER TABLE public.site_events ADD COLUMN IF NOT EXISTS event_id text, ADD COLUMN IF NOT EXISTS host text;
CREATE UNIQUE INDEX IF NOT EXISTS site_events_event_id_key ON public.site_events(event_id);
CREATE INDEX IF NOT EXISTS site_events_created_at_idx ON public.site_events(created_at);
-- Remove historic duplicate records: same session, kind, name and page within 3 seconds.
DELETE FROM public.site_events e USING (
  SELECT id FROM (
    SELECT id, created_at - lag(created_at) OVER (PARTITION BY session_id, kind, name, path ORDER BY created_at) AS gap
    FROM public.site_events WHERE session_id IS NOT NULL
  ) x WHERE gap < interval '3 seconds'
) d WHERE e.id = d.id;