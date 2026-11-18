CREATE TABLE public.external_tool_credentials (tool_id uuid PRIMARY KEY REFERENCES public.external_tools(id) ON DELETE CASCADE, headers jsonb NOT NULL DEFAULT '{}'::jsonb);
GRANT ALL ON public.external_tool_credentials TO service_role;
ALTER TABLE public.external_tool_credentials ENABLE ROW LEVEL SECURITY;
INSERT INTO public.external_tool_credentials(tool_id, headers) SELECT id, headers FROM public.external_tools WHERE headers IS NOT NULL AND headers <> '{}'::jsonb;
UPDATE public.external_tools SET headers='{}'::jsonb WHERE id IN (SELECT tool_id FROM public.external_tool_credentials);
ALTER TABLE public.external_tools ADD COLUMN IF NOT EXISTS auth_type text NOT NULL DEFAULT 'api_key';
ALTER TABLE public.external_tools ADD COLUMN IF NOT EXISTS auth_header text NOT NULL DEFAULT 'x-api-key';
ALTER TABLE public.external_tools ADD COLUMN IF NOT EXISTS credential_configured boolean NOT NULL DEFAULT false;
UPDATE public.external_tools SET credential_configured=true WHERE id IN (SELECT tool_id FROM public.external_tool_credentials);