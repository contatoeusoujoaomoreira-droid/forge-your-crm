CREATE TABLE public.attribution_touchpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id UUID,
  client_id UUID,
  source TEXT,
  medium TEXT,
  campaign TEXT,
  content TEXT,
  term TEXT,
  ctwa_clid TEXT,
  fbclid TEXT,
  gclid TEXT,
  landing_url TEXT,
  referrer TEXT,
  channel TEXT NOT NULL DEFAULT 'web',
  conversion_value NUMERIC NOT NULL DEFAULT 0,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attribution_touchpoints TO authenticated;
GRANT INSERT ON public.attribution_touchpoints TO anon;
GRANT ALL ON public.attribution_touchpoints TO service_role;

ALTER TABLE public.attribution_touchpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own touchpoints" ON public.attribution_touchpoints
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users manage own touchpoints" ON public.attribution_touchpoints
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can create touchpoints" ON public.attribution_touchpoints
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE INDEX idx_touchpoints_user_captured ON public.attribution_touchpoints(user_id, captured_at DESC);
CREATE INDEX idx_touchpoints_campaign ON public.attribution_touchpoints(user_id, campaign);
CREATE INDEX idx_touchpoints_lead ON public.attribution_touchpoints(lead_id);