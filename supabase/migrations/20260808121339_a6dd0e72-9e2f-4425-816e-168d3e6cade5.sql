ALTER TABLE public.pipelines
  ADD COLUMN IF NOT EXISTS meta_pixel_id text,
  ADD COLUMN IF NOT EXISTS meta_access_token text,
  ADD COLUMN IF NOT EXISTS meta_test_event_code text;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS click_id text,
  ADD COLUMN IF NOT EXISTS referring_url text;

CREATE INDEX IF NOT EXISTS idx_leads_click_id ON public.leads(click_id);
CREATE INDEX IF NOT EXISTS idx_leads_utm_source ON public.leads(utm_source);