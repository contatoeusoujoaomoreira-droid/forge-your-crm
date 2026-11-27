ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE public.member_access ADD COLUMN IF NOT EXISTS customer_email text;
CREATE INDEX IF NOT EXISTS member_access_email_idx ON public.member_access (lower(customer_email));
CREATE TABLE public.member_login_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.member_login_codes TO service_role;
ALTER TABLE public.member_login_codes ENABLE ROW LEVEL SECURITY;
CREATE INDEX member_login_codes_email_idx ON public.member_login_codes (email, created_at desc);