import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const parsed = z.object({ token: z.string().uuid() }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: 'Link inválido' }, 400);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: access } = await admin.from('member_access').select('product_id,user_id,customer_name').eq('token', parsed.data.token).maybeSingle();
  if (!access) return json({ error: 'Acesso não encontrado' }, 404);
  const [{ data: product }, { data: lessons }, { data: store }] = await Promise.all([
    admin.from('products_services').select('name,description,images').eq('id', access.product_id).maybeSingle(),
    admin.from('member_lessons').select('id,title,description,video_url,position').eq('product_id', access.product_id).order('position'),
    admin.from('store_settings').select('store_name,whatsapp').eq('user_id', access.user_id).maybeSingle(),
  ]);
  return json({ customer_name: access.customer_name, product, lessons: lessons || [], store });
});
