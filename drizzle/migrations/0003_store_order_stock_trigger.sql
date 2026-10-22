CREATE OR REPLACE FUNCTION public.trg_store_order_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE it jsonb; q numeric; sign int; newbal numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN sign := -1;
  ELSIF NEW.status = 'cancelado' AND OLD.status IS DISTINCT FROM 'cancelado' THEN sign := 1;
  ELSIF OLD.status = 'cancelado' AND NEW.status IS DISTINCT FROM 'cancelado' THEN sign := -1;
  ELSE RETURN NEW; END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.items,'[]'::jsonb)) LOOP
    BEGIN q := COALESCE((it->>'qty')::numeric,0); EXCEPTION WHEN others THEN q := 0; END;
    IF q <= 0 OR (it->>'id') IS NULL THEN CONTINUE; END IF;
    UPDATE public.products_services SET stock_qty = stock_qty + sign*q
      WHERE id = (it->>'id')::uuid AND user_id = NEW.user_id RETURNING stock_qty INTO newbal;
    IF newbal IS NOT NULL THEN
      INSERT INTO public.stock_movements(user_id, product_id, delta, balance_after, reason)
      VALUES (NEW.user_id, (it->>'id')::uuid, sign*q, newbal,
        CASE WHEN sign < 0 THEN 'pedido #'||NEW.order_no ELSE 'cancelado #'||NEW.order_no END);
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_store_order_stock_ins AFTER INSERT ON public.store_orders FOR EACH ROW EXECUTE FUNCTION public.trg_store_order_stock();
CREATE TRIGGER trg_store_order_stock_upd AFTER UPDATE OF status ON public.store_orders FOR EACH ROW EXECUTE FUNCTION public.trg_store_order_stock();