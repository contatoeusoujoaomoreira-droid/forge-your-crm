-- Agent multimedia/typing/recording flags
ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS split_long_messages boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS simulate_typing boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS simulate_recording boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS multimedia_provider_config_id uuid;

-- Plans + credits on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'start',
  ADD COLUMN IF NOT EXISTS credits_balance integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS credits_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan_renewed_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS team_seats integer NOT NULL DEFAULT 1;

-- Credit transactions ledger
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  kind text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own credit_transactions" ON public.credit_transactions;
CREATE POLICY "Users read own credit_transactions" ON public.credit_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service can insert credit_transactions" ON public.credit_transactions;
CREATE POLICY "Service can insert credit_transactions" ON public.credit_transactions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Imported lists + contacts
CREATE TABLE IF NOT EXISTS public.imported_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  list_type text NOT NULL DEFAULT 'leads',
  tag text,
  total_contacts integer NOT NULL DEFAULT 0,
  total_converted integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.imported_lists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own imported_lists" ON public.imported_lists;
CREATE POLICY "Users manage own imported_lists" ON public.imported_lists
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.imported_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  phone text,
  email text,
  name text,
  status text NOT NULL DEFAULT 'pending',
  lead_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.imported_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own imported_contacts" ON public.imported_contacts;
CREATE POLICY "Users manage own imported_contacts" ON public.imported_contacts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_imported_contacts_list ON public.imported_contacts(list_id);
CREATE INDEX IF NOT EXISTS idx_imported_contacts_phone ON public.imported_contacts(user_id, phone);

-- Helper: deduct credits atomically
CREATE OR REPLACE FUNCTION public.deduct_credits(_user_id uuid, _amount integer, _kind text, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance integer;
BEGIN
  SELECT credits_balance INTO current_balance FROM public.profiles WHERE user_id = _user_id FOR UPDATE;
  IF current_balance IS NULL THEN RETURN false; END IF;
  IF current_balance < _amount THEN RETURN false; END IF;
  UPDATE public.profiles
    SET credits_balance = credits_balance - _amount,
        credits_used = credits_used + _amount,
        updated_at = now()
    WHERE user_id = _user_id;
  INSERT INTO public.credit_transactions (user_id, amount, kind, metadata)
    VALUES (_user_id, -_amount, _kind, _metadata);
  RETURN true;
END;
$$;