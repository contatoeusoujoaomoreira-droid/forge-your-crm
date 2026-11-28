// Grants member-area access for digital items of a paid order and sends the link via WhatsApp (OmniConect).
export async function grantMemberAccess(admin: any, order: any, siteOrigin?: string | null) {
  const ids = (order.items || []).map((i: any) => i.id);
  if (!ids.length) return;
  const { data: products } = await admin.from('products_services').select('id,name,delivery_type').eq('user_id', order.user_id).in('id', ids);
  const digital = (products || []).filter((p: any) => p.delivery_type === 'digital');
  if (!digital.length) return;
  const { data: rows } = await admin.from('member_access').upsert(
    digital.map((p: any) => ({ user_id: order.user_id, product_id: p.id, order_id: order.id, customer_name: order.customer_name, customer_phone: order.customer_phone, customer_email: order.customer_email })),
    { onConflict: 'order_id,product_id', ignoreDuplicates: true },
  ).select('id,token,product_id,sent_at');
  const fresh = (rows || []).filter((r: any) => !r.sent_at);
  if (!fresh.length || !order.customer_phone) return;
  const { data: store } = await admin.from('store_settings').select('slug,custom_domain,store_name,storefront_config').eq('user_id', order.user_id).maybeSingle();
  if (store?.storefront_config?.notifications?.member_access?.enabled === false) return;
  const base = store?.custom_domain ? `https://${store.custom_domain}` : (siteOrigin || 'https://omnibuildercrm.online');
  const links = fresh.map((r: any) => `• ${digital.find((p: any) => p.id === r.product_id)?.name}: ${base}/membros/${r.token}`).join('\n');
  const text = `Olá ${order.customer_name || ''}! Pagamento confirmado ✅\nSeu acesso à área de membros:\n${links}\n\nGuarde este link, ele é pessoal.${order.customer_email ? `\nVocê também entra em ${base}/membros com o e-mail ${order.customer_email}.` : ''}`;
  const ok = await sendWhatsApp(admin, order.user_id, order.customer_phone, text);
  if (ok) await admin.from('member_access').update({ sent_at: new Date().toISOString() }).in('id', fresh.map((r: any) => r.id));
}

export async function sendWhatsApp(admin: any, userId: string, rawPhone: string, text: string) {
  const { data: cfg } = await admin.from('whatsapp_configs').select('base_url,api_token').eq('user_id', userId).eq('is_active', true).eq('api_type', 'omniconect').order('updated_at', { ascending: false }).limit(1).maybeSingle();
  if (!cfg?.base_url || !cfg?.api_token) return false;
  let phone = String(rawPhone).replace(/\D/g, '');
  if (phone.length <= 11) phone = `55${phone}`;
  const resp = await fetch(`${String(cfg.base_url).replace(/\/$/, '')}/send/text`, { method: 'POST', headers: { 'Content-Type': 'application/json', token: cfg.api_token }, body: JSON.stringify({ number: phone, text }) });
  await resp.text();
  return resp.ok;
}
