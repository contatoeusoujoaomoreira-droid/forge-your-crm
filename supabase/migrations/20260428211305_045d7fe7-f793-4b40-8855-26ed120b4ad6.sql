-- Ensure every current and future super admin is Enterprise + unlimited and visible in managed users

CREATE OR REPLACE FUNCTION public.sync_super_admin_entitlements()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles p
  SET plan = 'enterprise',
      credits_balance = GREATEST(COALESCE(p.credits_balance, 0), 999999),
      credits_monthly = GREATEST(COALESCE(p.credits_monthly, 0), 999999),
      updated_at = now()
  WHERE public.has_role(p.user_id, 'super_admin'::app_role);

  INSERT INTO public.managed_users (
    email,
    full_name,
    user_id,
    is_active,
    ai_credits,
    credits_balance,
    credits_monthly,
    plan,
    tier,
    permissions
  )
  SELECT
    COALESCE(pu.email, p.user_id::text),
    p.full_name,
    p.user_id,
    true,
    999999,
    999999,
    999999,
    'enterprise',
    'super_admin',
    '{"crm": true, "clients": true, "import": true, "imported": true, "analytics": true, "pages": true, "forms": true, "quiz": true, "schedules": true, "checkout": true, "automation": true, "chat": true, "settings": true, "admin": true}'::jsonb
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'super_admin'::app_role
  LEFT JOIN public.managed_users mu ON mu.user_id = p.user_id
  LEFT JOIN auth.users pu ON pu.id = p.user_id
  WHERE mu.id IS NULL;

  UPDATE public.managed_users mu
  SET plan = 'enterprise',
      tier = 'super_admin',
      ai_credits = GREATEST(COALESCE(mu.ai_credits, 0), 999999),
      credits_balance = GREATEST(COALESCE(mu.credits_balance, 0), 999999),
      credits_monthly = GREATEST(COALESCE(mu.credits_monthly, 0), 999999),
      permissions = COALESCE(mu.permissions, '{}'::jsonb) || '{"crm": true, "clients": true, "import": true, "imported": true, "analytics": true, "pages": true, "forms": true, "quiz": true, "schedules": true, "checkout": true, "automation": true, "chat": true, "settings": true, "admin": true}'::jsonb
  WHERE mu.user_id IN (SELECT user_id FROM public.user_roles WHERE role = 'super_admin'::app_role)
     OR lower(mu.email) IN ('jpm19990@gmail.com', 'miih.br97.moreira@gmail.com', 'contatoeusoujoaomoreira@gmail.com');
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_seed_super boolean;
BEGIN
  is_seed_super := NEW.email IN ('jpm19990@gmail.com', 'miih.br97.moreira@gmail.com', 'contatoeusoujoaomoreira@gmail.com');

  INSERT INTO public.profiles (user_id, full_name, plan, credits_balance, credits_monthly)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    CASE WHEN is_seed_super THEN 'enterprise' ELSE 'start' END,
    CASE WHEN is_seed_super THEN 999999 ELSE 50 END,
    CASE WHEN is_seed_super THEN 999999 ELSE 50 END
  )
  ON CONFLICT (user_id) DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        plan = CASE WHEN is_seed_super THEN 'enterprise' ELSE public.profiles.plan END,
        credits_balance = CASE WHEN is_seed_super THEN GREATEST(public.profiles.credits_balance, 999999) ELSE public.profiles.credits_balance END,
        credits_monthly = CASE WHEN is_seed_super THEN GREATEST(public.profiles.credits_monthly, 999999) ELSE public.profiles.credits_monthly END,
        updated_at = now();

  IF is_seed_super THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  UPDATE public.managed_users
  SET user_id = NEW.id,
      plan = CASE WHEN is_seed_super THEN 'enterprise' ELSE plan END,
      tier = CASE WHEN is_seed_super THEN 'super_admin' ELSE tier END,
      ai_credits = CASE WHEN is_seed_super THEN 999999 ELSE ai_credits END,
      credits_balance = CASE WHEN is_seed_super THEN 999999 ELSE credits_balance END,
      credits_monthly = CASE WHEN is_seed_super THEN 999999 ELSE credits_monthly END
  WHERE lower(email) = lower(NEW.email);

  IF EXISTS (SELECT 1 FROM public.managed_users WHERE lower(email) = lower(NEW.email)) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, CASE WHEN is_seed_super THEN 'super_admin'::app_role ELSE 'user'::app_role END)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  IF is_seed_super THEN
    PERFORM public.sync_super_admin_entitlements();
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_user_role_entitlements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.role = 'super_admin'::app_role THEN
    PERFORM public.sync_super_admin_entitlements();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_role_super_admin_entitlements ON public.user_roles;
CREATE TRIGGER on_user_role_super_admin_entitlements
AFTER INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.handle_user_role_entitlements();

-- Backfill the explicitly requested super admin email and all current super admins
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'super_admin'::app_role
FROM public.profiles p
LEFT JOIN auth.users au ON au.id = p.user_id
WHERE lower(au.email) = 'contatoeusoujoaomoreira@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

SELECT public.sync_super_admin_entitlements();