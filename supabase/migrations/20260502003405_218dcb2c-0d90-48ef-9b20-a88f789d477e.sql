-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 1. Debounce queue: agrupa mensagens recebidas em sequência
CREATE TABLE IF NOT EXISTS public.message_debounce_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL,
  agent_id uuid,
  buffered_messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  process_after timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending|processing|done|failed
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_debounce_pending ON public.message_debounce_queue (status, process_after) WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS idx_debounce_one_per_client ON public.message_debounce_queue (client_id) WHERE status = 'pending';
ALTER TABLE public.message_debounce_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own debounce" ON public.message_debounce_queue FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Add debounce_seconds e busy_listen options to ai_agents (idempotente)
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS debounce_seconds int NOT NULL DEFAULT 8;
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS group_messages boolean NOT NULL DEFAULT true;

-- 2. Follow-up tracking por client/agent
CREATE TABLE IF NOT EXISTS public.followup_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  attempts_sent int NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  next_attempt_at timestamptz,
  status text NOT NULL DEFAULT 'idle', -- idle|scheduled|completed|stopped
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, agent_id)
);
ALTER TABLE public.followup_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own followup" ON public.followup_tracking FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 3. Reminder tracking nos appointments (evitar enviar 2x)
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS reminder_pin text;

-- 4. Coluna para handoff timer
ALTER TABLE public.conversation_state ADD COLUMN IF NOT EXISTS handoff_resume_at timestamptz;

-- 5. last_interaction_at em chat_clients (para anti-vácuo)
ALTER TABLE public.chat_clients ADD COLUMN IF NOT EXISTS last_inbound_at timestamptz;
ALTER TABLE public.chat_clients ADD COLUMN IF NOT EXISTS last_outbound_at timestamptz;

-- 6. Função: reativar handoff após o timer expirar
CREATE OR REPLACE FUNCTION public.resume_expired_handoffs()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE n int;
BEGIN
  WITH upd AS (
    UPDATE public.conversation_state cs
    SET ai_active = true, mode = 'ai', handoff_resume_at = NULL, updated_at = now()
    WHERE cs.handoff_resume_at IS NOT NULL
      AND cs.handoff_resume_at <= now()
      AND cs.mode = 'manual'
    RETURNING cs.id
  ) SELECT count(*) INTO n FROM upd;
  RETURN n;
END;
$$;

-- 7. Função: agendar handoff resume baseado no agent (chamada pelo backend ao inserir mensagem manual)
CREATE OR REPLACE FUNCTION public.schedule_handoff_resume(_client_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  cs record; ag record; minutes int;
BEGIN
  SELECT * INTO cs FROM conversation_state WHERE client_id = _client_id;
  IF cs IS NULL THEN RETURN; END IF;
  SELECT * INTO ag FROM ai_agents WHERE id = cs.assigned_agent_id;
  IF ag IS NULL THEN RETURN; END IF;
  IF ag.handoff_mode = 'permanent' THEN
    UPDATE conversation_state SET handoff_resume_at = NULL WHERE id = cs.id;
    RETURN;
  END IF;
  minutes := COALESCE(ag.handoff_pause_minutes, 30);
  UPDATE conversation_state SET handoff_resume_at = now() + (minutes || ' minutes')::interval WHERE id = cs.id;
END;
$$;

-- 8. Cron: a cada minuto chamar o cron-worker
DO $$
DECLARE proj_url text := 'https://jdsomjwynxetccrcdszt.supabase.co/functions/v1/cron-worker';
BEGIN
  PERFORM cron.unschedule('omni-cron-worker') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'omni-cron-worker');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'omni-cron-worker',
  '* * * * *',
  $$ SELECT net.http_post(
       url := 'https://jdsomjwynxetccrcdszt.supabase.co/functions/v1/cron-worker',
       headers := '{"Content-Type":"application/json"}'::jsonb,
       body := jsonb_build_object('triggered_at', now())
     ); $$
);

-- 9. Trigger: ao mover lead, disparar stage_triggers em tempo real (já cobre Radar da Equipe)
CREATE OR REPLACE FUNCTION public.notify_stage_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
    PERFORM net.http_post(
      url := 'https://jdsomjwynxetccrcdszt.supabase.co/functions/v1/cron-worker',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := jsonb_build_object(
        'event', 'stage_change',
        'lead_id', NEW.id,
        'user_id', NEW.user_id,
        'old_stage_id', OLD.stage_id,
        'new_stage_id', NEW.stage_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lead_stage_change ON public.leads;
CREATE TRIGGER trg_lead_stage_change
AFTER UPDATE OF stage_id ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.notify_stage_change();