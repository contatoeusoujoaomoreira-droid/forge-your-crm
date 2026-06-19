
-- ====== PR-A: vision flags ======
ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vision_model text;

-- Only one default agent per user
CREATE UNIQUE INDEX IF NOT EXISTS ai_agents_one_default_per_user
  ON public.ai_agents(user_id) WHERE is_default = true;

-- ====== PR-B: orchestrator routing rules ======
CREATE TABLE IF NOT EXISTS public.agent_routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  name text NOT NULL,
  priority integer NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  match_type text NOT NULL DEFAULT 'any', -- any | all
  utm_filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  keywords text[] NOT NULL DEFAULT '{}',
  tag_names text[] NOT NULL DEFAULT '{}',
  pipeline_id uuid,
  stage_id uuid,
  meta_campaign text,
  meta_adset text,
  meta_creative text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_routing_rules TO authenticated;
GRANT ALL ON public.agent_routing_rules TO service_role;
ALTER TABLE public.agent_routing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own routing rules"
  ON public.agent_routing_rules FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_agent_routing_rules_updated_at
  BEFORE UPDATE ON public.agent_routing_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_routing_rules_user_priority
  ON public.agent_routing_rules(user_id, enabled, priority);

-- ====== PR-B (cont): extra UTM/meta fields on leads ======
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS meta_campaign text,
  ADD COLUMN IF NOT EXISTS meta_adset text,
  ADD COLUMN IF NOT EXISTS meta_creative text;

-- ====== PR-D: lead_tags (definitions) ======
CREATE TABLE IF NOT EXISTS public.lead_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#84cc16',
  emoji text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_tags TO authenticated;
GRANT ALL ON public.lead_tags TO service_role;
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own tags"
  ON public.lead_tags FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_lead_tags_updated_at
  BEFORE UPDATE ON public.lead_tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tag-based triggers (for automations beyond stage_triggers)
CREATE TABLE IF NOT EXISTS public.tag_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tag_name text NOT NULL,
  event text NOT NULL DEFAULT 'added', -- added | removed
  action_type text NOT NULL,           -- assign_agent | move_stage | followup | notify
  action_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tag_triggers TO authenticated;
GRANT ALL ON public.tag_triggers TO service_role;
ALTER TABLE public.tag_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their tag triggers"
  ON public.tag_triggers FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_tag_triggers_updated_at
  BEFORE UPDATE ON public.tag_triggers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
