ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS followup_trigger_keywords text,
  ADD COLUMN IF NOT EXISTS followup_stop_keywords text;