
-- Forms table
CREATE TABLE public.forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL DEFAULT auth.uid(),
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_published BOOLEAN NOT NULL DEFAULT false,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  style JSONB NOT NULL DEFAULT '{}'::jsonb,
  pipeline_id TEXT,
  stage_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Form responses
CREATE TABLE public.form_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id),
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Schedules / Appointments system
CREATE TABLE public.schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL DEFAULT auth.uid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_published BOOLEAN NOT NULL DEFAULT false,
  available_days JSONB NOT NULL DEFAULT '[1,2,3,4,5]'::jsonb,
  available_hours JSONB NOT NULL DEFAULT '{"start":"09:00","end":"18:00"}'::jsonb,
  style JSONB NOT NULL DEFAULT '{}'::jsonb,
  pipeline_id TEXT,
  stage_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Schedule appointments
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID REFERENCES public.schedules(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id),
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_phone TEXT,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Checkout / Orders system
CREATE TABLE public.checkouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL DEFAULT auth.uid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_published BOOLEAN NOT NULL DEFAULT false,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  whatsapp_number TEXT,
  style JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Checkout orders
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checkout_id UUID REFERENCES public.checkouts(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Forms policies
CREATE POLICY "Users manage own forms" ON public.forms FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public can read active forms" ON public.forms FOR SELECT TO anon USING (is_active = true AND is_published = true);

-- Form responses policies
CREATE POLICY "Users read own form responses" ON public.form_responses FOR SELECT TO authenticated USING (form_id IN (SELECT id FROM public.forms WHERE user_id = auth.uid()));
CREATE POLICY "Anyone can submit form responses" ON public.form_responses FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Schedules policies
CREATE POLICY "Users manage own schedules" ON public.schedules FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public can read active schedules" ON public.schedules FOR SELECT TO anon USING (is_active = true AND is_published = true);

-- Appointments policies
CREATE POLICY "Users read own appointments" ON public.appointments FOR SELECT TO authenticated USING (schedule_id IN (SELECT id FROM public.schedules WHERE user_id = auth.uid()));
CREATE POLICY "Anyone can create appointments" ON public.appointments FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Checkouts policies
CREATE POLICY "Users manage own checkouts" ON public.checkouts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public can read active checkouts" ON public.checkouts FOR SELECT TO anon USING (is_active = true AND is_published = true);

-- Orders policies
CREATE POLICY "Users read own orders" ON public.orders FOR SELECT TO authenticated USING (checkout_id IN (SELECT id FROM public.checkouts WHERE user_id = auth.uid()));
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);
