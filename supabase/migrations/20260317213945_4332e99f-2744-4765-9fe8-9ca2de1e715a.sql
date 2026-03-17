
-- Landing Pages table
CREATE TABLE public.landing_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  slug text NOT NULL,
  is_published boolean NOT NULL DEFAULT false,
  meta_title text,
  meta_description text,
  pixel_meta_id text,
  pixel_google_id text,
  custom_css text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own landing pages"
ON public.landing_pages FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Landing Page Sections table
CREATE TABLE public.landing_page_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id uuid NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
  section_type text NOT NULL,
  "order" integer NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_page_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage sections of their own pages"
ON public.landing_page_sections FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.landing_pages lp WHERE lp.id = page_id AND lp.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.landing_pages lp WHERE lp.id = page_id AND lp.user_id = auth.uid()));

-- Page Views table
CREATE TABLE public.page_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id uuid NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
  visitor_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view analytics of their own pages"
ON public.page_views FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.landing_pages lp WHERE lp.id = page_id AND lp.user_id = auth.uid()));

CREATE POLICY "Anyone can insert page views"
ON public.page_views FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Quizzes table
CREATE TABLE public.quizzes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  description text,
  slug text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own quizzes"
ON public.quizzes FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Quiz Responses table
CREATE TABLE public.quiz_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view responses of their own quizzes"
ON public.quiz_responses FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND q.user_id = auth.uid()));

CREATE POLICY "Anyone can submit quiz responses"
ON public.quiz_responses FOR INSERT TO anon, authenticated
WITH CHECK (true);
