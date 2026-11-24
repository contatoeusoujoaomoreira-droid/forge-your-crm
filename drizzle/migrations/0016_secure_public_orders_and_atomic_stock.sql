CREATE OR REPLACE FUNCTION public.valid_public_checkout_order(_checkout uuid, _items jsonb, _total numeric, _discount numeric, _coupon text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.checkouts%ROWTYPE; cp public.coupons%ROWTYPE; line jsonb; item jsonb; qty numeric; price numeric; subtotal numeric:=0; expected_discount numeric:=0; seen text[]:=ARRAY[]::text[]; bump_used boolean:=false;
BEGIN
 SELECT * INTO c FROM public.checkouts WHERE id=_checkout AND is_active AND is_published;
 IF NOT FOUND OR jsonb_typeof(_items) IS DISTINCT FROM 'array' OR jsonb_array_length(_items) NOT BETWEEN 1 AND 100 THEN RETURN false; END IF;
 FOR line IN SELECT value FROM jsonb_array_elements(_items) LOOP
  qty:=(line->>'quantity')::numeric;
  IF qty IS NULL OR qty<>trunc(qty) OR qty NOT BETWEEN 1 AND 10000 THEN RETURN false; END IF;
  SELECT value INTO item FROM jsonb_array_elements(c.items) WHERE value->>'id'=line->>'id' LIMIT 1;
  IF item IS NULL THEN
   item:=c.style->'orderBump';
   IF bump_used OR item IS NULL OR item->>'name' IS DISTINCT FROM line->>'name' OR qty<>1 THEN RETURN false; END IF;
   bump_used:=true;
  ELSE
   IF line->>'id'=ANY(seen) THEN RETURN false; END IF;
   seen:=array_append(seen,line->>'id');
  END IF;
  price:=(item->>'price')::numeric;
  IF price IS NULL OR price<0 OR line->>'name' IS DISTINCT FROM item->>'name' OR (line->>'price')::numeric IS DISTINCT FROM price OR (line->>'subtotal')::numeric IS DISTINCT FROM price*qty THEN RETURN false; END IF;
  subtotal:=subtotal+price*qty;
 END LOOP;
 IF NULLIF(_coupon,'') IS NOT NULL THEN
  SELECT * INTO cp FROM public.coupons WHERE upper(code)=upper(_coupon) AND user_id=c.user_id AND is_active AND (checkout_id IS NULL OR checkout_id=c.id) AND (expires_at IS NULL OR expires_at>now()) LIMIT 1;
  IF NOT FOUND THEN RETURN false; END IF;
  expected_discount:=CASE WHEN cp.discount_type='percentage' THEN subtotal*cp.discount_value/100 ELSE least(cp.discount_value,subtotal) END;
 END IF;
 RETURN _discount IS NOT NULL AND _total IS NOT NULL AND _total>=0 AND round(_discount,2)=round(expected_discount,2) AND round(_total,2)=round(subtotal-expected_discount,2);
EXCEPTION WHEN others THEN RETURN false;
END $$;
REVOKE ALL ON FUNCTION public.valid_public_checkout_order(uuid,jsonb,numeric,numeric,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.valid_public_checkout_order(uuid,jsonb,numeric,numeric,text) TO anon,authenticated,service_role;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Public submits validated checkout orders" ON public.orders FOR INSERT TO anon,authenticated WITH CHECK (status='pending' AND lead_id IS NULL AND char_length(trim(customer_name)) BETWEEN 1 AND 100 AND coalesce(char_length(customer_email),0)<=254 AND coalesce(char_length(customer_phone),0)<=30 AND coalesce(char_length(notes),0)<=2000 AND public.valid_public_checkout_order(checkout_id,items,total,discount_amount,coupon_code));
GRANT INSERT ON public.orders TO anon,authenticated;
GRANT ALL ON public.orders TO service_role;
DROP POLICY IF EXISTS "public creates order on published store" ON public.store_orders;
REVOKE INSERT ON public.store_orders FROM anon;
GRANT ALL ON public.store_orders TO service_role;
CREATE OR REPLACE FUNCTION public.trg_store_order_stock() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE it jsonb; q numeric; direction integer; newbal numeric; lines jsonb;
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.status='cancelado' THEN RETURN NEW; END IF;
  direction:=-1; lines:=NEW.items;
 ELSIF NEW.status='cancelado' AND OLD.status IS DISTINCT FROM 'cancelado' THEN direction:=1; lines:=OLD.items;
 ELSIF OLD.status='cancelado' AND NEW.status IS DISTINCT FROM 'cancelado' THEN direction:=-1; lines:=NEW.items;
 ELSE
  IF NEW.items IS DISTINCT FROM OLD.items OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN RAISE EXCEPTION 'Não altere os itens de um pedido reservado. Cancele e crie um novo pedido.'; END IF;
  RETURN NEW;
 END IF;
 FOR it IN SELECT value FROM jsonb_array_elements(coalesce(lines,'[]'::jsonb)) ORDER BY value->>'id' LOOP
  q:=(it->>'qty')::numeric;
  IF q IS NULL OR q<=0 OR q<>trunc(q) THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
  IF EXISTS(SELECT 1 FROM public.products_services WHERE id=(it->>'id')::uuid AND user_id=NEW.user_id AND item_type='service') THEN
   IF q<>1 THEN RAISE EXCEPTION 'Cada serviço pode ser contratado uma vez por pedido.'; END IF;
   CONTINUE;
  END IF;
  UPDATE public.products_services SET stock_qty=stock_qty+direction*q WHERE id=(it->>'id')::uuid AND user_id=NEW.user_id AND (direction=1 OR stock_qty>=q) RETURNING stock_qty INTO newbal;
  IF NOT FOUND THEN RAISE EXCEPTION 'Estoque insuficiente ou item indisponível'; END IF;
  INSERT INTO public.stock_movements(user_id,product_id,delta,balance_after,reason,movement_type,order_id) VALUES(NEW.user_id,(it->>'id')::uuid,direction*q,newbal,CASE WHEN direction<0 THEN 'Reserva · pedido #'||NEW.order_no ELSE 'Cancelamento · pedido #'||NEW.order_no END,CASE WHEN direction<0 THEN 'saida_venda' ELSE 'entrada_devolucao' END,NEW.id);
 END LOOP;
 RETURN NEW;
END $$;