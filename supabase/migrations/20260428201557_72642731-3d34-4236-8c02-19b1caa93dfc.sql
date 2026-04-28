-- Add new role tiers to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'professional';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'basic';

-- Add tier column to managed_users so super admin can pick a hierarchy
ALTER TABLE public.managed_users
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'basic';

-- Plan tier check: allowed values
ALTER TABLE public.managed_users
  DROP CONSTRAINT IF EXISTS managed_users_tier_check;
ALTER TABLE public.managed_users
  ADD CONSTRAINT managed_users_tier_check CHECK (tier IN ('super_admin','professional','basic'));

-- Allowed plans constraint (start, pro, business, enterprise)
ALTER TABLE public.managed_users
  DROP CONSTRAINT IF EXISTS managed_users_plan_check;
ALTER TABLE public.managed_users
  ADD CONSTRAINT managed_users_plan_check CHECK (plan IN ('start','pro','business','enterprise','trial','custom'));