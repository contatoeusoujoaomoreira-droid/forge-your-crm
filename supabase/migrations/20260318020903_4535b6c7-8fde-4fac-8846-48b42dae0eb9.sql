
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS: super admins can manage all roles
CREATE POLICY "Super admins can manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Users can read their own role
CREATE POLICY "Users can read own role"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Managed users table for admin-created accounts
CREATE TABLE public.managed_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text,
  is_active boolean NOT NULL DEFAULT true,
  ai_credits integer NOT NULL DEFAULT 100,
  permissions jsonb NOT NULL DEFAULT '{"pages": true, "forms": true, "quiz": true, "crm": true, "checkout": true, "schedules": true, "analytics": true}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.managed_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage users"
ON public.managed_users FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can read own managed record"
ON public.managed_users FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Assign super_admin to existing users with specified emails
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM auth.users
WHERE email IN ('jpm19990@gmail.com', 'miih.br97.moreira@gmail.com', 'contatoeusoujoaomoreira@gmail.com')
ON CONFLICT DO NOTHING;

-- Update handle_new_user to also assign roles and link managed_users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- Auto-assign super_admin role for specific emails
  IF NEW.email IN ('jpm19990@gmail.com', 'miih.br97.moreira@gmail.com', 'contatoeusoujoaomoreira@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  -- Link managed_users if pre-created by admin
  UPDATE public.managed_users SET user_id = NEW.id WHERE email = NEW.email;
  
  -- If user exists in managed_users, assign 'user' role
  IF EXISTS (SELECT 1 FROM public.managed_users WHERE email = NEW.email) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;
