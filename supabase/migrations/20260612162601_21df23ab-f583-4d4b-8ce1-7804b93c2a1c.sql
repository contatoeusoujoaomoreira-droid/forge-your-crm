
-- ============ PRODUCTS / SERVICES CATALOG ============
CREATE TABLE IF NOT EXISTS public.products_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  name text NOT NULL,
  niche text,
  segment text,
  description text,
  categories text[] DEFAULT '{}'::text[],
  keywords text[] DEFAULT '{}'::text[],
  images text[] DEFAULT '{}'::text[],
  external_links jsonb DEFAULT '[]'::jsonb,
  price numeric,
  price_label text,
  ad_identifiers text[] DEFAULT '{}'::text[],
  ad_source text,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products_services TO authenticated;
GRANT ALL ON public.products_services TO service_role;

ALTER TABLE public.products_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own products"
  ON public.products_services FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_products_services_user ON public.products_services(user_id);
CREATE INDEX IF NOT EXISTS idx_products_services_agent ON public.products_services(agent_id);
CREATE INDEX IF NOT EXISTS idx_products_services_active ON public.products_services(user_id, is_active);

CREATE OR REPLACE FUNCTION public.touch_products_services() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_touch_products_services ON public.products_services;
CREATE TRIGGER trg_touch_products_services
  BEFORE UPDATE ON public.products_services
  FOR EACH ROW EXECUTE FUNCTION public.touch_products_services();

-- ============ AGENT PRESETS (reusable bundles) ============
CREATE TABLE IF NOT EXISTS public.agent_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  scope text NOT NULL DEFAULT 'full',
  description text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_template boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_presets TO authenticated;
GRANT ALL ON public.agent_presets TO service_role;

ALTER TABLE public.agent_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own agent presets"
  ON public.agent_presets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_agent_presets_user ON public.agent_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_presets_scope ON public.agent_presets(user_id, scope);

DROP TRIGGER IF EXISTS trg_touch_agent_presets ON public.agent_presets;
CREATE TRIGGER trg_touch_agent_presets
  BEFORE UPDATE ON public.agent_presets
  FOR EACH ROW EXECUTE FUNCTION public.touch_products_services();
