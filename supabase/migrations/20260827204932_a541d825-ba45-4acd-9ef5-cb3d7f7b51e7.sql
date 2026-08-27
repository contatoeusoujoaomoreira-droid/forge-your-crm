ALTER TABLE public.prospecting_campaigns
  ADD COLUMN IF NOT EXISTS audience_mode text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS audience_limit integer,
  ADD COLUMN IF NOT EXISTS post_send_action text NOT NULL DEFAULT 'keep',
  ADD COLUMN IF NOT EXISTS post_send_pipeline_id uuid,
  ADD COLUMN IF NOT EXISTS post_send_stage_id uuid;

ALTER TABLE public.prospecting_campaigns
  ADD CONSTRAINT prospecting_campaigns_audience_mode_check CHECK (audience_mode IN ('all','limit')),
  ADD CONSTRAINT prospecting_campaigns_post_send_action_check CHECK (post_send_action IN ('keep','move'));