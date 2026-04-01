CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    content text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own whatsapp templates"
    ON public.whatsapp_templates
    FOR ALL
    USING (auth.uid() = user_id);
