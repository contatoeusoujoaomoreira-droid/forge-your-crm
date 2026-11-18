import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { isPublicHttpsUrl } from '../_shared/integrationPolicy.ts';

const schema = z.object({
  id: z.string().uuid().optional(), name: z.string().min(1).max(100), description: z.string().max(2000),
  kind: z.enum(['search', 'lead_push', 'action']), method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  url: z.string().max(2048).refine(isPublicHttpsUrl), active: z.boolean(),
  auth_type: z.enum(['api_key', 'bearer', 'none']), auth_header: z.string().regex(/^[a-zA-Z0-9-]+$/).max(100),
  credential: z.string().max(24000).optional(),
  params: z.array(z.object({ name: z.string().regex(/^[a-zA-Z0-9_]+$/).max(100), description: z.string().max(500), type: z.enum(['string','number']), required: z.boolean().optional() })).max(50),
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return json({});
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL') || '';
    const client = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') || '', { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } });
    const { data: { user } } = await client.auth.getUser();
    if (!user) return json({ error: 'Entre novamente para salvar.' }, 401);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: 'Confira nome, endereço HTTPS e parâmetros da integração.' }, 400);
    const { id, credential, ...settings } = parsed.data;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');
    if (id) {
      const { data } = await client.from('external_tools').select('id').eq('id', id).eq('user_id', user.id).maybeSingle();
      if (!data) return json({ error: 'Integração não encontrada.' }, 404);
    }
    const result = id
      ? await admin.from('external_tools').update({ ...settings, headers: {}, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id).select('id').single()
      : await admin.from('external_tools').insert({ ...settings, headers: {}, user_id: user.id }).select('id').single();
    if (result.error || !result.data) return json({ error: 'Não foi possível salvar a integração.' }, 500);
    const toolId = result.data.id;
    if (credential || settings.auth_type === 'none') {
      const headers = settings.auth_type === 'none' ? {} : settings.auth_type === 'bearer' ? { Authorization: `Bearer ${credential}` } : { [settings.auth_header]: credential };
      const saved = await admin.from('external_tool_credentials').upsert({ tool_id: toolId, headers });
      if (saved.error) return json({ error: 'A configuração foi salva, mas a chave não. Tente novamente.' }, 500);
      await admin.from('external_tools').update({ credential_configured: settings.auth_type !== 'none' }).eq('id', toolId);
    }
    return json({ ok: true, id: toolId });
  } catch { return json({ error: 'Não foi possível salvar. Tente novamente.' }, 500); }
});