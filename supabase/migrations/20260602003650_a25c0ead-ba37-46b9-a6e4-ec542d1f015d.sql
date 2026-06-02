-- Platform alerts table
CREATE TABLE IF NOT EXISTS public.platform_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT NOT NULL DEFAULT 'info',
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_id UUID,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_alerts TO authenticated;
GRANT ALL ON public.platform_alerts TO service_role;

ALTER TABLE public.platform_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage platform_alerts"
ON public.platform_alerts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_platform_alerts_created ON public.platform_alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_alerts_level ON public.platform_alerts (level, resolved);

-- Health snapshot RPC (super_admin only)
CREATE OR REPLACE FUNCTION public.platform_health_snapshot()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  db_size BIGINT;
  conn_count INT;
  conn_max INT;
  deadlocks BIGINT;
  rolled_back BIGINT;
  total_users INT;
  active_users_24h INT;
  total_msgs_24h INT;
  total_inbound_24h INT;
  total_outbound_24h INT;
  total_leads_24h INT;
  total_credits_24h INT;
  top_msgs JSONB;
  top_credits JSONB;
  recent_alerts JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  SELECT pg_database_size(current_database()) INTO db_size;
  SELECT count(*) INTO conn_count FROM pg_stat_activity;
  SELECT setting::int INTO conn_max FROM pg_settings WHERE name = 'max_connections';
  SELECT COALESCE(SUM(deadlocks), 0), COALESCE(SUM(xact_rollback), 0)
    INTO deadlocks, rolled_back
    FROM pg_stat_database WHERE datname = current_database();

  SELECT count(*)::int INTO total_users FROM public.profiles;
  SELECT count(DISTINCT user_id)::int INTO active_users_24h
    FROM public.messages WHERE created_at >= now() - interval '24 hours';
  SELECT count(*)::int INTO total_msgs_24h FROM public.messages WHERE created_at >= now() - interval '24 hours';
  SELECT count(*)::int INTO total_inbound_24h FROM public.messages WHERE direction = 'inbound' AND created_at >= now() - interval '24 hours';
  SELECT count(*)::int INTO total_outbound_24h FROM public.messages WHERE direction = 'outbound' AND created_at >= now() - interval '24 hours';
  SELECT count(*)::int INTO total_leads_24h FROM public.leads WHERE created_at >= now() - interval '24 hours';
  SELECT COALESCE(SUM(ABS(amount)), 0)::int INTO total_credits_24h
    FROM public.credit_transactions WHERE amount < 0 AND created_at >= now() - interval '24 hours';

  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO top_msgs FROM (
    SELECT m.user_id, count(*)::int AS messages,
           (SELECT email FROM public.managed_users mu WHERE mu.user_id = m.user_id LIMIT 1) AS email
    FROM public.messages m
    WHERE m.created_at >= now() - interval '24 hours'
    GROUP BY m.user_id
    ORDER BY count(*) DESC
    LIMIT 10
  ) t;

  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO top_credits FROM (
    SELECT ct.user_id, SUM(ABS(ct.amount))::int AS credits,
           (SELECT email FROM public.managed_users mu WHERE mu.user_id = ct.user_id LIMIT 1) AS email
    FROM public.credit_transactions ct
    WHERE ct.amount < 0 AND ct.created_at >= now() - interval '24 hours'
    GROUP BY ct.user_id
    ORDER BY SUM(ABS(ct.amount)) DESC
    LIMIT 10
  ) t;

  SELECT COALESCE(jsonb_agg(t ORDER BY created_at DESC), '[]'::jsonb) INTO recent_alerts FROM (
    SELECT id, level, category, title, message, created_at, resolved
    FROM public.platform_alerts
    WHERE created_at >= now() - interval '24 hours'
    ORDER BY created_at DESC
    LIMIT 20
  ) t;

  RETURN jsonb_build_object(
    'db_size_mb', round((db_size / 1024.0 / 1024.0)::numeric, 1),
    'connections', conn_count,
    'connections_max', conn_max,
    'connections_pct', round((conn_count::numeric / NULLIF(conn_max, 0) * 100)::numeric, 1),
    'deadlocks', deadlocks,
    'rolled_back', rolled_back,
    'total_users', total_users,
    'active_users_24h', active_users_24h,
    'messages_24h', total_msgs_24h,
    'inbound_24h', total_inbound_24h,
    'outbound_24h', total_outbound_24h,
    'leads_24h', total_leads_24h,
    'credits_24h', total_credits_24h,
    'top_msgs', top_msgs,
    'top_credits', top_credits,
    'recent_alerts', recent_alerts,
    'snapshot_at', now()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.platform_health_snapshot() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.platform_health_snapshot() TO authenticated;