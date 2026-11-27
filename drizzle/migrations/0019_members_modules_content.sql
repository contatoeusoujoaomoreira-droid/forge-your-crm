CREATE TABLE public.member_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products_services(id) ON DELETE CASCADE,
  title text NOT NULL,
  cover_url text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_modules TO authenticated;
GRANT ALL ON public.member_modules TO service_role;
ALTER TABLE public.member_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages modules" ON public.member_modules FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX member_modules_product_idx ON public.member_modules(product_id, position);
ALTER TABLE public.member_lessons ADD COLUMN module_id uuid REFERENCES public.member_modules(id) ON DELETE SET NULL,
  ADD COLUMN content_type text NOT NULL DEFAULT 'video',
  ADD COLUMN file_url text;
ALTER TABLE public.products_services ADD COLUMN members_external_url text;