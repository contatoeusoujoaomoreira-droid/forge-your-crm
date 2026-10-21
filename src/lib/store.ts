export type StoreProduct = { id: string; name: string; unit?: string | null; price: number | null; wholesale_price: number | null; wholesale_min_qty: number | null };
export type CartLine = { product: StoreProduct; qty: number };

/** Preço unitário: aplica atacado quando qty >= quantidade mínima. */
export function unitPrice(p: StoreProduct, qty: number): number {
  const retail = Number(p.price ?? 0);
  if (p.wholesale_price != null && qty >= Number(p.wholesale_min_qty ?? 1)) return Number(p.wholesale_price);
  return retail;
}

export function cartTotal(lines: CartLine[]): number {
  return Math.round(lines.reduce((a, l) => a + unitPrice(l.product, l.qty) * l.qty, 0) * 100) / 100;
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function buildOrderMessage(lines: CartLine[], c: { name: string; address?: string; notes?: string; orderNo?: string; storeName?: string }): string {
  const now = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const items = lines.map((l) => {
    const u = unitPrice(l.product, l.qty);
    return `*${l.qty}x ${l.product.name}*${l.product.unit ? ` (${l.product.unit})` : ""}\n   ${brl(u)} un. = *${brl(u * l.qty)}*`;
  }).join("\n");
  const units = lines.reduce((a, l) => a + l.qty, 0);
  return [
    `🧾 *PEDIDO ${c.orderNo ? "#" + c.orderNo : ""}*${c.storeName ? ` — ${c.storeName}` : ""}`,
    `📅 ${now}`,
    `━━━━━━━━━━━━━━━`,
    `👤 *Cliente:* ${c.name.trim()}`,
    c.address?.trim() ? `📍 *Entrega:* ${c.address.trim()}` : `🏪 *Retirada no local*`,
    `━━━━━━━━━━━━━━━`,
    `🛒 *ITENS (${units})*`,
    items,
    `━━━━━━━━━━━━━━━`,
    `💰 *TOTAL: ${brl(cartTotal(lines))}*`,
    `_Taxa de entrega e pagamento a confirmar_`,
    c.notes?.trim() ? `\n📝 *Obs:* ${c.notes.trim()}` : null,
  ].filter((x) => x !== null).join("\n");
}
