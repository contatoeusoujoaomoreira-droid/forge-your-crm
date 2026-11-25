export type CatalogRow = { name: string; sku: string; description: string; price: number | null; stock_qty?: number; category: string; brand: string; barcode: string; unit: string };
export const CATALOG_FIELDS = ['name','sku','description','price','stock_qty','category','brand','barcode','unit'] as const;
export type CatalogField = typeof CATALOG_FIELDS[number];
export const CATALOG_LABELS: Record<CatalogField,string> = {name:'Nome',sku:'Código / SKU',description:'Descrição',price:'Preço (R$)',stock_qty:'Estoque',category:'Categoria',brand:'Marca',barcode:'Código de barras',unit:'Unidade'};
const aliases: Record<CatalogField,string[]> = {name:['title','name','nome','xProd'],sku:['id','sku','reference','codigo','cProd'],description:['description','descricao','descrição'],price:['sale_price','promotional_price','price','preco','preço'],stock_qty:['stock_qty','stock','estoque','quantity'],category:['product_type','category','categoria'],brand:['brand','marca'],barcode:['gtin','ean','barcode','cEAN'],unit:['unit','unidade','uCom']};
export function parseCatalogXml(xml: string) {
  if (new TextEncoder().encode(xml).length > 8 * 1024 * 1024) throw new Error('O feed deve ter até 8 MB.');
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('XML com entidades externas não é permitido.');
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('O arquivo XML está malformado.');
  const all = Array.from(doc.getElementsByTagName('*'));
  const tag = ['item','entry','product','produto'].find(t => all.some(e => e.localName.toLowerCase() === t));
  if (!tag) throw new Error('Feed incompatível. Use RSS/Google Shopping, Atom ou produtos em XML. Para nota fiscal, use Importar XML (NF-e).');
  const elements = all.filter(e => e.localName.toLowerCase() === tag);
  if (elements.length > 1000) throw new Error('Importe até 1.000 itens por arquivo. Divida catálogos maiores em lotes.');
  const records = elements.map(e => Object.fromEntries(Array.from(e.children).map(c => [c.tagName, c.textContent?.trim() || ''])));
  const fields = Array.from(new Set(records.flatMap(r => Object.keys(r))));
  const mapping = Object.fromEntries(CATALOG_FIELDS.map(k => [k, aliases[k].map(a => fields.find(f => f.split(':').pop()?.toLowerCase() === a.toLowerCase())).find(Boolean) || ''])) as Record<CatalogField,string>;
  return { records, fields, mapping };
}
export function catalogNumber(value: string): number | null {
  const raw = value.replace(/(?:BRL|R\$)/gi, '').trim();
  if (!raw || !/^-?[\d.,]+$/.test(raw)) return null;
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  const n = Number(normalized); return Number.isFinite(n) && n >= 0 ? n : null;
}
export function mapCatalogRows(records: Record<string,string>[], mapping: Record<CatalogField,string>): CatalogRow[] {
  return records.map(r => {
    const get = (k: CatalogField) => (r[mapping[k]] || '').trim();
    const stock = catalogNumber(get('stock_qty'));
    return {name:get('name').slice(0,300),sku:get('sku').slice(0,100),description:get('description').replace(/<[^>]*>/g,'').slice(0,5000),price:catalogNumber(get('price')), ...(stock == null ? {} : {stock_qty:stock}),category:get('category').slice(0,200),brand:get('brand').slice(0,200),barcode:get('barcode').slice(0,50),unit:get('unit').slice(0,30) || 'un'};
  });
}
export function catalogRowError(row: CatalogRow, rows: CatalogRow[]) {
  if (!row.name) return 'Nome ausente';
  if (!row.sku) return 'Código / SKU ausente';
  if (row.price == null || row.price <= 0) return 'Preço inválido';
  if (rows.filter(r => r.sku === row.sku).length > 1) return 'Código repetido no feed';
  return null;
}