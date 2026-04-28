
ALTER TABLE public.agent_knowledge
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS media_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS external_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_agent_knowledge_agent_category ON public.agent_knowledge(agent_id, category);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_keywords ON public.agent_knowledge USING gin (keywords);
