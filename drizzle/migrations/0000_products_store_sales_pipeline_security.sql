-- Products: novos campos de estoque/atacado
ALTER TABLE public.products_services
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'un',
  ADD COLUMN IF NOT EXISTS stock_qty numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_stock_threshold numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wholesale_price numeric,
  ADD COLUMN IF NOT EXISTS wholesale_min_qty numeric,
  ADD COLUMN IF NOT EXISTS show_in_catalog boolean NOT NULL DEFAULT true;
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_user_sku ON public.products_services(user_id, sku) WHERE sku IS NOT NULL;

-- Loja / catálogo
CREATE TABLE IF NOT EXISTS public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  store_name text NOT NULL DEFAULT 'Minha Loja',
  whatsapp text,
  logo_url text,
  primary_color text DEFAULT '#84cc16',
  welcome_text text,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages store" ON public.store_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public reads published stores" ON public.store_settings FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE TRIGGER trg_store_settings_updated BEFORE UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Produtos visíveis publicamente apenas em lojas publicadas
GRANT SELECT ON public.products_services TO anon;
CREATE POLICY "Public reads catalog products" ON public.products_services FOR SELECT TO anon, authenticated
  USING (is_active = true AND show_in_catalog = true AND EXISTS (SELECT 1 FROM public.store_settings s WHERE s.user_id = products_services.user_id AND s.is_published = true));

-- Funil de vendas pronto
CREATE OR REPLACE FUNCTION public.create_sales_pipeline(_name text DEFAULT 'Funil de Vendas')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pid uuid; _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.pipelines(user_id, name) VALUES (_uid, _name) RETURNING id INTO _pid;
  INSERT INTO public.pipeline_stages(user_id, pipeline_id, name, position, color) VALUES
    (_uid,_pid,'Novo Pedido / Cotação',0,'#84cc16'),
    (_uid,_pid,'Em Negociação',1,'#3b82f6'),
    (_uid,_pid,'Aguardando Pagamento',2,'#f59e0b'),
    (_uid,_pid,'Separação no Estoque',3,'#8b5cf6'),
    (_uid,_pid,'Saiu para Entrega',4,'#06b6d4'),
    (_uid,_pid,'Concluído / Entregue',5,'#10b981');
  RETURN _pid;
END $$;
REVOKE EXECUTE ON FUNCTION public.create_sales_pipeline(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_sales_pipeline(text) TO authenticated;

-- Segurança: tabelas de custos
DROP POLICY IF EXISTS "pricing_read_all" ON public.provider_pricing;
CREATE POLICY "Super admins read pricing" ON public.provider_pricing FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'super_admin'));
DROP POLICY IF EXISTS "Authenticated read model_credit_costs" ON public.model_credit_costs;
CREATE POLICY "Authenticated read active model costs" ON public.model_credit_costs FOR SELECT TO authenticated USING (is_active = true);
DROP POLICY IF EXISTS "Authenticated read credit_costs" ON public.credit_costs;
CREATE OR REPLACE FUNCTION public.get_credit_cost(_action text)
RETURNS TABLE(credits_per_unit numeric, label text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.credits_per_unit::numeric, c.label FROM public.credit_costs c WHERE c.action = _action AND auth.uid() IS NOT NULL LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.get_credit_cost(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_credit_cost(text) TO authenticated;