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

export function buildOrderMessage(lines: CartLine[], c: { name: string; address?: string; notes?: string; orderNo?: string; storeName?: string; fee?: number }): string {
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
    c.fee ? `Subtotal: ${brl(cartTotal(lines))}\nEntrega: ${brl(c.fee)}` : null,
    `💰 *TOTAL: ${brl(cartTotal(lines) + (c.fee || 0))}*`,
    c.fee ? `_Forma de pagamento a combinar_` : `_Taxa de entrega e pagamento a confirmar_`,
    c.notes?.trim() ? `\n📝 *Obs:* ${c.notes.trim()}` : null,
  ].filter((x) => x !== null).join("\n");
}

/** Abre recibo imprimível (térmica/A4/PDF) de um pedido salvo. */
export function printReceipt(o: { order_no: string; customer_name: string; address?: string | null; notes?: string | null; items: { qty: number; name: string; unit_price: number }[]; subtotal: number; delivery_fee: number; total: number; created_at?: string }, storeName?: string) {
  const w = window.open("", "_blank", "width=380,height=640");
  if (!w) return;
  const esc = (s: any) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]!));
  const rows = o.items.map((i) => `<tr><td>${i.qty}x ${esc(i.name)}</td><td style="text-align:right">${brl(i.unit_price * i.qty)}</td></tr>`).join("");
  w.document.write(`<html><head><title>Pedido #${esc(o.order_no)}</title><style>body{font-family:monospace;font-size:12px;width:280px;margin:8px auto}h2,p.c{text-align:center;margin:4px 0}table{width:100%;border-collapse:collapse}td{padding:2px 0;vertical-align:top}hr{border:0;border-top:1px dashed #000}button{margin-top:10px;width:100%;padding:8px}@media print{button{display:none}}</style></head><body>
<h2>${esc(storeName || "Pedido")}</h2><p class="c">PEDIDO #${esc(o.order_no)}<br>${new Date(o.created_at || Date.now()).toLocaleString("pt-BR")}</p><hr>
<p>Cliente: ${esc(o.customer_name)}<br>${o.address ? "Entrega: " + esc(o.address) : "Retirada no local"}</p><hr>
<table>${rows}</table><hr>
<table><tr><td>Subtotal</td><td style="text-align:right">${brl(o.subtotal)}</td></tr><tr><td>Entrega</td><td style="text-align:right">${brl(o.delivery_fee)}</td></tr><tr><td><b>TOTAL</b></td><td style="text-align:right"><b>${brl(o.total)}</b></td></tr></table>
${o.notes ? `<hr><p>Obs: ${esc(o.notes)}</p>` : ""}<hr><p class="c">Documento sem valor fiscal</p>
<button onclick="print()">Imprimir / Salvar PDF</button></body></html>`);
  w.document.close();
}
