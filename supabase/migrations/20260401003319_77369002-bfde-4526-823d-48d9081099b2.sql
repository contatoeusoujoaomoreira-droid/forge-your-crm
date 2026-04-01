
-- Add WhatsApp redirect and enhanced lead fields
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS urgency text DEFAULT 'medium';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS revenue_type text DEFAULT 'one_time';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS monthly_value numeric DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS contract_months integer DEFAULT 1;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS probability integer DEFAULT 50;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS facebook text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS linkedin text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_source text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_medium text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_campaign text;

-- Add WhatsApp redirect settings to forms and quizzes
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS whatsapp_redirect text;
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS whatsapp_message text;

ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS whatsapp_redirect text;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS whatsapp_message text;
