import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);
    const { data: prov } = await admin.from('whatsapp_configs')
      .select('api_type, base_url, api_token, instance_id, extra_headers')
      .eq('user_id', user.id).eq('is_active', true).maybeSingle();

    if (!prov || (prov.api_type || '').toLowerCase() !== 'z-api') {
      return new Response(JSON.stringify({ ok: false, reason: 'no_zapi_config' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const baseUrl = (prov.base_url || '').replace(/\/$/, '').replace(/\/(send-text|send-image|send-document)$/, '');
    const headers: Record<string,string> = { 'Content-Type': 'application/json', ...((prov as any).extra_headers || {}) };

    const { data: clients } = await admin.from('chat_clients')
      .select('id, phone, avatar_url').eq('user_id', user.id).is('avatar_url', null).limit(200);

    let updated = 0;
    for (const c of clients || []) {
      if (!c.phone) continue;
      try {
        const url = baseUrl.includes('/instances/')
          ? `${baseUrl}/profile-picture?phone=${c.phone}`
          : `${baseUrl}/instances/${prov.instance_id}/token/${prov.api_token}/profile-picture?phone=${c.phone}`;
        const r = await fetch(url, { headers });
        if (!r.ok) continue;
        const j = await r.json().catch(() => null);
        const link = j?.link || j?.profilePicture || j?.url;
        if (link) {
          await admin.from('chat_clients').update({ avatar_url: link, updated_at: new Date().toISOString() }).eq('id', c.id);
          updated++;
        }
      } catch (_) { /* skip */ }
    }

    return new Response(JSON.stringify({ ok: true, scanned: clients?.length || 0, updated }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
