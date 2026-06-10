-- ONDA 1: Event-driven foundation
-- 1. webhook_events (raw event log + idempotency)
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  provider text NOT NULL,
  event_id text,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'received',
  attempts int NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_provider_event_uq
  ON public.webhook_events(provider, event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS webhook_events_status_idx ON public.webhook_events(status, created_at);
CREATE INDEX IF NOT EXISTS webhook_events_tenant_idx ON public.webhook_events(tenant_id, created_at DESC);
GRANT SELECT ON public.webhook_events TO authenticated;
GRANT ALL ON public.webhook_events TO service_role;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant read own webhook_events" ON public.webhook_events
  FOR SELECT TO authenticated USING (tenant_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));

-- 2. job_queue
CREATE TABLE IF NOT EXISTS public.job_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued',
  priority int NOT NULL DEFAULT 5,
  run_at timestamptz NOT NULL DEFAULT now(),
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  last_error text,
  locked_by text,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS job_queue_dispatch_idx
  ON public.job_queue(status, run_at) WHERE status IN ('queued','failed');
CREATE INDEX IF NOT EXISTS job_queue_kind_idx ON public.job_queue(kind, status);
CREATE INDEX IF NOT EXISTS job_queue_tenant_idx ON public.job_queue(tenant_id, created_at DESC);
GRANT SELECT ON public.job_queue TO authenticated;
GRANT ALL ON public.job_queue TO service_role;
ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant read own jobs" ON public.job_queue
  FOR SELECT TO authenticated USING (tenant_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));

-- 3. job_dead_letter
CREATE TABLE IF NOT EXISTS public.job_dead_letter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_job_id uuid,
  tenant_id uuid,
  kind text NOT NULL,
  payload jsonb,
  attempts int,
  last_error text,
  reason text,
  failed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS job_dlq_tenant_idx ON public.job_dead_letter(tenant_id, failed_at DESC);
GRANT SELECT ON public.job_dead_letter TO authenticated;
GRANT ALL ON public.job_dead_letter TO service_role;
ALTER TABLE public.job_dead_letter ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant read own dlq" ON public.job_dead_letter
  FOR SELECT TO authenticated USING (tenant_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));

-- 4. conversation_locks
CREATE TABLE IF NOT EXISTS public.conversation_locks (
  conversation_id text PRIMARY KEY,
  tenant_id uuid,
  locked_by text NOT NULL,
  locked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
GRANT ALL ON public.conversation_locks TO service_role;
ALTER TABLE public.conversation_locks ENABLE ROW LEVEL SECURITY;

-- 5. processed_messages (idempotency at message level)
CREATE TABLE IF NOT EXISTS public.processed_messages (
  provider text NOT NULL,
  message_id text NOT NULL,
  tenant_id uuid,
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, message_id)
);
GRANT ALL ON public.processed_messages TO service_role;
ALTER TABLE public.processed_messages ENABLE ROW LEVEL SECURITY;

-- 6. Helper: enqueue job
CREATE OR REPLACE FUNCTION public.enqueue_job(
  _kind text, _payload jsonb DEFAULT '{}'::jsonb,
  _tenant uuid DEFAULT NULL, _run_at timestamptz DEFAULT now(),
  _priority int DEFAULT 5, _max_attempts int DEFAULT 5
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.job_queue(tenant_id, kind, payload, run_at, priority, max_attempts)
  VALUES (_tenant, _kind, COALESCE(_payload,'{}'::jsonb), _run_at, _priority, _max_attempts)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- 7. Helper: claim next batch (FOR UPDATE SKIP LOCKED)
CREATE OR REPLACE FUNCTION public.claim_jobs(_worker text, _limit int DEFAULT 10)
RETURNS SETOF public.job_queue
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH cte AS (
    SELECT id FROM public.job_queue
     WHERE status IN ('queued','failed') AND run_at <= now()
     ORDER BY priority ASC, run_at ASC
     LIMIT _limit
     FOR UPDATE SKIP LOCKED
  )
  UPDATE public.job_queue j
     SET status='running', locked_by=_worker, locked_at=now(), attempts=attempts+1, updated_at=now()
    FROM cte WHERE j.id=cte.id
   RETURNING j.*;
END;
$$;

-- 8. Helper: complete/fail job with exponential backoff
CREATE OR REPLACE FUNCTION public.complete_job(_id uuid, _ok boolean, _error text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE j record; delay_secs int;
BEGIN
  SELECT * INTO j FROM public.job_queue WHERE id=_id;
  IF j IS NULL THEN RETURN; END IF;
  IF _ok THEN
    UPDATE public.job_queue SET status='done', last_error=NULL, updated_at=now() WHERE id=_id;
    RETURN;
  END IF;
  IF j.attempts >= j.max_attempts THEN
    INSERT INTO public.job_dead_letter(original_job_id, tenant_id, kind, payload, attempts, last_error, reason)
    VALUES (j.id, j.tenant_id, j.kind, j.payload, j.attempts, _error, 'max_attempts');
    UPDATE public.job_queue SET status='dlq', last_error=_error, updated_at=now() WHERE id=_id;
    RETURN;
  END IF;
  delay_secs := CASE j.attempts WHEN 1 THEN 30 WHEN 2 THEN 120 WHEN 3 THEN 600 ELSE 1800 END;
  UPDATE public.job_queue
     SET status='queued', last_error=_error, run_at=now() + (delay_secs || ' seconds')::interval, updated_at=now(),
         locked_by=NULL, locked_at=NULL
   WHERE id=_id;
END;
$$;

-- 9. Helper: try conversation lock
CREATE OR REPLACE FUNCTION public.try_conversation_lock(_conv text, _tenant uuid, _worker text, _ttl_seconds int DEFAULT 120)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM public.conversation_locks WHERE conversation_id=_conv AND expires_at < now();
  BEGIN
    INSERT INTO public.conversation_locks(conversation_id, tenant_id, locked_by, expires_at)
    VALUES (_conv, _tenant, _worker, now() + (_ttl_seconds || ' seconds')::interval);
    RETURN true;
  EXCEPTION WHEN unique_violation THEN RETURN false;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_conversation_lock(_conv text, _worker text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.conversation_locks WHERE conversation_id=_conv AND locked_by=_worker;
$$;

-- 10. Cleanup cron (retention)
CREATE OR REPLACE FUNCTION public.cleanup_event_tables()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.webhook_events WHERE created_at < now() - interval '30 days';
  DELETE FROM public.job_queue WHERE status='done' AND updated_at < now() - interval '7 days';
  DELETE FROM public.job_dead_letter WHERE failed_at < now() - interval '60 days';
  DELETE FROM public.conversation_locks WHERE expires_at < now() - interval '1 hour';
  DELETE FROM public.processed_messages WHERE processed_at < now() - interval '30 days';
$$;