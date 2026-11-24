import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkInfinitePayPayment } from '../../supabase/functions/_shared/infinitepay';

afterEach(()=>vi.unstubAllGlobals());
describe('confirmação segura InfinitePay',()=>{
  const transaction={order_nsu:'pedido',transaction_nsu:'transacao',slug:'fatura'};
  it('só confirma o valor do pedido em centavos',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({success:true,paid:true,amount:1990}))));
    expect(await checkInfinitePayPayment('loja',transaction,19.90)).toBe(true);
    expect(await checkInfinitePayPayment('loja',transaction,20)).toBe(false);
  });
  it('exige transação e fatura para consultar',async()=>{
    const request=vi.fn();vi.stubGlobal('fetch',request);
    expect(await checkInfinitePayPayment('loja',{order_nsu:'pedido'},19.90)).toBe(false);
    expect(request).not.toHaveBeenCalled();
  });
  it('não confirma pagamento pendente',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({success:true,paid:false,amount:1990}))));
    expect(await checkInfinitePayPayment('loja',transaction,19.90)).toBe(false);
  });
});