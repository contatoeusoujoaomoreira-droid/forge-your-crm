import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (!claims?.claims?.sub) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const cfg = await req.json();
    const baseUrl = (cfg.base_url || '').replace(/\/$/, '');
    const token = cfg.api_token || '';
    const instance = cfg.instance_id || '';

    let testUrl = '';
    let headers: Record<string, string> = { 'Content-Type': 'application/json' };
    switch (cfg.api_type) {
      case 'z-api': {
        // base_url may already include /instances/X/token/Y or just the host
        const root = baseUrl.includes('/instances/') ? baseUrl : `${baseUrl}/instances/${instance}/token/${token}`;
        testUrl = `${root}/status`;
        if (cfg.extra_headers) headers = { ...headers, ...cfg.extra_headers };
        break;
      }
      case 'botconversa':
        testUrl = `${baseUrl}/webhook/subscriber/`;
        headers['API-KEY'] = token;
        if (cfg.extra_headers) headers = { ...headers, ...cfg.extra_headers };
        break;
      case 'evolution':
        testUrl = `${baseUrl}/instance/connectionState/${instance}`;
        headers.apikey = token;
        break;
      case 'ultramsg':
        testUrl = `${baseUrl}/${instance}/instance/status?token=${token}`;
        break;
      default:
        testUrl = baseUrl;
    }
    const resp = await fetch(testUrl, { headers });
    const text = await resp.text();
    return new Response(JSON.stringify({ ok: resp.ok, status: resp.status, body: text.slice(0, 500) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
