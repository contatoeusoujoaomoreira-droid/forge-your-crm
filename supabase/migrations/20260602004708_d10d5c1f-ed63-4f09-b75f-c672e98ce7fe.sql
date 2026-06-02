CREATE OR REPLACE FUNCTION public.platform_health_snapshot()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_db_size BIGINT;
  v_conn_count INT;
  v_conn_max INT;
  v_deadlocks BIGINT;
  v_rolled_back BIGINT;
  v_total_users INT;
  v_active_users_24h INT;
  v_total_msgs_24h INT;
  v_total_inbound_24h INT;
  v_total_outbound_24h INT;
  v_total_leads_24h INT;
  v_total_credits_24h INT;
  v_top_msgs JSONB;
  v_top_credits JSONB;
  v_recent_alerts JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  SELECT pg_database_size(current_database()) INTO v_db_size;
  SELECT count(*) INTO v_conn_count FROM pg_stat_activity;
  SELECT setting::int INTO v_conn_max FROM pg_settings WHERE name = 'max_connections';
  SELECT COALESCE(SUM(d.deadlocks), 0), COALESCE(SUM(d.xact_rollback), 0)
    INTO v_deadlocks, v_rolled_back
    FROM pg_stat_database d WHERE d.datname = current_database();

  SELECT count(*)::int INTO v_total_users FROM public.profiles;
  SELECT count(DISTINCT user_id)::int INTO v_active_users_24h
    FROM public.messages WHERE created_at >= now() - interval '24 hours';
  SELECT count(*)::int INTO v_total_msgs_24h FROM public.messages WHERE created_at >= now() - interval '24 hours';
  SELECT count(*)::int INTO v_total_inbound_24h FROM public.messages WHERE direction = 'inbound' AND created_at >= now() - interval '24 hours';
  SELECT count(*)::int INTO v_total_outbound_24h FROM public.messages WHERE direction = 'outbound' AND created_at >= now() - interval '24 hours';
  SELECT count(*)::int INTO v_total_leads_24h FROM public.leads WHERE created_at >= now() - interval '24 hours';
  SELECT COALESCE(SUM(ABS(amount)), 0)::int INTO v_total_credits_24h
    FROM public.credit_transactions WHERE amount < 0 AND created_at >= now() - interval '24 hours';

  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v_top_msgs FROM (
    SELECT m.user_id, count(*)::int AS messages,
           (SELECT email FROM public.managed_users mu WHERE mu.user_id = m.user_id LIMIT 1) AS email
    FROM public.messages m
    WHERE m.created_at >= now() - interval '24 hours'
    GROUP BY m.user_id
    ORDER BY count(*) DESC
    LIMIT 10
  ) t;

  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v_top_credits FROM (
    SELECT ct.user_id, SUM(ABS(ct.amount))::int AS credits,
           (SELECT email FROM public.managed_users mu WHERE mu.user_id = ct.user_id LIMIT 1) AS email
    FROM public.credit_transactions ct
    WHERE ct.amount < 0 AND ct.created_at >= now() - interval '24 hours'
    GROUP BY ct.user_id
    ORDER BY SUM(ABS(ct.amount)) DESC
    LIMIT 10
  ) t;

  SELECT COALESCE(jsonb_agg(t ORDER BY t.created_at DESC), '[]'::jsonb) INTO v_recent_alerts FROM (
    SELECT id, level, category, title, message, created_at, resolved
    FROM public.platform_alerts
    WHERE created_at >= now() - interval '24 hours'
    ORDER BY created_at DESC
    LIMIT 20
  ) t;

  RETURN jsonb_build_object(
    'db_size_mb', round((v_db_size / 1024.0 / 1024.0)::numeric, 1),
    'connections', v_conn_count,
    'connections_max', v_conn_max,
    'connections_pct', round((v_conn_count::numeric / NULLIF(v_conn_max, 0) * 100)::numeric, 1),
    'deadlocks', v_deadlocks,
    'rolled_back', v_rolled_back,
    'total_users', v_total_users,
    'active_users_24h', v_active_users_24h,
    'messages_24h', v_total_msgs_24h,
    'inbound_24h', v_total_inbound_24h,
    'outbound_24h', v_total_outbound_24h,
    'leads_24h', v_total_leads_24h,
    'credits_consumed_24h', v_total_credits_24h,
    'top_msgs', v_top_msgs,
    'top_credits', v_top_credits,
    'recent_alerts', v_recent_alerts,
    'generated_at', now()
  );
END;
$$;