-- 1. Add voice + audio capabilities to ai_agents
ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS voice_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS voice_provider text NOT NULL DEFAULT 'openai',
  ADD COLUMN IF NOT EXISTS voice_id text DEFAULT 'alloy',
  ADD COLUMN IF NOT EXISTS reply_to_audio_with_audio boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS transcribe_audio boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS understand_images boolean NOT NULL DEFAULT true;

-- 2. Add label/name to whatsapp_configs to distinguish multiple connections per user
ALTER TABLE public.whatsapp_configs
  ADD COLUMN IF NOT EXISTS label text;

-- Drop the implicit single-config constraint if any (none in schema so just allow many)
-- Add helpful index
CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_user_active ON public.whatsapp_configs(user_id, is_active);

-- 3. Ensure dedup unique index for messages by external_message_id
CREATE UNIQUE INDEX IF NOT EXISTS messages_user_external_unique
  ON public.messages(user_id, external_message_id)
  WHERE external_message_id IS NOT NULL;

-- 4. Ensure unique chat client per (user, phone)
CREATE UNIQUE INDEX IF NOT EXISTS chat_clients_user_phone_unique
  ON public.chat_clients(user_id, phone)
  WHERE phone IS NOT NULL;