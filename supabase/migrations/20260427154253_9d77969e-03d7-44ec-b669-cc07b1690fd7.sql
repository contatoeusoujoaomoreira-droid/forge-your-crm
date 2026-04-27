-- Add global toggle for AI auto-reply on WhatsApp inbound messages
ALTER TABLE public.whatsapp_configs
  ADD COLUMN IF NOT EXISTS ai_auto_reply boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_agent_id uuid;

-- Enable realtime for inbox-relevant tables
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_clients REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_state REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_clients;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_state;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;