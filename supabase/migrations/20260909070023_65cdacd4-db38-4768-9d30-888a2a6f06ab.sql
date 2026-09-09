ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT 'upload',
  ADD COLUMN IF NOT EXISTS optimized_at timestamptz,
  ADD COLUMN IF NOT EXISTS original_bytes bigint,
  ADD COLUMN IF NOT EXISTS optimization_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS usage_locations jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.media_assets
  ADD CONSTRAINT media_assets_source_kind_check
  CHECK (source_kind IN ('upload', 'legacy_storage', 'database_url', 'bundled_asset'));

ALTER TABLE public.media_assets
  ADD CONSTRAINT media_assets_optimization_status_check
  CHECK (optimization_status IN ('pending', 'optimized', 'already_optimized', 'skipped', 'failed'));

CREATE INDEX IF NOT EXISTS media_assets_optimization_status_idx
  ON public.media_assets (optimization_status);