
-- ===== user_api_keys: cada usuário pode adicionar suas próprias chaves por provedor e função =====
CREATE TABLE IF NOT EXISTS public.user_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL,             -- openai, groq, gemini, anthropic, elevenlabs, deepgram, replicate
  scope text NOT NULL DEFAULT 'all',  -- all, chat, tts, stt, vision, image, video, embeddings
  label text,
  api_key text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_api_keys_user_idx ON public.user_api_keys(user_id, provider, scope);
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own user_api_keys" ON public.user_api_keys;
CREATE POLICY "Users manage own user_api_keys" ON public.user_api_keys
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins read user_api_keys" ON public.user_api_keys;
CREATE POLICY "Super admins read user_api_keys" ON public.user_api_keys
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admins write user_api_keys" ON public.user_api_keys;
CREATE POLICY "Super admins write user_api_keys" ON public.user_api_keys
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_user_api_keys_updated_at
  BEFORE UPDATE ON public.user_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Add 'unlimited' support to managed_users.tier =====
-- (just text, allows: super_admin, professional, basic, unlimited)
-- credits_balance NULL => sem cota; usaremos credits_balance = -1 ou tier='unlimited' como ilimitado.

-- ===== Update deduct function to honor tier='unlimited' & profiles.plan='unlimited' =====
CREATE OR REPLACE FUNCTION public.deduct_credits_by_action(
  _user_id uuid, _action text, _quantity numeric DEFAULT 1, _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cost_per numeric;
  total_credits integer;
  current_balance integer;
  is_super boolean;
  is_unlimited boolean;
BEGIN
  SELECT credits_per_unit INTO cost_per FROM public.credit_costs WHERE action = _action;
  IF cost_per IS NULL THEN cost_per := 1; END IF;

  total_credits := GREATEST(1, CEIL(cost_per * _quantity)::int);
  is_super := public.has_role(_user_id, 'super_admin');

  SELECT (tier = 'unlimited') INTO is_unlimited FROM public.managed_users WHERE user_id = _user_id LIMIT 1;
  IF is_unlimited IS NULL THEN is_unlimited := false; END IF;

  IF is_super OR is_unlimited THEN
    INSERT INTO public.credit_transactions (user_id, amount, kind, metadata)
    VALUES (_user_id, 0, _action, _metadata || jsonb_build_object('would_charge', total_credits, 'unlimited', true));
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
    VALUES (_user_id, -total_credits, _action, _metadata || jsonb_build_object('quantity', _quantity, 'cost_per_unit', cost_per));

  RETURN jsonb_build_object('ok', true, 'charged', total_credits);
END;
$$;

-- ===== RPC: estatísticas de consumo por usuário (super admin) =====
CREATE OR REPLACE FUNCTION public.user_usage_stats(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  total_credits integer;
  total_msgs integer;
  total_convs integer;
  total_inbound integer;
  total_outbound integer;
  by_action jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'super_admin') OR auth.uid() = _user_id) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  SELECT COALESCE(SUM(ABS(amount)), 0)::int INTO total_credits FROM public.credit_transactions WHERE user_id = _user_id AND amount < 0;
  SELECT COUNT(*)::int INTO total_msgs FROM public.messages WHERE user_id = _user_id;
  SELECT COUNT(DISTINCT client_id)::int INTO total_convs FROM public.messages WHERE user_id = _user_id AND client_id IS NOT NULL;
  SELECT COUNT(*)::int INTO total_inbound FROM public.messages WHERE user_id = _user_id AND direction = 'inbound';
  SELECT COUNT(*)::int INTO total_outbound FROM public.messages WHERE user_id = _user_id AND direction = 'outbound';

  SELECT COALESCE(jsonb_object_agg(kind, c), '{}'::jsonb) INTO by_action FROM (
    SELECT kind, COUNT(*)::int AS c FROM public.credit_transactions WHERE user_id = _user_id GROUP BY kind
  ) t;

  RETURN jsonb_build_object(
    'credits_consumed', total_credits,
    'total_messages', total_msgs,
    'conversations', total_convs,
    'inbound', total_inbound,
    'outbound', total_outbound,
    'by_action', by_action
  );
END;
$$;
