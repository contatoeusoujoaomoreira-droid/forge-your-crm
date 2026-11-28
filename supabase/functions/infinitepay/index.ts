import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { createInfinitePayLink, checkInfinitePayPayment, cleanHandle } from '../_shared/infinitepay.ts';
import { grantMemberAccess } from '../_shared/members.ts';
import { notifyOrder } from '../_shared/orderNotify.ts';
import { isPaid, publicOrder, validatedOrderLines } from '../_shared/storeCommerce.ts';
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const OrderInput = z.object({ store_slug:z.string().min(1).max(80), items:z.array(z.object({id:z.string().uuid(),qty:z.number().int().positive().max(10000)})).min(1).max(100), customer_name:z.string().trim().min(1).max(100), customer_phone:z.string().max(30).optional(), customer_email:z.string().trim().email().max(200).optional(), address:z.string().max(300).optional(), notes:z.string().max(500).optional() });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers:corsHeaders });
  if (req.method !== 'POST') return json({error:'Método não permitido'},405);
  try {
    const serviceUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceUrl || !serviceKey) return json({error:'Serviço indisponível'},503);
    const admin = createClient(serviceUrl, serviceKey);
    const raw = await req.json().catch(() => null);
    if (!raw || typeof raw !== 'object') return json({error:'Dados inválidos'},400);
    const action = new URL(req.url).searchParams.get('action') || raw.action || 'create';
    const owner = async () => {
      const token = req.headers.get('authorization')?.replace(/^Bearer /i,'') || '';
      const {data,error} = await admin.auth.getUser(token);
      return error ? null : data.user;
    };
    if (action === 'test') {
      if (!await owner()) return json({error:'Sessão expirada'},401);
      const parsed=z.object({handle:z.string().min(1).max(100)}).safeParse(raw);
      if (!parsed.success) return json({ok:false,message:'Digite sua InfiniteTag.'},400);
      const r=await fetch('https://api.checkout.infinitepay.io/links',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({handle:cleanHandle(parsed.data.handle),items:[{quantity:1,price:100,description:'Teste de conexão'}],order_nsu:'teste-'+Date.now()})});
      const txt=await r.text();
      return json({ok:r.ok,message:r.ok?'Conexão ativa! Sua loja está pronta para receber pagamentos.':/not enabled/i.test(txt)?'Ative o Checkout externo na InfinitePay e confira a InfiniteTag.':'InfiniteTag não encontrada. Confira o nome no seu perfil InfinitePay.'});
    }
    if (action === 'create_order') {
      const parsed=OrderInput.safeParse(raw);
      if (!parsed.success) return json({error:'Confira os itens e os dados do pedido.'},400);
      const input=parsed.data;
      const {data:store}=await admin.from('store_settings').select('*').eq('slug',input.store_slug).eq('is_published',true).maybeSingle();
      if (!store) return json({error:'Loja indisponível'},404);
      const {data:products,error:pe}=await admin.from('products_services').select('*').eq('user_id',store.user_id).eq('is_active',true).eq('show_in_catalog',true).in('id',input.items.map(i=>i.id));
      if (pe) throw pe;
      const items=validatedOrderLines(products || [],input.items);
      const subtotal=Math.round(items.reduce((s,i)=>s+i.qty*i.unit_price,0)*100)/100;
      const physical=items.filter(i=>(products||[]).find((p:any)=>p.id===i.id)?.item_type!=='service').reduce((s,i)=>s+i.qty*i.unit_price,0);
      if (physical>0 && physical<Number(store.min_order || 0)) return json({error:'Pedido abaixo do valor mínimo da loja.'},400);
      const fee=input.address?.trim()?Number(store.delivery_fee || 0):0;
      const {data:order,error}=await admin.from('store_orders').insert({user_id:store.user_id,order_no:String(Date.now()).slice(-8),customer_name:input.customer_name,customer_phone:input.customer_phone?.replace(/\D/g,'') || null,customer_email:input.customer_email?.toLowerCase() || null,address:input.address?.trim() || null,notes:input.notes || null,items,subtotal,delivery_fee:fee,total:Math.round((subtotal+fee)*100)/100}).select('*').single();
      if (error) throw error;
      return json({order});
    }
    const parsed=z.object({order_id:z.string().uuid().optional(),order_nsu:z.string().uuid().optional(),token:z.string().uuid().optional(),transaction_nsu:z.string().max(200).optional(),slug:z.string().max(200).optional(),invoice_slug:z.string().max(200).optional(),redirect_url:z.string().url().max(2000).optional()}).safeParse(raw);
    if (!parsed.success) return json({error:'Pedido inválido'},400);
    const b=parsed.data, id=b.order_id || b.order_nsu;
    let query=admin.from('store_orders').select('*');
    if (action==='track' && b.token) query=query.eq('tracking_token',b.token);
    else if (id) query=query.eq('id',id);
    else return json({error:'Pedido inválido'},400);
    const {data:order}=await query.maybeSingle();
    if (!order) return json({error:'Pedido não encontrado'},404);
    const user=action==='webhook'?null:await owner();
    if (action!=='webhook' && user?.id!==order.user_id && b.token!==order.tracking_token) return json({error:'Acesso não autorizado'},403);
    if (action==='webhook' || action==='check' || action==='track') {
      const transaction=b.transaction_nsu || order.payment_transaction_nsu;
      const slug=b.slug || b.invoice_slug || order.payment_invoice_slug;
      if (!isPaid(order.payment_status) && transaction && slug) {
        const {data:store}=await admin.from('store_settings').select('infinitepay_handle').eq('user_id',order.user_id).maybeSingle();
        const paid=await checkInfinitePayPayment(cleanHandle(store?.infinitepay_handle),{order_nsu:order.id,transaction_nsu:transaction,slug},Number(order.total));
        if (paid) {
          const history=[...(Array.isArray(order.status_history)?order.status_history:[]),{status:'pago',at:new Date().toISOString(),by:'InfinitePay'}];
          const {data:updated,error}=await admin.from('store_orders').update({payment_status:'pago',payment_transaction_nsu:transaction,payment_invoice_slug:slug,status_history:history}).eq('id',order.id).not('payment_status','in','(pago,paid)').select('*').maybeSingle();
          if (error) throw error;
          if (updated) { Object.assign(order,updated); await admin.from('notifications').insert({user_id:order.user_id,type:'payment',title:'Pagamento recebido',message:`Pedido #${order.order_no} pago pela InfinitePay`,related_id:order.id}); }
          if (isPaid(order.payment_status)) { try { await grantMemberAccess(admin,order,req.headers.get('origin')); } catch (e) { console.error('member access',e); } }
          if (updated) { try { await notifyOrder(admin,order,'pago'); } catch (e) { console.error('notify',e); } }
        }
      }
      if (action==='webhook' && (!transaction || !slug)) return json({error:'Dados da transação ausentes'},400);
      if (action==='webhook' && !isPaid(order.payment_status)) return json({error:'Pagamento ainda não validado. Reenvie a confirmação.'},400);
      return json({ok:true,paid:isPaid(order.payment_status),order:publicOrder(order)});
    }
    if (action==='notify') { if (user?.id!==order.user_id) return json({error:'Acesso não autorizado'},403); const ev=String(raw.event||'').slice(0,40); return json({sent:await notifyOrder(admin,order,ev)}); }
    if (action!=='create') return json({error:'Ação inválida'},400);
    if (order.status==='cancelado' || isPaid(order.payment_status)) return json({error:'Este pedido não pode receber um novo pagamento.'},400);
    if (Number(order.total)<1) return json({error:'O pagamento pela InfinitePay deve ser de pelo menos R$ 1,00.'},400);
    // Revalida preço e itens no catálogo, inclusive pedidos de versões antigas da loja.
    const {data:products}=await admin.from('products_services').select('*').eq('user_id',order.user_id).in('id',(order.items || []).map((i:any)=>i.id));
    let expected=Number(order.delivery_fee || 0);
    for (const item of order.items || []) {
      const p=(products || []).find((p:any)=>p.id===item.id);
      if (!p || !p.is_active || !p.show_in_catalog || !Number.isInteger(item.qty) || item.qty<1 || (p.item_type==='service' && item.qty!==1)) return json({error:'Item indisponível'},400);
      const price=p.item_type!=='service' && p.wholesale_price!=null && item.qty>=Number(p.wholesale_min_qty ?? 1)?Number(p.wholesale_price):Number(p.price);
      if (p.price==null || price<=0 || Number(item.unit_price)!==price) return json({error:'Preço atualizado. Monte um novo pedido.'},400);
      expected+=price*item.qty;
    }
    if (Math.round(expected*100)!==Math.round(Number(order.total)*100)) return json({error:'Total do pedido inválido'},400);
    let redirect: string | undefined;
    if (b.redirect_url) {
      const url=new URL(b.redirect_url);
      const {data:store}=await admin.from('store_settings').select('slug,custom_domain').eq('user_id',order.user_id).maybeSingle();
      const origin=req.headers.get('origin');
      const sameStore=store && (url.origin===origin && url.pathname===`/loja/${store.slug}` || store.custom_domain && url.hostname.replace(/^www\./,'')===store.custom_domain);
      if (url.protocol==='https:' && sameStore) { url.search=''; url.searchParams.set('pedido',order.tracking_token); redirect=url.toString(); }
    }
    const result=await createInfinitePayLink(admin,order.id,redirect);
    return result.url?json({url:result.url}):json({error:result.error},400);
  } catch (error) {
    console.error('store checkout failure',String(error));
    return json({error:error instanceof Error?error.message:'Não foi possível concluir agora.'},400);
  }
});
