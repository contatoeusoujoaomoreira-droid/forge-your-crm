
-- =========================================================
-- FORMS & QUIZ REFACTOR — Phase 1 (Infrastructure)
-- =========================================================

-- 1. Additive columns on forms / quizzes
ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS pixel_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS post_submit  jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS owner_alert  jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS pixel_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS post_submit  jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS owner_alert  jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Lead source isolation + archive flag
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS source_form_id uuid REFERENCES public.forms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_quiz_id uuid REFERENCES public.quizzes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived       boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_leads_source_form_id ON public.leads(source_form_id) WHERE source_form_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_source_quiz_id ON public.leads(source_quiz_id) WHERE source_quiz_id IS NOT NULL;

-- 3. form_submissions (timeline)
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  utm_source text, utm_medium text, utm_campaign text, utm_term text, utm_content text,
  referrer text, landing_url text, user_agent text, ip_address text,
  device_type text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_submissions TO authenticated;
GRANT INSERT ON public.form_submissions TO anon;
GRANT ALL ON public.form_submissions TO service_role;

ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own form submissions" ON public.form_submissions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can insert form submissions" ON public.form_submissions
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON public.form_submissions(form_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_lead_id ON public.form_submissions(lead_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_user_id ON public.form_submissions(user_id, submitted_at DESC);

-- 4. quiz_submissions (timeline)
CREATE TABLE IF NOT EXISTS public.quiz_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  score numeric,
  result_label text,
  utm_source text, utm_medium text, utm_campaign text, utm_term text, utm_content text,
  referrer text, landing_url text, user_agent text, ip_address text,
  device_type text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_submissions TO authenticated;
GRANT INSERT ON public.quiz_submissions TO anon;
GRANT ALL ON public.quiz_submissions TO service_role;

ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own quiz submissions" ON public.quiz_submissions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can insert quiz submissions" ON public.quiz_submissions
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_quiz_submissions_quiz_id ON public.quiz_submissions(quiz_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_lead_id ON public.quiz_submissions(lead_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_user_id ON public.quiz_submissions(user_id, submitted_at DESC);

-- 5. form_kanban_columns
CREATE TABLE IF NOT EXISTS public.form_kanban_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#84cc16',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_kanban_columns TO authenticated;
GRANT ALL ON public.form_kanban_columns TO service_role;

ALTER TABLE public.form_kanban_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own form kanban columns" ON public.form_kanban_columns
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_form_kanban_columns_form_id ON public.form_kanban_columns(form_id, position);

-- 6. quiz_kanban_columns
CREATE TABLE IF NOT EXISTS public.quiz_kanban_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#84cc16',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_kanban_columns TO authenticated;
GRANT ALL ON public.quiz_kanban_columns TO service_role;

ALTER TABLE public.quiz_kanban_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own quiz kanban columns" ON public.quiz_kanban_columns
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_quiz_kanban_columns_quiz_id ON public.quiz_kanban_columns(quiz_id, position);

-- 7. Touch triggers
CREATE TRIGGER trg_form_kanban_columns_touch
  BEFORE UPDATE ON public.form_kanban_columns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_quiz_kanban_columns_touch
  BEFORE UPDATE ON public.quiz_kanban_columns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Default Kanban columns when a form / quiz is created
CREATE OR REPLACE FUNCTION public.create_default_form_kanban()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.form_kanban_columns (user_id, form_id, name, color, position) VALUES
    (NEW.user_id, NEW.id, 'Novo Lead',   '#84cc16', 0),
    (NEW.user_id, NEW.id, 'Em Contato',  '#3b82f6', 1),
    (NEW.user_id, NEW.id, 'Qualificado', '#f59e0b', 2),
    (NEW.user_id, NEW.id, 'Convertido',  '#10b981', 3),
    (NEW.user_id, NEW.id, 'Descartado',  '#ef4444', 4);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.create_default_quiz_kanban()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.quiz_kanban_columns (user_id, quiz_id, name, color, position) VALUES
    (NEW.user_id, NEW.id, 'Novo Lead',   '#84cc16', 0),
    (NEW.user_id, NEW.id, 'Em Contato',  '#3b82f6', 1),
    (NEW.user_id, NEW.id, 'Qualificado', '#f59e0b', 2),
    (NEW.user_id, NEW.id, 'Convertido',  '#10b981', 3),
    (NEW.user_id, NEW.id, 'Descartado',  '#ef4444', 4);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_create_default_form_kanban ON public.forms;
CREATE TRIGGER trg_create_default_form_kanban
  AFTER INSERT ON public.forms
  FOR EACH ROW EXECUTE FUNCTION public.create_default_form_kanban();

DROP TRIGGER IF EXISTS trg_create_default_quiz_kanban ON public.quizzes;
CREATE TRIGGER trg_create_default_quiz_kanban
  AFTER INSERT ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.create_default_quiz_kanban();

-- Seed default columns for existing forms / quizzes that don't have any yet
INSERT INTO public.form_kanban_columns (user_id, form_id, name, color, position)
SELECT f.user_id, f.id, c.name, c.color, c.pos
FROM public.forms f
CROSS JOIN (VALUES
  ('Novo Lead',   '#84cc16', 0),
  ('Em Contato',  '#3b82f6', 1),
  ('Qualificado', '#f59e0b', 2),
  ('Convertido',  '#10b981', 3),
  ('Descartado',  '#ef4444', 4)
) AS c(name, color, pos)
WHERE NOT EXISTS (SELECT 1 FROM public.form_kanban_columns k WHERE k.form_id = f.id);

INSERT INTO public.quiz_kanban_columns (user_id, quiz_id, name, color, position)
SELECT q.user_id, q.id, c.name, c.color, c.pos
FROM public.quizzes q
CROSS JOIN (VALUES
  ('Novo Lead',   '#84cc16', 0),
  ('Em Contato',  '#3b82f6', 1),
  ('Qualificado', '#f59e0b', 2),
  ('Convertido',  '#10b981', 3),
  ('Descartado',  '#ef4444', 4)
) AS c(name, color, pos)
WHERE NOT EXISTS (SELECT 1 FROM public.quiz_kanban_columns k WHERE k.quiz_id = q.id);

-- 9. Backfill submissions from existing responses
INSERT INTO public.form_submissions (user_id, form_id, lead_id, payload, submitted_at, created_at)
SELECT f.user_id, fr.form_id, fr.lead_id, COALESCE(fr.responses, '{}'::jsonb), COALESCE(fr.completed_at, now()), COALESCE(fr.completed_at, now())
FROM public.form_responses fr
JOIN public.forms f ON f.id = fr.form_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.form_submissions s
  WHERE s.form_id = fr.form_id
    AND COALESCE(s.lead_id::text,'') = COALESCE(fr.lead_id::text,'')
    AND s.submitted_at = COALESCE(fr.completed_at, s.submitted_at)
);

INSERT INTO public.quiz_submissions (user_id, quiz_id, lead_id, payload, score, submitted_at, created_at)
SELECT q.user_id, qr.quiz_id, qr.lead_id, COALESCE(qr.responses, '{}'::jsonb),
       NULLIF((qr.responses->>'_score'), '')::numeric,
       COALESCE(qr.completed_at, now()), COALESCE(qr.completed_at, now())
FROM public.quiz_responses qr
JOIN public.quizzes q ON q.id = qr.quiz_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.quiz_submissions s
  WHERE s.quiz_id = qr.quiz_id
    AND COALESCE(s.lead_id::text,'') = COALESCE(qr.lead_id::text,'')
    AND s.submitted_at = COALESCE(qr.completed_at, s.submitted_at)
);
