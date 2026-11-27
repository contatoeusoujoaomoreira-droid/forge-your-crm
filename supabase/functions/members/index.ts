import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { sendWhatsApp } from '../_shared/members.ts';
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const sha = async (v: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)))).map(b => b.toString(16).padStart(2, '0')).join('');
const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('portal'), token: z.string().uuid() }),
  z.object({ action: z.literal('request_code'), email: z.string().trim().email().max(200) }),
  z.object({ action: z.literal('verify'), email: z.string().trim().email().max(200), code: z.string().regex(/^\d{6}$/) }),
]);
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const raw = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(raw.action ? raw : { ...raw, action: 'portal' });
  if (!parsed.success) return json({ error: 'Dados inválidos' }, 400);
  const b = parsed.data;
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  if (b.action === 'request_code') {
    const email = b.email.toLowerCase();
    const generic = json({ ok: true, message: 'Se este e-mail tiver compras, o código foi enviado ao WhatsApp cadastrado na compra.' });
    const { data: recent } = await admin.from('member_login_codes').select('id').eq('email', email).gte('created_at', new Date(Date.now() - 60_000).toISOString()).limit(1);
    if (recent?.length) return generic;
    const { data: acc } = await admin.from('member_access').select('user_id,customer_phone').eq('customer_email', email).not('customer_phone', 'is', null).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!acc) return generic;
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
    await admin.from('member_login_codes').insert({ email, code_hash: await sha(`${email}:${code}`), expires_at: new Date(Date.now() + 10 * 60_000).toISOString() });
    await sendWhatsApp(admin, acc.user_id, acc.customer_phone, `Seu código de acesso à área de membros: ${code}\nVálido por 10 minutos. Não compartilhe.`);
    return generic;
  }
  if (b.action === 'verify') {
    const email = b.email.toLowerCase();
    const { data: row } = await admin.from('member_login_codes').select('*').eq('email', email).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!row || new Date(row.expires_at) < new Date() || row.attempts >= 5) return json({ error: 'Código expirado. Peça um novo.' }, 400);
    if (row.code_hash !== await sha(`${email}:${b.code}`)) { await admin.from('member_login_codes').update({ attempts: row.attempts + 1 }).eq('id', row.id); return json({ error: 'Código incorreto.' }, 400); }
    await admin.from('member_login_codes').delete().eq('email', email);
    const { data: rows } = await admin.from('member_access').select('token,product_id,created_at').eq('customer_email', email).order('created_at', { ascending: false });
    const ids = [...new Set((rows || []).map((r: any) => r.product_id))];
    const { data: products } = ids.length ? await admin.from('products_services').select('id,user_id,name,description,images,category,members_external_url').in('id', ids) : { data: [] };
    const { data: counts } = ids.length ? await admin.from('member_lessons').select('product_id').in('product_id', ids) : { data: [] };
    const courses = ids.map(id => { const p = (products || []).find((x: any) => x.id === id); return p && { token: rows!.find((r: any) => r.product_id === id).token, name: p.name, description: p.description, cover: p.images?.[0] || null, category: p.category || 'Meus cursos', external_url: p.members_external_url || null, lessons: (counts || []).filter((c: any) => c.product_id === id).length }; }).filter(Boolean);
    const owners = [...new Set((products || []).map((p: any) => p.user_id))];
    const { data: more } = owners.length ? await admin.from('products_services').select('id,user_id,name,description,images,category,price').in('user_id', owners).eq('delivery_type', 'digital').eq('is_active', true).eq('show_in_catalog', true).limit(60) : { data: [] };
    const { data: stores } = owners.length ? await admin.from('store_settings').select('user_id,slug,custom_domain').in('user_id', owners) : { data: [] };
    const offers = (more || []).filter((p: any) => !ids.includes(p.id)).map((p: any) => { const st = (stores || []).find((s: any) => s.user_id === p.user_id); return { id: p.id, name: p.name, description: p.description, cover: p.images?.[0] || null, price: p.price, buy_url: st ? (st.custom_domain ? `https://${st.custom_domain}` : `/loja/${st.slug}`) : null }; });
    return json({ email, courses, offers });
  }
  const { data: access } = await admin.from('member_access').select('product_id,user_id,customer_name').eq('token', b.token).maybeSingle();
  if (!access) return json({ error: 'Acesso não encontrado' }, 404);
  const [{ data: product }, { data: lessons }, { data: store }, { data: modules }] = await Promise.all([
    admin.from('products_services').select('name,description,images,members_external_url').eq('id', access.product_id).maybeSingle(),
    admin.from('member_lessons').select('id,title,description,video_url,file_url,content_type,module_id,position').eq('product_id', access.product_id).order('position'),
    admin.from('store_settings').select('store_name,whatsapp').eq('user_id', access.user_id).maybeSingle(),
    admin.from('member_modules').select('id,title,cover_url,position').eq('product_id', access.product_id).order('position'),
  ]);
  return json({ customer_name: access.customer_name, product, lessons: lessons || [], modules: modules || [], store });
});
