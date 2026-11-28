// WhatsApp order notifications configured per store in storefront_config.notifications.
import { sendWhatsApp } from './members.ts';
export const NOTIFY_EVENTS: Record<string, { label: string; text: string }> = {
  pago: { label: 'Pagamento confirmado', text: 'Olá {nome}! Recebemos o pagamento do pedido #{pedido} ({total}). Já estamos preparando tudo ✅' },
  confirmado: { label: 'Pedido confirmado', text: 'Olá {nome}! Seu pedido #{pedido} foi confirmado.' },
  'em separação': { label: 'Em separação', text: 'Olá {nome}! Seu pedido #{pedido} está sendo separado.' },
  'em transporte': { label: 'Saiu para entrega', text: 'Olá {nome}! Seu pedido #{pedido} saiu para entrega 🚚' },
  'pronto para retirada': { label: 'Pronto para retirada', text: 'Olá {nome}! Seu pedido #{pedido} está pronto para retirada.' },
  entregue: { label: 'Entregue', text: 'Olá {nome}! Seu pedido #{pedido} foi entregue. Obrigado pela compra! 💚' },
};
export async function notifyOrder(admin: any, order: any, event: string) {
  const def = NOTIFY_EVENTS[event];
  if (!def || !order?.customer_phone) return false;
  const { data: store } = await admin.from('store_settings').select('storefront_config').eq('user_id', order.user_id).maybeSingle();
  const cfg = store?.storefront_config?.notifications?.[event];
  if (!cfg?.enabled) return false;
  const total = Number(order.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const text = String(cfg.text || def.text).replace(/\{nome\}/g, order.customer_name || '').replace(/\{pedido\}/g, order.order_no || '').replace(/\{total\}/g, total);
  return await sendWhatsApp(admin, order.user_id, order.customer_phone, text);
}
