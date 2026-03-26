
-- Phase 1: Complete database expansion

-- 1. Pipelines table
CREATE TABLE public.pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own pipelines" ON public.pipelines FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Add pipeline_id to pipeline_stages
ALTER TABLE public.pipeline_stages ADD COLUMN IF NOT EXISTS pipeline_id uuid REFERENCES public.pipelines(id) ON DELETE CASCADE;

-- 3. Coupons table
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  code text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric NOT NULL DEFAULT 0,
  max_uses integer DEFAULT NULL,
  used_count integer NOT NULL DEFAULT 0,
  checkout_id uuid REFERENCES public.checkouts(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamp with time zone DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own coupons" ON public.coupons FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anon can read active coupons" ON public.coupons FOR SELECT TO anon USING (is_active = true);

-- 4. Expand schedules
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS buffer_minutes integer NOT NULL DEFAULT 0;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS blocked_dates jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Sao_Paulo';
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS allow_cancellation boolean NOT NULL DEFAULT false;

-- 5. Expand appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cancellation_token text DEFAULT NULL;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone DEFAULT NULL;

-- 6. Expand orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code text DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;

-- 7. Expand forms
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS webhook_url text DEFAULT NULL;
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS notification_email text DEFAULT NULL;

-- 8. Expand quizzes
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS pipeline_id text DEFAULT NULL;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS stage_id text DEFAULT NULL;

-- 9. Allow updating appointments (for cancellation)
CREATE POLICY "Users can update own appointments" ON public.appointments FOR UPDATE TO authenticated USING (schedule_id IN (SELECT id FROM schedules WHERE user_id = auth.uid()));

-- 10. Allow anon to update appointments (for cancellation by guest)
CREATE POLICY "Anon can cancel appointments" ON public.appointments FOR UPDATE TO anon USING (cancellation_token IS NOT NULL) WITH CHECK (true);

-- 11. Allow updating orders (for status management)
CREATE POLICY "Users can update own orders" ON public.orders FOR UPDATE TO authenticated USING (checkout_id IN (SELECT id FROM checkouts WHERE user_id = auth.uid()));
