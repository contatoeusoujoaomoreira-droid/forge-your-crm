ALTER TABLE public.store_orders
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS customer_type text NOT NULL DEFAULT 'varejo',
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'loja',
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS movement_type text NOT NULL DEFAULT 'ajuste',
  ADD COLUMN IF NOT EXISTS unit_cost numeric,
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS order_id uuid;
CREATE OR REPLACE FUNCTION public.trg_store_order_history()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_history := COALESCE(OLD.status_history,'[]'::jsonb) || jsonb_build_array(jsonb_build_object('from', OLD.status, 'to', NEW.status, 'at', now(), 'by', auth.uid()));
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_store_order_history BEFORE UPDATE ON public.store_orders FOR EACH ROW EXECUTE FUNCTION public.trg_store_order_history();