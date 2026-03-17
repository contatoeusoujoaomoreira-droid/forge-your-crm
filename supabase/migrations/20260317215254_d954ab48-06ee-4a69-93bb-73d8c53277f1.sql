
ALTER TABLE public.landing_pages 
ADD COLUMN IF NOT EXISTS html_content text,
ADD COLUMN IF NOT EXISTS custom_domain text;
