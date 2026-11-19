import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createInfinitePayLink, checkInfinitePayPayment, cleanHandle } from '../_shared/infinitepay.ts';

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const UUID = /^[0-9a-f-]{36}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const action = new URL(req.url).searchParams.get('action') || 'create';
  const body = await req.json().catch(() => ({}));

  if (action === 'test') {
    const handle = cleanHandle(String(body.handle || ''));
    if (!handle) return json({ ok: false, message: 'Digite sua InfiniteTag.' });
    const r = await fetch('https://api.checkout.infinitepay.io/links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handle, items: [{ quantity: 1, price: 100, description: 'Teste de conexão' }], order_nsu: 'teste-' + Date.now() }) });
    const txt = await r.text();
    if (r.ok) return json({ ok: true, message: 'Conexão ativa! Sua loja está pronta para receber pagamentos.' });
    if (/not enabled/i.test(txt)) return json({ ok: false, message: 'Não conectou. Confira se a InfiniteTag está igual ao app (sem o $) e se o Checkout online está ativado na InfinitePay.' });
    return json({ ok: false, message: 'InfiniteTag não encontrada. Confira se digitou igual ao app (sem o $).' });
  }

  if (action === 'webhook') {
    const orderId = String(body.order_nsu || '');
    if (!UUID.test(orderId)) return json({ error: 'order' }, 400);
    const { data: order } = await admin.from('store_orders').select('id, user_id, status_history').eq('id', orderId).maybeSingle();
    if (!order) return json({ error: 'order' }, 400);
    const { data: store } = await admin.from('store_settings').select('infinitepay_handle').eq('user_id', order.user_id).maybeSingle();
    // Nunca confia só no aviso: confirma na InfinitePay antes de marcar como pago.
    const paid = await checkInfinitePayPayment(cleanHandle(store?.infinitepay_handle), { order_nsu: orderId, transaction_nsu: body.transaction_nsu, slug: body.invoice_slug });
    if (!paid) return json({ ok: true, paid: false });
    const hist = Array.isArray(order.status_history) ? order.status_history : [];
    await admin.from('store_orders').update({
      payment_status: 'paid', payment_receipt_url: body.receipt_url || null, payment_transaction_nsu: body.transaction_nsu || null,
      status_history: [...hist, { status: 'pago', at: new Date().toISOString(), by: 'InfinitePay' }],
    }).eq('id', orderId);
    await admin.from('notifications').insert({ user_id: order.user_id, type: 'payment', title: 'Pagamento recebido', message: `Pedido pago pela InfinitePay`, related_id: orderId });
    return json({ ok: true, paid: true });
  }

  const orderId = String(body.order_id || '');
  if (!UUID.test(orderId)) return json({ error: 'Pedido inválido' }, 400);
  const r = await createInfinitePayLink(admin, orderId, typeof body.redirect_url === 'string' ? body.redirect_url : undefined);
  return r.url ? json({ url: r.url }) : json({ error: r.error }, 400);
});
