ALTER TABLE public.products_services ADD COLUMN IF NOT EXISTS brand text, ADD COLUMN IF NOT EXISTS cost_price numeric;
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products_services(id) ON DELETE CASCADE,
  delta numeric NOT NULL,
  balance_after numeric,
  reason text NOT NULL DEFAULT 'ajuste',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own stock movements" ON public.stock_movements FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_stock_mov_product ON public.stock_movements(product_id, created_at DESC);