import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { execExternalTool } from '../_shared/externalTools.ts';

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') || '';
    const url = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Sessão expirada. Entre novamente.' }, 401);
    const body = await req.json().catch(() => ({}));
    if (typeof body?.tool_id !== 'string') return json({ error: 'tool_id obrigatório' }, 400);
    const args = body.args && typeof body.args === 'object' ? body.args : {};
    const { data: tool } = await userClient.from('external_tools').select('*').eq('id', body.tool_id).maybeSingle();
    if (!tool) return json({ error: 'Integração não encontrada' }, 404);
    const started = Date.now();
    const result = JSON.parse(await execExternalTool(tool, args, { name: 'Teste', phone: '5500000000000' }));
    await userClient.from('external_tools').update({ last_test_at: new Date().toISOString(), last_test_status: result.status ?? 0 }).eq('id', tool.id);
    return json({ ...result, ms: Date.now() - started });
  } catch (e) {
    return json({ error: String(e).slice(0, 300) }, 500);
  }
});
