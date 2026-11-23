ALTER TABLE public.store_settings ADD COLUMN storefront_config jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.ai_agents ADD COLUMN store_tools jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.store_orders ADD COLUMN tracking_token uuid NOT NULL DEFAULT gen_random_uuid(), ADD COLUMN payment_invoice_slug text;
CREATE UNIQUE INDEX store_orders_tracking_token_idx ON public.store_orders(tracking_token);
CREATE OR REPLACE FUNCTION public.trg_store_order_stock() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
   WHERE id = (it->>'id')::uuid AND user_id = NEW.user_id AND COALESCE(item_type,'product') <> 'service' RETURNING stock_qty INTO newbal;
  IF FOUND THEN
   INSERT INTO public.stock_movements(user_id,product_id,delta,balance_after,reason,movement_type,order_id)
   VALUES(NEW.user_id,(it->>'id')::uuid,sign*q,newbal,CASE WHEN sign < 0 THEN 'Reserva · pedido #'||NEW.order_no ELSE 'Cancelamento · pedido #'||NEW.order_no END,CASE WHEN sign < 0 THEN 'saida_venda' ELSE 'entrada_devolucao' END,NEW.id);
  END IF;
 END LOOP;
 RETURN NEW;
END $$;