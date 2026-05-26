
ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS respond_in_groups boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS disable_on_human_takeover boolean NOT NULL DEFAULT true;

ALTER TABLE public.managed_users
  ADD COLUMN IF NOT EXISTS max_whatsapp_instances integer NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_messages_external_id ON public.messages (user_id, external_message_id) WHERE external_message_id IS NOT NULL;
