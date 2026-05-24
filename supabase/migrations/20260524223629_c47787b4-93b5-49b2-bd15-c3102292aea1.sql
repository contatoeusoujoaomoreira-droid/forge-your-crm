DROP TABLE IF EXISTS public.landing_page_sections CASCADE;
DROP TABLE IF EXISTS public.page_views CASCADE;
DROP TABLE IF EXISTS public.landing_pages CASCADE;

DELETE FROM public.whatsapp_configs WHERE api_type IN ('evolution','evolution_go','botconversa','ultramsg','custom');