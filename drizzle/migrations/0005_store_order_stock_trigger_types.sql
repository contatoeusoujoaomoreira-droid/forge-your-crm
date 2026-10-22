CREATE OR REPLACE FUNCTION public.trg_store_order_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE it jsonb; q numeric; sign int; newbal numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'cancelado' THEN RETURN NEW; END IF;
    sign := -1;
  ELSIF NEW.status = 'cancelado' AND OLD.status IS DISTINCT FROM 'cancelado' THEN sign := 1;
  ELSIF OLD.status = 'cancelado' AND NEW.status IS DISTINCT FROM 'cancelado' THEN sign := -1;
  ELSE RETURN NEW; END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.items,'[]'::jsonb)) LOOP
    BEGIN q := COALESCE((it->>'qty')::numeric,0); EXCEPTION WHEN others THEN q := 0; END;
    IF q <= 0 OR (it->>'id') IS NULL THEN CONTINUE; END IF;
    UPDATE public.products_services SET stock_qty = stock_qty + sign*q
      WHERE id = (it->>'id')::uuid AND user_id = NEW.user_id RETURNING stock_qty INTO newbal;
    IF newbal IS NOT NULL THEN
      INSERT INTO public.stock_movements(user_id, product_id, delta, balance_after, reason, movement_type, order_id)
      VALUES (NEW.user_id, (it->>'id')::uuid, sign*q, newbal,
        CASE WHEN sign < 0 THEN 'Venda · pedido #'||NEW.order_no ELSE 'Cancelamento · pedido #'||NEW.order_no END,
        CASE WHEN sign < 0 THEN 'saida_venda' ELSE 'entrada_devolucao' END, NEW.id);
    END IF;
  END LOOP;
  RETURN NEW;
END $$;