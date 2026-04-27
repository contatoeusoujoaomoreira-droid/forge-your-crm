
-- =============================================
-- AUTOMATION + CHAT MODULES — Full Schema
-- =============================================

-- ====== chat_clients (lightweight contact registry for chat) ======
CREATE TABLE public.chat_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT,
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  lead_id UUID,
  tags TEXT[] DEFAULT '{}',
  source TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_clients_user ON public.chat_clients(user_id);
CREATE INDEX idx_chat_clients_phone ON public.chat_clients(user_id, phone);
ALTER TABLE public.chat_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own chat_clients" ON public.chat_clients FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service can insert chat_clients" ON public.chat_clients FOR INSERT TO anon WITH CHECK (true);

-- ====== whatsapp_configs ======
CREATE TABLE public.whatsapp_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  api_type TEXT NOT NULL DEFAULT 'z-api',
  base_url TEXT,
  api_token TEXT,
  instance_id TEXT,
  extra_headers JSONB DEFAULT '{}'::jsonb,
  default_pipeline_id TEXT,
  default_stage_id TEXT,
  auto_create_lead BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own whatsapp_configs" ON public.whatsapp_configs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ====== api_keys (for webhook receiver auth) ======
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  label TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_preview TEXT,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own api_keys" ON public.api_keys FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ====== ai_provider_configs ======
CREATE TABLE public.ai_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  provider TEXT NOT NULL DEFAULT 'lovable',
  label TEXT NOT NULL,
  api_key_encrypted TEXT,
  default_model TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_provider_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ai_provider_configs" ON public.ai_provider_configs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ====== ai_agents ======
CREATE TABLE public.ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'atendimento',
  personality TEXT,
  tone TEXT DEFAULT 'profissional',
  style TEXT,
  system_prompt TEXT NOT NULL DEFAULT '',
  ai_provider_config_id UUID,
  model TEXT DEFAULT 'google/gemini-3-flash-preview',
  max_tokens INTEGER DEFAULT 1024,
  response_delay_seconds INTEGER DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ai_agents" ON public.ai_agents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ====== agent_knowledge ======
CREATE TABLE public.agent_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  agent_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  title TEXT,
  content TEXT NOT NULL,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_knowledge_agent ON public.agent_knowledge(agent_id);
ALTER TABLE public.agent_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own agent_knowledge" ON public.agent_knowledge FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ====== conversation_flows ======
CREATE TABLE public.conversation_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  description TEXT,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.conversation_flows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own conversation_flows" ON public.conversation_flows FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ====== conversation_flow_sessions ======
CREATE TABLE public.conversation_flow_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID NOT NULL,
  flow_id UUID NOT NULL,
  current_node_id TEXT,
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_flow_sessions_client ON public.conversation_flow_sessions(client_id);
ALTER TABLE public.conversation_flow_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own flow_sessions" ON public.conversation_flow_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ====== prospecting_campaigns ======
CREATE TABLE public.prospecting_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  description TEXT,
  agent_id UUID,
  flow_id UUID,
  pipeline_id TEXT,
  stage_id TEXT,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  message_template TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'one_shot',
  daily_limit INTEGER DEFAULT 100,
  delay_min_seconds INTEGER DEFAULT 30,
  delay_max_seconds INTEGER DEFAULT 120,
  business_hours JSONB DEFAULT '{"start":"09:00","end":"18:00","days":[1,2,3,4,5]}'::jsonb,
  follow_up_enabled BOOLEAN DEFAULT false,
  follow_up_delay_hours INTEGER DEFAULT 24,
  max_follow_ups INTEGER DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'draft',
  total_sent INTEGER DEFAULT 0,
  total_replied INTEGER DEFAULT 0,
  total_converted INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.prospecting_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own prospecting_campaigns" ON public.prospecting_campaigns FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ====== campaign_contacts ======
CREATE TABLE public.campaign_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  campaign_id UUID NOT NULL,
  client_id UUID,
  lead_id UUID,
  name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  follow_ups_sent INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_campaign_contacts_campaign ON public.campaign_contacts(campaign_id, status);
ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own campaign_contacts" ON public.campaign_contacts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ====== messages ======
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID,
  lead_id UUID,
  campaign_id UUID,
  agent_id UUID,
  direction TEXT NOT NULL DEFAULT 'inbound',
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  content TEXT,
  media_url TEXT,
  media_type TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  external_message_id TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_internal_note BOOLEAN NOT NULL DEFAULT false,
  sender_phone TEXT,
  sender_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_client ON public.messages(client_id, created_at DESC);
CREATE INDEX idx_messages_user ON public.messages(user_id, created_at DESC);
CREATE INDEX idx_messages_external ON public.messages(external_message_id) WHERE external_message_id IS NOT NULL;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own messages" ON public.messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own messages" ON public.messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service can insert messages" ON public.messages FOR INSERT TO anon WITH CHECK (true);

-- ====== chat_automations ======
CREATE TABLE public.chat_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_value JSONB DEFAULT '{}'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_triggered INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own chat_automations" ON public.chat_automations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ====== conversation_state ======
CREATE TABLE public.conversation_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID NOT NULL UNIQUE,
  ai_active BOOLEAN NOT NULL DEFAULT true,
  mode TEXT NOT NULL DEFAULT 'ai',
  assigned_agent_id UUID,
  assigned_user_id UUID,
  last_human_reply_at TIMESTAMPTZ,
  pinned BOOLEAN NOT NULL DEFAULT false,
  marked_unread BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.conversation_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own conversation_state" ON public.conversation_state FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service can manage conversation_state" ON public.conversation_state FOR INSERT TO anon WITH CHECK (true);

-- ====== quick_replies ======
CREATE TABLE public.quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  shortcut TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own quick_replies" ON public.quick_replies FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ====== webhook_logs ======
CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  direction TEXT NOT NULL DEFAULT 'inbound',
  event TEXT,
  source TEXT,
  payload JSONB,
  status_code INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_webhook_logs_user ON public.webhook_logs(user_id, created_at DESC);
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own webhook_logs" ON public.webhook_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service inserts webhook_logs" ON public.webhook_logs FOR INSERT TO anon WITH CHECK (true);

-- ====== Triggers para updated_at ======
CREATE TRIGGER trg_whatsapp_configs_updated BEFORE UPDATE ON public.whatsapp_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_chat_clients_updated BEFORE UPDATE ON public.chat_clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ai_agents_updated BEFORE UPDATE ON public.ai_agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_conv_flows_updated BEFORE UPDATE ON public.conversation_flows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_flow_sessions_updated BEFORE UPDATE ON public.conversation_flow_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_prosp_campaigns_updated BEFORE UPDATE ON public.prospecting_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_chat_automations_updated BEFORE UPDATE ON public.chat_automations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_conv_state_updated BEFORE UPDATE ON public.conversation_state FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ====== Realtime ======
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_state REPLICA IDENTITY FULL;
ALTER TABLE public.chat_clients REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_clients;

-- ====== Storage bucket for chat media ======
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read chat-media" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'chat-media');
CREATE POLICY "Authenticated can upload chat-media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-media');
CREATE POLICY "Authenticated can update chat-media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'chat-media');
CREATE POLICY "Authenticated can delete chat-media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'chat-media');
CREATE POLICY "Service can upload chat-media" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'chat-media');
