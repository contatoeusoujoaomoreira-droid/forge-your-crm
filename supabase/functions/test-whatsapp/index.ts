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
      const r = await fetch(`${root}/send-text`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...extra }, body: JSON.stringify({ phone, message: content }) });
      return { ok: r.ok, status: r.status, body: (await r.text()).slice(0, 500) };
    }
    case 'wasender': {
      const r = await fetch(`${baseUrl}/api/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...extra },
        body: JSON.stringify({ to: phone, text: content }),
      });
      return { ok: r.ok, status: r.status, body: (await r.text()).slice(0, 500) };
    }
    case 'umclique': {
      const r = await fetch(`${baseUrl}/public-send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': token, ...extra },
        body: JSON.stringify({ channel_id: instance, to: phone, type: 'text', content }),
      });
      return { ok: r.ok, status: r.status, body: (await r.text()).slice(0, 500) };
    }
    case 'omniconect': {
      const r = await fetch(`${baseUrl}/send/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token },
        body: JSON.stringify({ number: phone, text: content }),
      });
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

  if (cfg.api_type === 'z-api') {
    const root = baseUrl.includes('/instances/') ? baseUrl : `${baseUrl}/instances/${instance}/token/${token}`;
    const resp = await fetch(`${root}/update-webhook-received`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...extra },
      body: JSON.stringify({ value: webhookUrl }),
    });
    return { ok: resp.ok, status: resp.status, body: (await resp.text()).slice(0, 500) };
  }
  if (cfg.api_type === 'omniconect') {
    const resp = await fetch(`${baseUrl}/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', token },
      body: JSON.stringify({ url: webhookUrl, events: ['messages', 'connection'], excludeMessages: ['fromMe'] }),
    });
    return { ok: resp.ok, status: resp.status, body: (await resp.text()).slice(0, 500) };
  }
  return { ok: false, status: 400, body: 'Configuração automática de webhook disponível para Z-API e OmniConect' };
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

    if (body.mode === 'send_test' && body.phone && body.message) {
      const phone = normalizePhone(body.phone);
      const result = await sendTestMessage(cfg, phone, body.message);

      try {
        const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
        const userId = userData.user.id;
        let { data: client } = await admin.from('chat_clients').select('*').eq('user_id', userId).eq('phone', phone).maybeSingle();
        if (!client) {
          const { data: created } = await admin.from('chat_clients').insert({
            user_id: userId, phone, name: phone, source: 'whatsapp',
          }).select().single();
          client = created;
        } else {
          await admin.from('chat_clients').update({ updated_at: new Date().toISOString() }).eq('id', client.id);
        }
        if (client) {
          await admin.from('messages').insert({
            user_id: userId, client_id: client.id, lead_id: client.lead_id,
            direction: 'outbound', channel: 'whatsapp', content: body.message,
            status: result.ok ? 'sent' : 'failed', sender_phone: phone,
            metadata: { test: true, external_status: result.status, external_body: result.body },
          });
        }
      } catch (e) { console.error('mirror test message failed', e); }

      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (body.mode === 'configure_webhook' && body.webhook_url) {
      const result = await configureReceivedWebhook(cfg, body.webhook_url);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (body.mode === 'configure_saved_webhook' && body.webhook_url) {
      const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const { data: savedCfg } = await admin.from('whatsapp_configs').select('*')
        .eq('user_id', userData.user.id).eq('is_active', true).maybeSingle();
      if (!savedCfg) {
        return new Response(JSON.stringify({ ok: false, status: 404, body: 'WhatsApp ativo não encontrado' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const result = await configureReceivedWebhook(savedCfg, body.webhook_url);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (body.mode === 'test_webhook') {
      // SECURITY: Always probe our own webhook-receiver. Ignore user-supplied URL to prevent SSRF.
      const targetUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/webhook-receiver`;
      try {
        const probe = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Webhook-Test': '1' },
          body: JSON.stringify({
            __test__: true, provider: cfg.api_type || 'omniconect',
            instanceName: cfg.instance_id || '', channel_id: cfg.instance_id || '',
            user_id: userData.user.id, timestamp: new Date().toISOString(),
            note: 'Webhook test from dashboard',
          }),
        });
        const ptxt = await probe.text();
        return new Response(JSON.stringify({
          ok: probe.ok, status: probe.status,
          body: probe.ok ? `✅ Webhook URL respondeu (${probe.status}). ${ptxt.slice(0, 200)}` : `❌ Webhook não respondeu (${probe.status}): ${ptxt.slice(0, 300)}`,
          webhook_url: targetUrl,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, status: 0, body: `❌ Falha: ${String(e).slice(0, 300)}`, webhook_url: targetUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    let testUrl = '';
    let headers: Record<string, string> = { 'Content-Type': 'application/json' };
    switch (cfg.api_type) {
      case 'z-api': {
        const root = baseUrl.includes('/instances/') ? baseUrl : `${baseUrl}/instances/${instance}/token/${token}`;
        testUrl = `${root}/status`;
        if (cfg.extra_headers) headers = { ...headers, ...cfg.extra_headers };
        break;
      }
      case 'wasender': {
        const r = await fetch(`${baseUrl}/api/status`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
        const t = await r.text();
        let parsed: any = null; try { parsed = JSON.parse(t); } catch {}
        const status = parsed?.status || '';
        const ok = r.ok && (status === 'connected' || status === 'CONNECTED');
        let hint = '';
        if (r.status === 401) hint = '❌ API Key inválida.';
        else if (status === 'need_scan') hint = '⚠ Precisa escanear o QR Code no painel WasenderAPI.';
        else if (status === 'disconnected' || status === 'DISCONNECTED') hint = '⚠ Sessão desconectada.';
        else if (status === 'expired') hint = '⚠ Sessão expirada.';
        else if (ok) hint = '✅ Conectado! WasenderAPI pronto.';
        else hint = `Status: ${status || r.status}. ${t.slice(0, 200)}`;
        return new Response(JSON.stringify({ ok, status: r.status, body: hint, session_status: status }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      case 'omniconect': {
        const r = await fetch(`${baseUrl}/instance/status`, { headers: { token, Accept: 'application/json' } });
        const t = await r.text();
        let parsed: any = null; try { parsed = JSON.parse(t); } catch {}
        const inst = parsed?.instance || parsed || {};
        const status = inst.status || parsed?.status || '';
        const ok = r.ok && status === 'connected';
        let hint = '';
        if (r.status === 401) hint = '❌ Token de instância inválido.';
        else if (status === 'disconnected') hint = '⚠ Desconectado. Gere o QR para conectar.';
        else if (status === 'connecting') hint = '⏳ Conectando — escaneie o QR.';
        else if (ok) hint = `✅ Conectado! ${inst.profileName ? `Perfil: ${inst.profileName}` : ''}`;
        else hint = `Status: ${status || r.status}. ${t.slice(0, 200)}`;
        return new Response(JSON.stringify({ ok, status: r.status, body: hint, session_status: status }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      case 'umclique': {
        testUrl = `${baseUrl}/validate-whatsapp-number`;
        headers['X-API-Key'] = token;
        if (cfg.extra_headers) headers = { ...headers, ...cfg.extra_headers };
        const r = await fetch(testUrl, { method: 'POST', headers, body: JSON.stringify({ number: '5511999999999', locale: 'br' }) });
        const t = await r.text();
        const apiKeyOk = r.status !== 401 && r.status !== 404;
        let hint = '';
        if (r.status === 401) hint = '❌ API Key inválida.';
        else if (r.status === 403) hint = '✅ API Key OK.';
        else if (r.status === 404) hint = '❌ Endpoint não encontrado.';
        else if (r.ok) hint = '✅ API Key e Base URL OK!';
        else hint = `⚠ Status ${r.status}: ${t.slice(0, 200)}`;
        let channelOk = true; let channelMsg = '';
        if (instance && apiKeyOk) {
          const r2 = await fetch(`${baseUrl}/public-send-message`, { method: 'POST', headers, body: JSON.stringify({ channel_id: instance, to: '0', type: 'text', content: '__test__' }) });
          const t2 = await r2.text();
          if (/Integration not found or inactive/i.test(t2)) {
            channelOk = false;
            channelMsg = `❌ Channel ID "${instance}" não encontrado.`;
          } else channelMsg = `✅ Channel ID reconhecido.`;
        } else if (!instance) { channelOk = false; channelMsg = '⚠ Channel ID vazio.'; }
        return new Response(JSON.stringify({ ok: apiKeyOk && channelOk, status: r.status, body: `${hint}\n${channelMsg}`, api_key_ok: apiKeyOk, channel_ok: channelOk }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      default:
        return new Response(JSON.stringify({ ok: false, status: 400, body: `Provider ${cfg.api_type} não suportado` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const resp = await fetch(testUrl, { headers });
    const text = await resp.text();
    return new Response(JSON.stringify({ ok: resp.ok, status: resp.status, body: text.slice(0, 500) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
