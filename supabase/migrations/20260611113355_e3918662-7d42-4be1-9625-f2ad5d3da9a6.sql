
-- ============= ONDA 2: Pipeline de áudio =============
CREATE TABLE IF NOT EXISTS public.audio_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  message_id uuid,
  conversation_id text,
  stage text NOT NULL DEFAULT 'download',
  status text NOT NULL DEFAULT 'queued',
  audio_original_url text,
  audio_response_url text,
  transcript text,
  response_text text,
  duration_ms integer,
  attempts integer NOT NULL DEFAULT 0,
  error text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audio_jobs_status ON public.audio_jobs(status, stage);
CREATE INDEX IF NOT EXISTS idx_audio_jobs_tenant ON public.audio_jobs(tenant_id, created_at DESC);
GRANT SELECT ON public.audio_jobs TO authenticated;
GRANT ALL ON public.audio_jobs TO service_role;
ALTER TABLE public.audio_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audio_jobs_owner_read" ON public.audio_jobs FOR SELECT TO authenticated USING (tenant_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- ============= ONDA 3: Circuit breaker =============
CREATE TABLE IF NOT EXISTS public.provider_circuit_state (
  provider text NOT NULL,
  model text NOT NULL DEFAULT '*',
  state text NOT NULL DEFAULT 'closed',
  consecutive_failures integer NOT NULL DEFAULT 0,
  opened_at timestamptz,
  next_retry_at timestamptz,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(provider, model)
);
GRANT SELECT ON public.provider_circuit_state TO authenticated;
GRANT ALL ON public.provider_circuit_state TO service_role;
ALTER TABLE public.provider_circuit_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "circuit_super_read" ON public.provider_circuit_state FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE OR REPLACE FUNCTION public.circuit_should_skip(_provider text, _model text DEFAULT '*')
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s record;
BEGIN
  SELECT * INTO s FROM public.provider_circuit_state WHERE provider=_provider AND (model=_model OR model='*') ORDER BY (model=_model) DESC LIMIT 1;
  IF s IS NULL THEN RETURN false; END IF;
  IF s.state='open' AND s.next_retry_at > now() THEN RETURN true; END IF;
  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION public.circuit_record_result(_provider text, _model text, _ok boolean, _error text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE failures int; new_state text;
BEGIN
  INSERT INTO public.provider_circuit_state(provider, model) VALUES(_provider, COALESCE(_model,'*'))
  ON CONFLICT (provider, model) DO NOTHING;
  IF _ok THEN
    UPDATE public.provider_circuit_state SET consecutive_failures=0, state='closed', opened_at=NULL, next_retry_at=NULL, last_error=NULL, updated_at=now()
      WHERE provider=_provider AND model=COALESCE(_model,'*');
  ELSE
    UPDATE public.provider_circuit_state
      SET consecutive_failures = consecutive_failures+1,
          state = CASE WHEN consecutive_failures+1 >= 5 THEN 'open' ELSE state END,
          opened_at = CASE WHEN consecutive_failures+1 >= 5 AND opened_at IS NULL THEN now() ELSE opened_at END,
          next_retry_at = CASE WHEN consecutive_failures+1 >= 5 THEN now() + interval '60 seconds' ELSE next_retry_at END,
          last_error = _error,
          updated_at = now()
      WHERE provider=_provider AND model=COALESCE(_model,'*');
  END IF;
END $$;

-- ============= ONDA 4: Custos, observabilidade, rate limit =============
CREATE TABLE IF NOT EXISTS public.llm_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  agent_id uuid,
  provider text NOT NULL,
  model text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  estimated_cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  duration_ms integer,
  request_id text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_llm_usage_tenant_date ON public.llm_usage(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_usage_model ON public.llm_usage(provider, model, created_at DESC);
GRANT SELECT ON public.llm_usage TO authenticated;
GRANT ALL ON public.llm_usage TO service_role;
ALTER TABLE public.llm_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "llm_usage_owner_read" ON public.llm_usage FOR SELECT TO authenticated USING (tenant_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TABLE IF NOT EXISTS public.provider_pricing (
  provider text NOT NULL,
  model text NOT NULL,
  input_per_1k numeric(10,6) NOT NULL DEFAULT 0,
  output_per_1k numeric(10,6) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(provider, model)
);
GRANT SELECT ON public.provider_pricing TO authenticated;
GRANT ALL ON public.provider_pricing TO service_role;
ALTER TABLE public.provider_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pricing_read_all" ON public.provider_pricing FOR SELECT TO authenticated USING (true);

INSERT INTO public.provider_pricing(provider, model, input_per_1k, output_per_1k) VALUES
  ('openai','gpt-4o-mini',0.00015,0.0006),
  ('openai','gpt-4o',0.0025,0.01),
  ('openai','gpt-4-turbo',0.01,0.03),
  ('anthropic','claude-3-5-haiku-20241022',0.0008,0.004),
  ('anthropic','claude-3-5-sonnet-20241022',0.003,0.015),
  ('anthropic','claude-3-opus-20240229',0.015,0.075),
  ('gemini','gemini-2.0-flash',0.0001,0.0004),
  ('gemini','gemini-1.5-pro',0.00125,0.005),
  ('groq','llama-3.3-70b-versatile',0.00059,0.00079),
  ('groq','llama-3.1-8b-instant',0.00005,0.00008),
  ('groq','mixtral-8x7b-32768',0.00024,0.00024),
  ('lovable','google/gemini-2.5-flash',0.0001,0.0004),
  ('lovable','google/gemini-2.5-flash-lite',0.00005,0.0002),
  ('lovable','google/gemini-2.5-pro',0.00125,0.005),
  ('lovable','google/gemini-3-flash-preview',0.0001,0.0004),
  ('lovable','openai/gpt-5-nano',0.0001,0.0004),
  ('lovable','openai/gpt-5-mini',0.00025,0.001),
  ('lovable','openai/gpt-5',0.0025,0.01)
ON CONFLICT (provider, model) DO NOTHING;

CREATE OR REPLACE FUNCTION public.record_llm_usage(_tenant uuid, _agent uuid, _provider text, _model text, _in_tok int, _out_tok int, _duration_ms int DEFAULT NULL, _request_id text DEFAULT NULL, _meta jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE pin numeric; pout numeric; cost numeric; _id uuid;
BEGIN
  SELECT input_per_1k, output_per_1k INTO pin, pout FROM public.provider_pricing WHERE provider=_provider AND model=_model;
  pin := COALESCE(pin,0); pout := COALESCE(pout,0);
  cost := (COALESCE(_in_tok,0)::numeric/1000)*pin + (COALESCE(_out_tok,0)::numeric/1000)*pout;
  INSERT INTO public.llm_usage(tenant_id, agent_id, provider, model, input_tokens, output_tokens, total_tokens, estimated_cost_usd, duration_ms, request_id, meta)
  VALUES(_tenant, _agent, _provider, _model, COALESCE(_in_tok,0), COALESCE(_out_tok,0), COALESCE(_in_tok,0)+COALESCE(_out_tok,0), cost, _duration_ms, _request_id, COALESCE(_meta,'{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE TABLE IF NOT EXISTS public.structured_logs (
  id bigserial PRIMARY KEY,
  tenant_id uuid,
  trace_id text,
  level text NOT NULL DEFAULT 'info',
  category text,
  message text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_logs_tenant_date ON public.structured_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_trace ON public.structured_logs(trace_id);
GRANT SELECT ON public.structured_logs TO authenticated;
GRANT ALL ON public.structured_logs TO service_role;
ALTER TABLE public.structured_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs_owner_read" ON public.structured_logs FOR SELECT TO authenticated USING (tenant_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'::app_role));

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  tenant_id uuid NOT NULL,
  scope text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY(tenant_id, scope, window_start)
);
GRANT SELECT ON public.rate_limit_buckets TO authenticated;
GRANT ALL ON public.rate_limit_buckets TO service_role;
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rl_owner_read" ON public.rate_limit_buckets FOR SELECT TO authenticated USING (tenant_id = auth.uid());

CREATE OR REPLACE FUNCTION public.check_rate_limit(_tenant uuid, _scope text, _limit int, _window_seconds int DEFAULT 60)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE bucket_start timestamptz; cur int;
BEGIN
  bucket_start := date_trunc('second', now()) - ((extract(epoch from now())::bigint % _window_seconds) || ' seconds')::interval;
  INSERT INTO public.rate_limit_buckets(tenant_id, scope, window_start, count) VALUES(_tenant, _scope, bucket_start, 1)
  ON CONFLICT (tenant_id, scope, window_start) DO UPDATE SET count = public.rate_limit_buckets.count + 1
  RETURNING count INTO cur;
  RETURN cur <= _limit;
END $$;

-- ============= ONDA 5: Auditoria =============
CREATE TABLE IF NOT EXISTS public.audit_log (
  id bigserial PRIMARY KEY,
  tenant_id uuid,
  actor_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  diff jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON public.audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_log(entity, entity_id);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_owner_read" ON public.audit_log FOR SELECT TO authenticated USING (tenant_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'::app_role));

CREATE OR REPLACE FUNCTION public.audit_trigger_fn() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _tenant uuid; _entity_id text; _diff jsonb;
BEGIN
  _tenant := COALESCE((CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END)::jsonb->>'user_id', NULL)::uuid;
  _entity_id := COALESCE((CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END)::jsonb->>'id', NULL);
  IF TG_OP='UPDATE' THEN
    _diff := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSIF TG_OP='INSERT' THEN
    _diff := jsonb_build_object('new', to_jsonb(NEW));
  ELSE
    _diff := jsonb_build_object('old', to_jsonb(OLD));
  END IF;
  INSERT INTO public.audit_log(tenant_id, actor_id, action, entity, entity_id, diff)
  VALUES (_tenant, auth.uid(), TG_OP, TG_TABLE_NAME, _entity_id, _diff);
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS audit_ai_agents ON public.ai_agents;
CREATE TRIGGER audit_ai_agents AFTER INSERT OR UPDATE OR DELETE ON public.ai_agents FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
DROP TRIGGER IF EXISTS audit_whatsapp_configs ON public.whatsapp_configs;
CREATE TRIGGER audit_whatsapp_configs AFTER INSERT OR UPDATE OR DELETE ON public.whatsapp_configs FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- Cleanup expandido
CREATE OR REPLACE FUNCTION public.cleanup_event_tables() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  DELETE FROM public.webhook_events WHERE created_at < now() - interval '30 days';
  DELETE FROM public.job_queue WHERE status='done' AND updated_at < now() - interval '7 days';
  DELETE FROM public.job_dead_letter WHERE failed_at < now() - interval '60 days';
  DELETE FROM public.conversation_locks WHERE expires_at < now() - interval '1 hour';
  DELETE FROM public.processed_messages WHERE processed_at < now() - interval '30 days';
  DELETE FROM public.structured_logs WHERE created_at < now() - interval '30 days';
  DELETE FROM public.rate_limit_buckets WHERE window_start < now() - interval '2 hours';
  DELETE FROM public.audio_jobs WHERE created_at < now() - interval '30 days' AND status IN ('done','failed');
$$;
