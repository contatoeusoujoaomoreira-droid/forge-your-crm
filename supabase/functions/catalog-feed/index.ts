import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { catalogXml, type FeedProduct } from '../_shared/catalogFeed.ts';
import { isPublicHttpsUrl } from '../_shared/integrationPolicy.ts';

Deno.serve(async req => {
  const headers = { ...corsHeaders, 'Content-Type': 'application/xml; charset=utf-8', 'X-Content-Type-Options': 'nosniff' };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET') return new Response('<error>Método não permitido</error>', { status: 405, headers });
  const slug = new URL(req.url).searchParams.get('slug') || '';
  if (!/^[a-z0-9-]{1,40}$/.test(slug)) return new Response('<error>Loja inválida</error>', { status: 400, headers });
  try {
    const url = Deno.env.get('SUPABASE_URL'); const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) throw new Error('indisponível');
    const sb = createClient(url, key);
    const { data: store, error } = await sb.from('store_settings').select('user_id,slug,store_name,custom_domain,storefront_config').eq('slug', slug).eq('is_published', true).maybeSingle();
    if (error) throw error;
    if (!store) return new Response('<error>Loja não publicada</error>', { status: 404, headers });
    // Only owner-saved origins may be used; request parameters never choose product destinations.
    const config = store.storefront_config || {};
    const savedOrigin = typeof config.catalog_origin === 'string' ? config.catalog_origin : '';
    const origin = isPublicHttpsUrl(savedOrigin) ? new URL(savedOrigin).origin : 'https://omnibuildercrm.online';
    const products: FeedProduct[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error: readError } = await sb.from('products_services').select('id,name,description,sku,barcode,brand,category,price,stock_qty,images,is_active,show_in_catalog,item_type').eq('user_id', store.user_id).eq('is_active', true).eq('show_in_catalog', true).neq('item_type', 'service').order('id').range(offset, offset + 999);
      if (readError) throw readError;
      products.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    return new Response(catalogXml(store, products, origin), { headers: { ...headers, 'Cache-Control': 'public, max-age=300' } });
  } catch {
    return new Response('<error>Não foi possível gerar o catálogo</error>', { status: 503, headers });
  }
});