export type FeedProduct = { id: string; name: string; description?: string | null; sku?: string | null; barcode?: string | null; brand?: string | null; category?: string | null; price: number | null; stock_qty: number; images?: string[] | null; is_active: boolean; show_in_catalog: boolean; item_type?: string };
export const xmlEscape = (value: unknown) => String(value ?? '').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c] || c));
export function feedEligible(p: FeedProduct) {
  return p.is_active && p.show_in_catalog && p.item_type !== 'service' && p.price != null && Number.isFinite(Number(p.price)) && Number(p.price) > 0 && Boolean(p.images?.some(v => /^https:\/\//.test(v)));
}
export function catalogXml(store: { store_name: string; slug: string }, products: FeedProduct[], origin: string) {
  const base = `${origin.replace(/\/$/, '')}/loja/${encodeURIComponent(store.slug)}`;
  const tag = (name: string, value: unknown) => `<${name}>${xmlEscape(value)}</${name}>`;
  const entries = products.filter(feedEligible).map(p => {
    const images = (p.images || []).filter(v => /^https:\/\//.test(v));
    return '<item>' + tag('g:id', p.sku || p.id) + tag('g:title', p.name) + tag('g:description', p.description || p.name) + tag('g:link', `${base}?item=${encodeURIComponent(p.id)}`) + tag('g:image_link', images[0]) + images.slice(1, 11).map(v => tag('g:additional_image_link', v)).join('') + tag('g:availability', Number(p.stock_qty) > 0 ? 'in_stock' : 'out_of_stock') + tag('g:price', `${Number(p.price).toFixed(2)} BRL`) + tag('g:condition', 'new') + (p.brand ? tag('g:brand', p.brand) : '') + (p.category ? tag('g:product_type', p.category) : '') + (/^\d{8,14}$/.test(p.barcode || '') ? tag('g:gtin', p.barcode) : tag('g:identifier_exists', 'no')) + tag('stock_qty', p.stock_qty) + '</item>';
  });
  return '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>' + tag('title', store.store_name) + tag('link', base) + tag('description', `Catálogo de ${store.store_name}`) + entries.join('') + '</channel></rss>';
}