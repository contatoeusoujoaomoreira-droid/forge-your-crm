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

export function buildOrderMessage(lines: CartLine[], c: { name: string; address?: string; notes?: string }): string {
  const items = lines.map((l) => `• ${l.qty}x ${l.product.name} — ${brl(unitPrice(l.product, l.qty) * l.qty)}`).join("\n");
  return [
    `🛒 *Novo pedido*`,
    `👤 ${c.name.trim()}`,
    c.address?.trim() ? `📍 ${c.address.trim()}` : null,
    ``,
    items,
    ``,
    `*Total estimado: ${brl(cartTotal(lines))}*`,
    c.notes?.trim() ? `📝 ${c.notes.trim()}` : null,
  ].filter((x) => x !== null).join("\n");
}
