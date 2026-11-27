ALTER TABLE public.products_services ADD COLUMN IF NOT EXISTS delivery_type text NOT NULL DEFAULT 'physical';

CREATE TABLE public.member_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products_services(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  video_url text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_lessons TO authenticated;
GRANT ALL ON public.member_lessons TO service_role;
ALTER TABLE public.member_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage lessons" ON public.member_lessons FOR ALL TO authenticated
  USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE INDEX member_lessons_product_idx ON public.member_lessons (product_id, position);
CREATE INDEX member_lessons_user_idx ON public.member_lessons (user_id);

CREATE TABLE public.member_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products_services(id) ON DELETE CASCADE,
  order_id uuid,
  customer_name text,
  customer_phone text,
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, product_id)
);
GRANT SELECT, DELETE ON public.member_access TO authenticated;
GRANT ALL ON public.member_access TO service_role;
ALTER TABLE public.member_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view access" ON public.member_access FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "Owners remove access" ON public.member_access FOR DELETE TO authenticated USING (user_id = (select auth.uid()));
CREATE INDEX member_access_user_idx ON public.member_access (user_id, created_at desc);
CREATE INDEX member_access_product_idx ON public.member_access (product_id);