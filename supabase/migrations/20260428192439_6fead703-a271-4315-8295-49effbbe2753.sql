ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credits_monthly integer NOT NULL DEFAULT 50;

ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS max_message_chars integer NOT NULL DEFAULT 350;

ALTER TABLE public.prospecting_campaigns
  ADD COLUMN IF NOT EXISTS source_pipelines jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS target_pipeline_id text,
  ADD COLUMN IF NOT EXISTS target_stage_id text;

CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  member_user_id uuid,
  member_email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'attendant',
  permissions jsonb NOT NULL DEFAULT '{"chat": true, "leads": true, "campaigns": false}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, member_email)
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner manages team" ON public.team_members;
CREATE POLICY "Owner manages team" ON public.team_members
  FOR ALL TO authenticated USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Member sees own row" ON public.team_members;
CREATE POLICY "Member sees own row" ON public.team_members
  FOR SELECT TO authenticated USING (auth.uid() = member_user_id);

CREATE INDEX IF NOT EXISTS idx_team_members_owner ON public.team_members(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_member ON public.team_members(member_user_id);