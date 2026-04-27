
-- Expand ai_agents with full builder fields
ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS rules text,
  ADD COLUMN IF NOT EXISTS examples text,
  ADD COLUMN IF NOT EXISTS objections text,
  ADD COLUMN IF NOT EXISTS pipeline_id text,
  ADD COLUMN IF NOT EXISTS stage_id text,
  ADD COLUMN IF NOT EXISTS routing_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS handoff_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS handoff_keywords text,
  ADD COLUMN IF NOT EXISTS stop_words text,
  ADD COLUMN IF NOT EXISTS inactivity_timeout_minutes integer,
  ADD COLUMN IF NOT EXISTS message_limit integer,
  ADD COLUMN IF NOT EXISTS business_hours jsonb NOT NULL DEFAULT '{"enabled": false, "start": "09:00", "end": "18:00", "days": [1,2,3,4,5]}'::jsonb,
  ADD COLUMN IF NOT EXISTS auto_close_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_close_message text;

-- Update updated_at trigger if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='ai_agents_updated_at') THEN
    CREATE TRIGGER ai_agents_updated_at BEFORE UPDATE ON public.ai_agents
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
