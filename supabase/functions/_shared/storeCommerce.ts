export type StorePermissions = { catalog?: boolean; orders?: boolean; payments?: boolean };
export function allowedStoreTools(permissions: StorePermissions = {}) {
  return [
    ...(permissions.catalog ? ['buscar_produtos', 'verificar_estoque', 'link_loja'] : []),
    ...(permissions.orders ? ['registrar_pedido', 'acompanhar_pedido'] : []),
    ...(permissions.payments ? ['gerar_link_pagamento'] : []),
  ];
}
export function isPaid(status?: string | null) { return status === 'pago' || status === 'paid'; }
export function validatedOrderLines(products: any[], requested: any[]) {
  if (!Array.isArray(requested) || !requested.length || requested.length > 100) throw new Error('Selecione de 1 a 100 itens.');
  const quantities = new Map<string, number>();
  for (const item of requested) {
    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 10000) throw new Error('Quantidade inválida.');
    quantities.set(String(item.id), (quantities.get(String(item.id)) || 0) + qty);
  }
  return [...quantities].map(([id, quantity]) => {
    const p = products.find(p => p.id === id);
    if (!p) throw new Error('Item indisponível nesta loja.');
    const service = p.item_type === 'service';
    if (service && quantity !== 1) throw new Error('Cada serviço pode ser contratado uma vez por pedido.');
    if (!service && quantity > Number(p.stock_qty || 0)) throw new Error(`Estoque insuficiente: ${p.name}.`);
    const unit = !service && p.wholesale_price != null && quantity >= Number(p.wholesale_min_qty ?? 1) ? Number(p.wholesale_price) : Number(p.price);
    if (p.price == null || !Number.isFinite(unit) || unit <= 0) throw new Error(`Preço sob consulta: ${p.name}.`);
    return { id, name: p.name, qty: quantity, unit_price: Math.round(unit * 100) / 100 };
  });
}
export function publicOrder(order: any) {
  return { id: order.id, order_no: order.order_no, status: order.status, payment_status: isPaid(order.payment_status) ? 'pago' : 'pendente', total: order.total, items: order.items, created_at: order.created_at,
    history: (Array.isArray(order.status_history) ? order.status_history : []).map((h: any) => ({ status: h.to || h.status, at: h.at })) };
}