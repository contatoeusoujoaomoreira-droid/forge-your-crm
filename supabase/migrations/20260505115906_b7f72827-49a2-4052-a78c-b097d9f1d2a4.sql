-- Fase 2: Follow-up D0→D10 + Lead Scoring

-- 1) Steps configuráveis por agente (sobrepõe template global)
ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS followup_steps jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS followup_use_global boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS followup_stop_on_reply boolean NOT NULL DEFAULT true;

-- 2) Tabela de template global (um por workspace)
CREATE TABLE IF NOT EXISTS public.followup_global_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.followup_global_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner manage followup templates" ON public.followup_global_templates;
CREATE POLICY "Owner manage followup templates" ON public.followup_global_templates
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_followup_templates_updated
  BEFORE UPDATE ON public.followup_global_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) current_step em followup_tracking
ALTER TABLE public.followup_tracking
  ADD COLUMN IF NOT EXISTS current_step integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_message text DEFAULT NULL;

-- 4) Lead scoring em chat_clients
ALTER TABLE public.chat_clients
  ADD COLUMN IF NOT EXISTS lead_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_label text DEFAULT 'cold',
  ADD COLUMN IF NOT EXISTS last_score_at timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_clients_lead_score ON public.chat_clients(user_id, lead_score DESC);

-- 5) RPC para aplicar delta de score com label automático
CREATE OR REPLACE FUNCTION public.apply_lead_score(_client_id uuid, _delta integer, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_score int;
  new_label text;
BEGIN
  UPDATE public.chat_clients
    SET lead_score = GREATEST(0, LEAST(100, COALESCE(lead_score, 0) + _delta)),
        last_score_at = now(),
        updated_at = now()
    WHERE id = _client_id
    RETURNING lead_score INTO new_score;

  IF new_score IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'client_not_found');
  END IF;

  new_label := CASE
    WHEN new_score >= 70 THEN 'hot'
    WHEN new_score >= 40 THEN 'warm'
    WHEN new_score >= 15 THEN 'lukewarm'
    ELSE 'cold'
  END;

  UPDATE public.chat_clients SET score_label = new_label WHERE id = _client_id;
  RETURN jsonb_build_object('ok', true, 'score', new_score, 'label', new_label, 'delta', _delta, 'reason', _reason);
END;
$$;

-- 6) Seed de template global D0→D10 para usuários sem template ainda (criado on-demand pelo cron)
-- Não inserir para todos agora — função abaixo faz lazy-init
CREATE OR REPLACE FUNCTION public.ensure_followup_template(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing jsonb;
BEGIN
  SELECT steps INTO existing FROM public.followup_global_templates WHERE user_id = _user_id;
  IF existing IS NOT NULL THEN
    RETURN existing;
  END IF;

  INSERT INTO public.followup_global_templates (user_id, steps) VALUES (_user_id, jsonb_build_array(
    jsonb_build_object('day', 0, 'hours', 2, 'message', 'Oi! Vi que você estava interessado e queria saber se posso te ajudar com mais alguma informação. 😊'),
    jsonb_build_object('day', 1, 'hours', 24, 'message', 'Olá! Passando para saber se você teve tempo de pensar sobre o que conversamos. Posso esclarecer alguma dúvida?'),
    jsonb_build_object('day', 2, 'hours', 48, 'message', 'Oi de novo! Não quero ser insistente, mas queria garantir que você tenha todas as informações. O que está te impedindo de avançar?'),
    jsonb_build_object('day', 3, 'hours', 72, 'message', 'Olá! Tenho uma condição especial que pode te interessar. Posso te enviar?'),
    jsonb_build_object('day', 5, 'hours', 120, 'message', 'Oi! Sei que você está ocupado, mas separei alguns minutos pra te enviar uma proposta personalizada. Topa receber?'),
    jsonb_build_object('day', 7, 'hours', 168, 'message', 'Oi! Já faz uma semana e não quero perder contato. Você ainda tem interesse no assunto?'),
    jsonb_build_object('day', 10, 'hours', 240, 'message', 'Olá! Esse vai ser meu último contato sobre isso. Se quiser conversar a qualquer momento, é só me chamar. 👋')
  ));
  SELECT steps INTO existing FROM public.followup_global_templates WHERE user_id = _user_id;
  RETURN existing;
END;
$$;