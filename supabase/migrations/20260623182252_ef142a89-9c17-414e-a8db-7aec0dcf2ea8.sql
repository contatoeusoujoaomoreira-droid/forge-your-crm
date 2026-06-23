
-- ============================================================
-- PR-1..4: Forms/Quiz Enterprise (tracking, CRM, WhatsApp, Meta CAPI, Funnel)
-- ============================================================

-- ----- FORMS: WhatsApp automático + Meta event + tracking config
ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS whatsapp_auto_send boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_auto_delay_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS whatsapp_auto_message text,
  ADD COLUMN IF NOT EXISTS meta_event_name text,
  ADD COLUMN IF NOT EXISTS meta_event_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meta_event_currency text DEFAULT 'BRL';

-- ----- QUIZZES: mesma config
ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS whatsapp_auto_send boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_auto_delay_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS whatsapp_auto_message text,
  ADD COLUMN IF NOT EXISTS meta_event_name text,
  ADD COLUMN IF NOT EXISTS meta_event_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meta_event_currency text DEFAULT 'BRL';

-- ----- LEADS: tracking expandido
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS ttclid text,
  ADD COLUMN IF NOT EXISTS fbc text,
  ADD COLUMN IF NOT EXISTS fbp text,
  ADD COLUMN IF NOT EXISTS landing_url text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS ip_address text;

-- ----- ATTRIBUTION_TOUCHPOINTS: ttclid + fbc/fbp
ALTER TABLE public.attribution_touchpoints
  ADD COLUMN IF NOT EXISTS ttclid text,
  ADD COLUMN IF NOT EXISTS fbc text,
  ADD COLUMN IF NOT EXISTS fbp text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS ip_address text;

-- ----- META_ADS_CONFIGS: pixel + CAPI por usuário
ALTER TABLE public.meta_ads_configs
  ADD COLUMN IF NOT EXISTS pixel_id text,
  ADD COLUMN IF NOT EXISTS capi_access_token text,
  ADD COLUMN IF NOT EXISTS test_event_code text,
  ADD COLUMN IF NOT EXISTS capi_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pixel_enabled boolean NOT NULL DEFAULT false;

-- ============================================================
-- FUNNEL EVENTS (PR-4): instrumentação de etapa em forms/quiz
-- ============================================================
CREATE TABLE IF NOT EXISTS public.funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_type text NOT NULL, -- 'form' | 'quiz'
  source_id uuid NOT NULL,
  session_id text NOT NULL,
  event_type text NOT NULL, -- 'view' | 'start' | 'step' | 'complete' | 'abandon'
  step_index integer,
  step_label text,
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  fbclid text, gclid text, ttclid text,
  referrer text, landing_url text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.funnel_events TO authenticated;
GRANT INSERT ON public.funnel_events TO anon, authenticated;
GRANT ALL ON public.funnel_events TO service_role;

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

-- Owner can read their own funnel events
CREATE POLICY "funnel_events_owner_select" ON public.funnel_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Anon/authenticated can insert as long as user_id matches an existing form/quiz owner
CREATE POLICY "funnel_events_public_insert" ON public.funnel_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    user_id IS NOT NULL
    AND source_type IN ('form','quiz')
    AND (
      (source_type = 'form' AND EXISTS (SELECT 1 FROM public.forms f WHERE f.id = source_id AND f.user_id = funnel_events.user_id AND f.is_active = true))
      OR
      (source_type = 'quiz' AND EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = source_id AND q.user_id = funnel_events.user_id AND q.is_active = true))
    )
  );

CREATE INDEX IF NOT EXISTS idx_funnel_events_user_source ON public.funnel_events (user_id, source_type, source_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_events_session ON public.funnel_events (session_id);

-- ============================================================
-- META PIXEL EVENT LOG (PR-3): trilha p/ testador de eventos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meta_event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_type text,    -- 'form' | 'quiz' | 'manual_test'
  source_id uuid,
  event_name text NOT NULL,
  pixel_id text,
  event_id text,       -- dedupe ID
  lead_id uuid,
  status text NOT NULL DEFAULT 'pending', -- pending|sent|failed
  http_status integer,
  response jsonb DEFAULT '{}'::jsonb,
  payload jsonb DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.meta_event_log TO authenticated;
GRANT ALL ON public.meta_event_log TO service_role;

ALTER TABLE public.meta_event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_event_log_owner_select" ON public.meta_event_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_meta_event_log_user ON public.meta_event_log (user_id, created_at DESC);

-- ============================================================
-- LEAD ATTRIBUTION DEDUPE: garantir índice por (user_id, phone) e (user_id, email)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_leads_user_phone ON public.leads (user_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_user_email ON public.leads (user_id, email) WHERE email IS NOT NULL;
