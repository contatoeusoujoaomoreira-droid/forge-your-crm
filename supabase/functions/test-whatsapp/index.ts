import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sanitizeBaseUrl = (url: string) =>
  (url || '').replace(/\/$/, '')
    .replace(/\/send-text$/, '')
    .replace(/\/send-image$/, '')
    .replace(/\/send-document$/, '');

const normalizePhone = (raw: string) => raw.replace(/\D/g, '');

async function sendTestMessage(cfg: any, phone: string, content: string) {
  const baseUrl = sanitizeBaseUrl(cfg.base_url || '');
  const token = cfg.api_token || '';
  const instance = cfg.instance_id || '';
  const extra = cfg.extra_headers || {};

  switch (cfg.api_type) {
    case 'z-api': {
      const root = baseUrl.includes('/instances/') ? baseUrl : `${baseUrl}/instances/${instance}/token/${token}`;
      const url = `${root}/send-text`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
      const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ phone, message: content }) });
      return { ok: r.ok, status: r.status, body: (await r.text()).slice(0, 500) };
    }
    case 'evolution': {
      const url = `${baseUrl}/message/sendText/${instance}`;
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: token }, body: JSON.stringify({ number: phone, text: content }) });
      return { ok: r.ok, status: r.status, body: (await r.text()).slice(0, 500) };
    }
    case 'ultramsg': {
      const url = `${baseUrl}/${instance}/messages/chat`;
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token, to: phone, body: content }).toString() });
      return { ok: r.ok, status: r.status, body: (await r.text()).slice(0, 500) };
    }
    case 'botconversa': {
      const url = `${baseUrl}/webhook/subscriber/${phone}/send_message/`;
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'API-KEY': token, ...extra }, body: JSON.stringify({ type: 'text', value: content }) });
      return { ok: r.ok, status: r.status, body: (await r.text()).slice(0, 500) };
    }
    case 'custom': {
      const r = await fetch(baseUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...extra }, body: JSON.stringify({ phone, message: content }) });
      return { ok: r.ok, status: r.status, body: (await r.text()).slice(0, 500) };
    }
  }
  return { ok: false, status: 400, body: `Provider ${cfg.api_type} não suportado` };
}

async function configureReceivedWebhook(cfg: any, webhookUrl: string) {
  const baseUrl = sanitizeBaseUrl(cfg.base_url || '');
  const token = cfg.api_token || '';
  const instance = cfg.instance_id || '';
  const extra = cfg.extra_headers || {};

  if (cfg.api_type !== 'z-api') {
    return { ok: false, status: 400, body: 'Configuração automática de webhook disponível para Z-API' };
  }

  const root = baseUrl.includes('/instances/') ? baseUrl : `${baseUrl}/instances/${instance}/token/${token}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
  const resp = await fetch(`${root}/update-webhook-received`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ value: webhookUrl }),
  });
  return { ok: resp.ok, status: resp.status, body: (await resp.text()).slice(0, 500) };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json();
    const cfg = body.config || body;
    const baseUrl = (cfg.base_url || '').replace(/\/$/, '');
    const token = cfg.api_token || '';
    const instance = cfg.instance_id || '';

    // ----- Mode: send a real test message -----
    if (body.mode === 'send_test' && body.phone && body.message) {
      const phone = normalizePhone(body.phone);
      const result = await sendTestMessage(cfg, phone, body.message);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (body.mode === 'configure_webhook' && body.webhook_url) {
      const result = await configureReceivedWebhook(cfg, body.webhook_url);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ----- Default: connection check -----
    let testUrl = '';
    let headers: Record<string, string> = { 'Content-Type': 'application/json' };
    switch (cfg.api_type) {
      case 'z-api': {
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
