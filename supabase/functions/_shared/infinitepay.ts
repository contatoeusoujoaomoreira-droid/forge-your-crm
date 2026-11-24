// InfinitePay Checkout: cada lojista usa a própria InfiniteTag (pública), sem chave secreta.
const API = 'https://api.checkout.infinitepay.io';

export const cleanHandle = (h: string) => String(h || '').trim().replace(/^\$/, '').replace(/[^a-zA-Z0-9_.-]/g, '');
export const toCents = (v: number) => Math.max(1, Math.round(Number(v || 0) * 100));

export async function createInfinitePayLink(admin: any, orderId: string, redirectUrl?: string) {
  const { data: order } = await admin.from('store_orders').select('*').eq('id', orderId).maybeSingle();
  if (!order) return { error: 'Pedido não encontrado' };
  if (order.payment_link && order.payment_method === 'infinitepay') return { url: order.payment_link };
  const { data: store } = await admin.from('store_settings').select('infinitepay_enabled, infinitepay_handle').eq('user_id', order.user_id).maybeSingle();
  const handle = cleanHandle(store?.infinitepay_handle);
  if (!store?.infinitepay_enabled || !handle) return { error: 'Pagamento online não configurado nesta loja' };
  const items = (Array.isArray(order.items) ? order.items : []).map((i: any) => ({ quantity: Math.max(1, Number(i.qty) || 1), price: toCents(i.unit_price), description: String(i.name || 'Item').slice(0, 120) }));
  if (Number(order.delivery_fee) > 0) items.push({ quantity: 1, price: toCents(order.delivery_fee), description: 'Entrega' });
  if (!items.length) return { error: 'Pedido sem itens' };
  const body: any = {
    handle, items, order_nsu: order.id,
    webhook: { url: `${(globalThis as unknown as { Deno: { env: { get: (key: string) => string | undefined } } }).Deno.env.get('SUPABASE_URL')}/functions/v1/infinitepay?action=webhook`, events: ['paid'] },
  };
  if (redirectUrl && /^https:\/\//.test(redirectUrl)) body.redirect_url = redirectUrl;
  if (order.customer_name || order.customer_phone) {
    body.customer = { ...(order.customer_name ? { name: order.customer_name } : {}), ...(order.customer_phone ? { phone_number: '+' + String(order.customer_phone).replace(/\D/g, '') } : {}) };
  }
  const resp = await fetch(`${API}/links`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const txt = await resp.text();
  let json: any = {}; try { json = JSON.parse(txt); } catch {}
  const url = json.url || json.link || json.checkout_url;
  if (!resp.ok || !url) { console.error('infinitepay link error', resp.status, txt.slice(0, 300)); return { error: 'A InfinitePay recusou o pedido. Confira a InfiniteTag da loja.' }; }
  const { error } = await admin.from('store_orders').update({ payment_link: url, payment_method: 'infinitepay' }).eq('id', order.id);
  if (error) return { error: 'Não foi possível salvar o link. Tente novamente.' };
  return { url };
}

export async function checkInfinitePayPayment(handle: string, p: { order_nsu: string; transaction_nsu?: string; slug?: string }, expectedTotal?: number) {
  if (!handle || !p.transaction_nsu || !p.slug) return false;
  const resp = await fetch(`${API}/payment_check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handle, ...p }) });
  const j = await resp.json().catch(() => ({}));
  return resp.ok && j?.success === true && j?.paid === true && (expectedTotal == null || Number(j.amount) === toCents(expectedTotal));
}
