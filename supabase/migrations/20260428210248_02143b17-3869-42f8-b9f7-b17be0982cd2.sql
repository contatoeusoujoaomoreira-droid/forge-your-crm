-- Per-model cost multipliers (so each provider/model debits a different amount of credits per chat message)
CREATE TABLE IF NOT EXISTS public.model_credit_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  model text NOT NULL,
  label text NOT NULL,
  credits_per_message numeric NOT NULL DEFAULT 1,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, model)
);

ALTER TABLE public.model_credit_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read model_credit_costs"
  ON public.model_credit_costs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins manage model_credit_costs"
  ON public.model_credit_costs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_model_credit_costs_updated_at
  BEFORE UPDATE ON public.model_credit_costs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default per-model costs (cheap → premium). 300%+ markup is already handled in credit_costs.markup; here we tune per model.
INSERT INTO public.model_credit_costs (provider, model, label, credits_per_message, notes) VALUES
  ('lovable',  'google/gemini-2.5-flash-lite', 'Gemini 2.5 Flash Lite', 1, 'Mais barato'),
  ('lovable',  'google/gemini-2.5-flash',      'Gemini 2.5 Flash',      1, 'Padrão recomendado'),
  ('lovable',  'google/gemini-3-flash-preview','Gemini 3 Flash',        2, 'Padrão moderno'),
  ('lovable',  'google/gemini-2.5-pro',        'Gemini 2.5 Pro',        4, 'Pro reasoning'),
  ('lovable',  'openai/gpt-5-nano',            'GPT-5 Nano',            1, ''),
  ('lovable',  'openai/gpt-5-mini',            'GPT-5 Mini',            3, ''),
  ('lovable',  'openai/gpt-5',                 'GPT-5',                 5, 'Premium'),
  ('groq',     'llama-3.1-8b-instant',         'Groq LLaMA 3.1 8B',     1, 'Muito rápido'),
  ('groq',     'llama-3.3-70b-versatile',      'Groq LLaMA 3.3 70B',    2, ''),
  ('groq',     'mixtral-8x7b-32768',           'Groq Mixtral 8x7B',     2, ''),
  ('openai',   'gpt-4o-mini',                  'OpenAI GPT-4o Mini',    2, ''),
  ('openai',   'gpt-4o',                       'OpenAI GPT-4o',         4, ''),
  ('openai',   'gpt-4-turbo',                  'OpenAI GPT-4 Turbo',    5, 'Premium'),
  ('gemini',   'gemini-2.0-flash',             'Gemini 2.0 Flash',      1, ''),
  ('gemini',   'gemini-1.5-pro',               'Gemini 1.5 Pro',        3, ''),
  ('anthropic','claude-3-5-sonnet-20241022',   'Claude 3.5 Sonnet',     4, 'Premium'),
  ('anthropic','claude-3-5-haiku-20241022',    'Claude 3.5 Haiku',      2, '')
ON CONFLICT (provider, model) DO NOTHING;

-- Update deduct_credits_by_action to support per-model multiplier passed via metadata.model_provider + metadata.model_id
CREATE OR REPLACE FUNCTION public.deduct_credits_by_action(_user_id uuid, _action text, _quantity numeric DEFAULT 1, _metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cost_per numeric;
  model_mult numeric := 1;
  total_credits integer;
  current_balance integer;
  is_super boolean;
  is_unlimited boolean;
  has_own_key boolean := false;
  m_provider text;
  m_model text;
BEGIN
  SELECT credits_per_unit INTO cost_per FROM public.credit_costs WHERE action = _action;
  IF cost_per IS NULL THEN cost_per := 1; END IF;

  m_provider := _metadata->>'model_provider';
  m_model    := _metadata->>'model_id';
  IF m_provider IS NOT NULL AND m_model IS NOT NULL THEN
    SELECT credits_per_message INTO model_mult
      FROM public.model_credit_costs
      WHERE provider = m_provider AND model = m_model AND is_active = true
      LIMIT 1;
    IF model_mult IS NULL THEN model_mult := 1; END IF;
  END IF;

  -- If user provided their own API key for this provider, charge symbolic cost (1 credit logging only)
  IF m_provider IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_api_keys
      WHERE user_id = _user_id AND provider = m_provider AND is_active = true
    ) INTO has_own_key;
  END IF;

  total_credits := GREATEST(1, CEIL(cost_per * model_mult * _quantity)::int);
  IF has_own_key THEN
    -- usuário paga ao provedor diretamente — cobramos só 1 crédito de roteamento
    total_credits := 1;
  END IF;

  is_super := public.has_role(_user_id, 'super_admin');
  SELECT (tier = 'unlimited') INTO is_unlimited FROM public.managed_users WHERE user_id = _user_id LIMIT 1;
  IF is_unlimited IS NULL THEN is_unlimited := false; END IF;

  IF is_super OR is_unlimited THEN
    INSERT INTO public.credit_transactions (user_id, amount, kind, metadata)
    VALUES (_user_id, 0, _action, _metadata || jsonb_build_object('would_charge', total_credits, 'unlimited', true, 'own_key', has_own_key));
    RETURN jsonb_build_object('ok', true, 'charged', 0, 'would_charge', total_credits, 'unlimited', true);
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
    VALUES (_user_id, -total_credits, _action, _metadata || jsonb_build_object('quantity', _quantity, 'cost_per_unit', cost_per, 'model_mult', model_mult, 'own_key', has_own_key));

  RETURN jsonb_build_object('ok', true, 'charged', total_credits, 'own_key', has_own_key);
END;
$function$;