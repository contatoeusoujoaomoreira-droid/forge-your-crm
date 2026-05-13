ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS hierarchy text NOT NULL DEFAULT 'attendant';

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE INDEX IF NOT EXISTS idx_team_members_hierarchy ON public.team_members(hierarchy);