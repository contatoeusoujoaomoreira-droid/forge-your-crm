ALTER TABLE public.conversation_flows
  ADD COLUMN IF NOT EXISTS trigger_mode text NOT NULL DEFAULT 'keyword';
COMMENT ON COLUMN public.conversation_flows.trigger_mode IS 'keyword = activate by keyword in any conversation; campaign_only = only runs when used inside a campaign; manual = only via explicit API/rule';