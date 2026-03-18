-- Add tags to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Add style, settings, is_published to quizzes
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS style jsonb DEFAULT '{}';
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}';
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false;

-- Allow anon to read published quizzes
CREATE POLICY "Public can read active quizzes" ON public.quizzes FOR SELECT TO anon USING (is_active = true AND is_published = true);

-- Add pipeline_id to leads for multiple pipeline support  
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS pipeline_id text DEFAULT null;