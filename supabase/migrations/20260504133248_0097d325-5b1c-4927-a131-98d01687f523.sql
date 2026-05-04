
-- Add webhook_instance_ids array to support providers (umClique) that use a different ID for inbound webhooks vs outbound API
ALTER TABLE public.whatsapp_configs
  ADD COLUMN IF NOT EXISTS webhook_instance_ids text[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_webhook_ids ON public.whatsapp_configs USING gin (webhook_instance_ids);
