
-- ============== 1. Dedup chat_clients + UNIQUE ==============
-- Identifica duplicatas por (user_id, phone normalizado), mantém a mais antiga
WITH normalized AS (
  SELECT id, user_id, regexp_replace(coalesce(phone,''), '\D', '', 'g') AS nphone, created_at
  FROM public.chat_clients
  WHERE phone IS NOT NULL AND phone <> ''
),
ranked AS (
  SELECT id, user_id, nphone,
         ROW_NUMBER() OVER (PARTITION BY user_id, nphone ORDER BY created_at ASC) AS rn,
         FIRST_VALUE(id) OVER (PARTITION BY user_id, nphone ORDER BY created_at ASC) AS keeper_id
  FROM normalized
  WHERE nphone <> ''
)
UPDATE public.messages m
SET client_id = r.keeper_id
FROM ranked r
WHERE m.client_id = r.id AND r.rn > 1;

WITH normalized AS (
  SELECT id, user_id, regexp_replace(coalesce(phone,''), '\D', '', 'g') AS nphone, created_at
  FROM public.chat_clients
  WHERE phone IS NOT NULL AND phone <> ''
),
ranked AS (
  SELECT id, user_id, nphone,
         ROW_NUMBER() OVER (PARTITION BY user_id, nphone ORDER BY created_at ASC) AS rn,
         FIRST_VALUE(id) OVER (PARTITION BY user_id, nphone ORDER BY created_at ASC) AS keeper_id
  FROM normalized
  WHERE nphone <> ''
)
UPDATE public.conversation_state cs
SET client_id = r.keeper_id
FROM ranked r
WHERE cs.client_id = r.id AND r.rn > 1
  AND NOT EXISTS (
    SELECT 1 FROM public.conversation_state cs2
    WHERE cs2.client_id = r.keeper_id AND cs2.user_id = cs.user_id
  );

-- Apaga conversation_state restantes que ainda apontam para duplicatas
WITH normalized AS (
  SELECT id, user_id, regexp_replace(coalesce(phone,''), '\D', '', 'g') AS nphone, created_at
  FROM public.chat_clients
  WHERE phone IS NOT NULL AND phone <> ''
),
ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, nphone ORDER BY created_at ASC) AS rn
  FROM normalized WHERE nphone <> ''
)
DELETE FROM public.conversation_state cs
USING ranked r
WHERE cs.client_id = r.id AND r.rn > 1;

-- Migra imported_contacts.lead_id se houver dependência (não é client_id, ok)
-- Apaga as duplicatas
WITH normalized AS (
  SELECT id, user_id, regexp_replace(coalesce(phone,''), '\D', '', 'g') AS nphone, created_at
  FROM public.chat_clients
  WHERE phone IS NOT NULL AND phone <> ''
),
ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, nphone ORDER BY created_at ASC) AS rn
  FROM normalized WHERE nphone <> ''
)
DELETE FROM public.chat_clients c
USING ranked r
WHERE c.id = r.id AND r.rn > 1;

-- Normaliza phones existentes
UPDATE public.chat_clients
SET phone = regexp_replace(phone, '\D', '', 'g')
WHERE phone IS NOT NULL AND phone <> regexp_replace(phone, '\D', '', 'g');

UPDATE public.chat_clients SET phone = NULL WHERE phone = '';

-- Trigger de normalização (já existe mas garantimos)
DROP TRIGGER IF EXISTS trg_normalize_chat_phone ON public.chat_clients;
CREATE TRIGGER trg_normalize_chat_phone
BEFORE INSERT OR UPDATE ON public.chat_clients
FOR EACH ROW EXECUTE FUNCTION public.normalize_chat_phone();

-- Índice único
CREATE UNIQUE INDEX IF NOT EXISTS chat_clients_user_phone_uniq
  ON public.chat_clients(user_id, phone) WHERE phone IS NOT NULL;

-- ============== 2. credit_costs ==============
CREATE TABLE IF NOT EXISTS public.credit_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL UNIQUE,
  label text NOT NULL,
  unit text NOT NULL DEFAULT 'unit',
  credits_per_unit numeric NOT NULL DEFAULT 1,
  provider_cost_estimate numeric NOT NULL DEFAULT 0,
  markup_multiplier numeric NOT NULL DEFAULT 3,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read credit_costs"
  ON public.credit_costs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins manage credit_costs"
  ON public.credit_costs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

INSERT INTO public.credit_costs (action, label, unit, credits_per_unit, provider_cost_estimate, markup_multiplier, notes) VALUES
  ('chat_message_text', 'Mensagem de chat (texto IA)', 'msg', 1, 0.0008, 3, 'Resposta IA texto curta (~500 tokens)'),
  ('chat_message_long', 'Mensagem longa de IA', '1k_tokens_out', 2, 0.002, 3, 'Por 1k tokens de saída'),
  ('audio_transcribe', 'Transcrição de áudio', 'minute', 3, 0.006, 3, 'Whisper / Groq por minuto'),
  ('audio_tts', 'Áudio IA (TTS)', '1k_chars', 4, 0.015, 3, 'TTS OpenAI/Eleven por 1k caracteres'),
  ('image_vision', 'Interpretação de imagem', 'image', 5, 0.005, 3, 'Visão multimodal por imagem'),
  ('image_generate', 'Geração de imagem', 'image', 25, 0.04, 3, 'DALL-E / Gemini imagem'),
  ('document_parse', 'Documento processado', 'page', 2, 0.003, 3, 'Extração + interpretação por página'),
  ('page_generate', 'Landing page IA', 'page', 50, 0.08, 3, 'Geração completa de página'),
  ('form_generate', 'Formulário IA', 'form', 20, 0.03, 3, 'Geração completa de form'),
  ('quiz_generate', 'Quiz IA', 'quiz', 25, 0.04, 3, 'Geração completa de quiz'),
  ('video_generate', 'Vídeo IA', 'video', 100, 0.30, 3, 'Geração de vídeo curto')
ON CONFLICT (action) DO NOTHING;

-- ============== 3. credit_requests ==============
CREATE TABLE IF NOT EXISTS public.credit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create own credit_requests"
  ON public.credit_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own credit_requests"
  ON public.credit_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin updates credit_requests"
  ON public.credit_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ============== 4. managed_users plan/credits ==============
ALTER TABLE public.managed_users
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'start',
  ADD COLUMN IF NOT EXISTS credits_balance integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS credits_monthly integer NOT NULL DEFAULT 50;

-- ============== 5. Functions ==============

-- Desconta créditos pela action (usa credit_costs)
CREATE OR REPLACE FUNCTION public.deduct_credits_by_action(
  _user_id uuid,
  _action text,
  _quantity numeric DEFAULT 1,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cost_per numeric;
  total_credits integer;
  current_balance integer;
  is_super boolean;
BEGIN
  SELECT credits_per_unit INTO cost_per FROM public.credit_costs WHERE action = _action;
  IF cost_per IS NULL THEN cost_per := 1; END IF;

  total_credits := GREATEST(1, CEIL(cost_per * _quantity)::int);
  is_super := public.has_role(_user_id, 'super_admin');

  IF is_super THEN
    -- Super admin: registra mas não debita
    INSERT INTO public.credit_transactions (user_id, amount, kind, metadata)
    VALUES (_user_id, 0, _action, _metadata || jsonb_build_object('would_charge', total_credits, 'super_admin', true));
    RETURN jsonb_build_object('ok', true, 'charged', 0, 'would_charge', total_credits);
  END IF;

  SELECT credits_balance INTO current_balance FROM public.profiles WHERE user_id = _user_id FOR UPDATE;
  IF current_balance IS NULL OR current_balance < total_credits THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_credits', 'needed', total_credits, 'balance', coalesce(current_balance,0));
  END IF;

  UPDATE public.profiles
    SET credits_balance = credits_balance - total_credits,
        credits_used = credits_used + total_credits,
        updated_at = now()
    WHERE user_id = _user_id;

  INSERT INTO public.credit_transactions (user_id, amount, kind, metadata)
    VALUES (_user_id, -total_credits, _action, _metadata || jsonb_build_object('quantity', _quantity, 'cost_per_unit', cost_per));

  RETURN jsonb_build_object('ok', true, 'charged', total_credits);
END;
$$;

-- Aprova credit_request (apenas super admin)
CREATE OR REPLACE FUNCTION public.approve_credit_request(_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;
  SELECT * INTO req FROM public.credit_requests WHERE id = _request_id AND status = 'pending' FOR UPDATE;
  IF req IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  UPDATE public.profiles
    SET credits_balance = credits_balance + req.amount, updated_at = now()
    WHERE user_id = req.user_id;

  UPDATE public.credit_requests
    SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = _request_id;

  INSERT INTO public.credit_transactions (user_id, amount, kind, metadata)
    VALUES (req.user_id, req.amount, 'credit_request_approved', jsonb_build_object('request_id', req.id));

  RETURN jsonb_build_object('ok', true, 'amount', req.amount);
END;
$$;
