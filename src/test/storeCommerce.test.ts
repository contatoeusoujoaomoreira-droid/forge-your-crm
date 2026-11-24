import { describe, expect, it } from 'vitest';
import { allowedStoreTools, isPaid, publicOrder, validatedOrderLines } from '../../supabase/functions/_shared/storeCommerce';
import { validateStoreImage } from '@/lib/storeAppearance';
const product = { id:'p', name:'Produto', price:20, stock_qty:5, item_type:'product' };
const service = { id:'s', name:'Serviço', price:100, stock_qty:0, item_type:'service' };
describe('regras da loja', () => {
  it('aceita upload WEBP', () => expect(validateStoreImage({ type:'image/webp', size:1000 })).toBeNull());
  it('recusa imagem SVG', () => expect(validateStoreImage({ type:'image/svg+xml', size:1000 })).not.toBeNull());
  it('limita imagens a 5 MB', () => {expect(validateStoreImage({type:'image/webp',size:5*1024*1024})).toBeNull();expect(validateStoreImage({type:'image/webp',size:5*1024*1024+1})).not.toBeNull();});
  it('serviço não depende de estoque', () => expect(validatedOrderLines([service],[{id:'s',qty:1}])[0].unit_price).toBe(100));
  it('serviço não pode ser multiplicado', () => expect(() => validatedOrderLines([service],[{id:'s',qty:2}])).toThrow());
  it('preço do pedido vem do catálogo', () => expect(validatedOrderLines([product],[{id:'p',qty:2,unit_price:1}])[0].unit_price).toBe(20));
  it('impede quantidade maior que estoque', () => expect(() => validatedOrderLines([product],[{id:'p',qty:6}])).toThrow());
  it('reconhece confirmação InfinitePay e manual', () => { expect(isPaid('paid')).toBe(true); expect(isPaid('pago')).toBe(true); expect(isPaid('pendente')).toBe(false); });
  it('catálogo não autoriza registrar vendas', () => expect(allowedStoreTools({catalog:true})).not.toContain('registrar_pedido'));
  it('agente sem autorização não acessa loja', () => expect(allowedStoreTools()).toEqual([]));
  it('acompanhamento não expõe dados do cliente', () => expect(publicOrder({customer_phone:'55119',address:'privado',payment_status:'paid',status_history:[] })).not.toHaveProperty('address'));
});