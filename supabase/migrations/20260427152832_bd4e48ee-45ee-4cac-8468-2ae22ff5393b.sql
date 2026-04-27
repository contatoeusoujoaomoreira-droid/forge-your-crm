
-- Storage bucket for agent knowledge files (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('agent-knowledge', 'agent-knowledge', false, NULL)
ON CONFLICT (id) DO UPDATE SET file_size_limit = NULL;

-- Policies: only the owner can access their files
CREATE POLICY "Users upload own knowledge files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'agent-knowledge' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users read own knowledge files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'agent-knowledge' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own knowledge files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'agent-knowledge' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Extra metadata columns for agent_knowledge
ALTER TABLE public.agent_knowledge
  ADD COLUMN IF NOT EXISTS file_path text,
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS error text;

-- Make sure the conversation_flows table can be used as agent flows: link to agent (optional)
ALTER TABLE public.conversation_flows
  ADD COLUMN IF NOT EXISTS agent_id uuid,
  ADD COLUMN IF NOT EXISTS trigger_keywords text;
