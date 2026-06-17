
-- FAQ groups
CREATE TABLE IF NOT EXISTS public.agent_faq_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_faq_groups TO authenticated;
GRANT ALL ON public.agent_faq_groups TO service_role;
ALTER TABLE public.agent_faq_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own faq_groups" ON public.agent_faq_groups
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_faq_groups_user ON public.agent_faq_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_faq_groups_agent ON public.agent_faq_groups(agent_id);

-- FAQ items
CREATE TABLE IF NOT EXISTS public.agent_faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.agent_faq_groups(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}'::text[],
  position INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_faq_items TO authenticated;
GRANT ALL ON public.agent_faq_items TO service_role;
ALTER TABLE public.agent_faq_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own faq_items" ON public.agent_faq_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_faq_items_group ON public.agent_faq_items(group_id);
CREATE INDEX IF NOT EXISTS idx_faq_items_agent ON public.agent_faq_items(agent_id);
CREATE INDEX IF NOT EXISTS idx_faq_items_user ON public.agent_faq_items(user_id);
CREATE INDEX IF NOT EXISTS idx_faq_items_keywords ON public.agent_faq_items USING gin(keywords);

CREATE OR REPLACE FUNCTION public.touch_faq() RETURNS trigger
  LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_touch_faq_groups ON public.agent_faq_groups;
CREATE TRIGGER trg_touch_faq_groups BEFORE UPDATE ON public.agent_faq_groups
  FOR EACH ROW EXECUTE FUNCTION public.touch_faq();
DROP TRIGGER IF EXISTS trg_touch_faq_items ON public.agent_faq_items;
CREATE TRIGGER trg_touch_faq_items BEFORE UPDATE ON public.agent_faq_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_faq();

-- Consultation logs for auditing what sources fed each AI reply
CREATE TABLE IF NOT EXISTS public.agent_consultation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  client_id UUID,
  query TEXT,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.agent_consultation_logs TO authenticated;
GRANT ALL ON public.agent_consultation_logs TO service_role;
ALTER TABLE public.agent_consultation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own consultation_logs" ON public.agent_consultation_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role writes consultation_logs" ON public.agent_consultation_logs
  FOR INSERT TO service_role WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_consultation_logs_user ON public.agent_consultation_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultation_logs_client ON public.agent_consultation_logs(client_id, created_at DESC);

-- Extend products_services with commercial fields
ALTER TABLE public.products_services
  ADD COLUMN IF NOT EXISTS benefits TEXT,
  ADD COLUMN IF NOT EXISTS features TEXT,
  ADD COLUMN IF NOT EXISTS differentials TEXT,
  ADD COLUMN IF NOT EXISTS conditions TEXT,
  ADD COLUMN IF NOT EXISTS warranties TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Knowledge priority on agents: default | faq_first | products_first | kb_first
ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS knowledge_priority TEXT NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS anti_hallucination BOOLEAN NOT NULL DEFAULT true;
