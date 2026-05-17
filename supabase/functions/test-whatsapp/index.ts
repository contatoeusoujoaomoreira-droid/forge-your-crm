import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sanitizeBaseUrl = (url: string) =>
  (url || '').replace(/\/$/, '')
    .replace(/\/send-text$/, '')
    .replace(/\/send-image$/, '')
    .replace(/\/send-document$/, '')
    .replace(/\/api\/(send-message|send-image|send-video|send-voice|send-audio|send-document|status|contact-info)\/?$/, '')
    .replace(/\/api\/?$/, '')
    .replace(/\/$/, '');

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
    case 'evolution':
    case 'evolution_go': {
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
    case 'wasender': {
      const url = `${baseUrl}/api/send-message`;
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...extra },
        body: JSON.stringify({ to: phone, text: content }),
      });
      return { ok: r.ok, status: r.status, body: (await r.text()).slice(0, 500) };
    }
    case 'umclique': {
      const url = `${baseUrl}/public-send-message`;
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': token, ...extra },
        body: JSON.stringify({ channel_id: instance, to: phone, type: 'text', content }),
      });
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

      // Friendlier error when provider returns HTML (Symfony 405/404 etc.)
      if (!result.ok && typeof result.body === 'string' && /<!DOCTYPE html|<html/i.test(result.body)) {
        const m = result.body.match(/<title>([^<]+)<\/title>/i);
        const title = m?.[1]?.trim() || `HTTP ${result.status}`;
        result.body = `❌ Provedor retornou página de erro (${result.status}): ${title}. Verifique se a Base URL está correta (sem "/api/send-message" no final) e se o endpoint do provedor está ativo.`;
      }

      // Mirror to Chat module: create/find chat client + insert outbound message
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
            user_id: userId,
            client_id: client.id,
            lead_id: client.lead_id,
            direction: 'outbound',
            channel: 'whatsapp',
            content: body.message,
            status: result.ok ? 'sent' : 'failed',
            sender_phone: phone,
            metadata: { test: true, external_status: result.status, external_body: result.body, provider: cfg.api_type },
          });
        }
      } catch (e) {
        console.error('mirror test message failed', e);
      }

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

    // ----- Mode: webhook test (verifies webhook-receiver is reachable AND inserts a sentinel event) -----
    if (body.mode === 'test_webhook') {
      const targetUrl = body.webhook_url || `${Deno.env.get('SUPABASE_URL')}/functions/v1/webhook-receiver`;
      try {
        const probe = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Webhook-Test': '1' },
          body: JSON.stringify({
            __test__: true,
            provider: cfg.api_type || 'umclique',
            instanceName: cfg.instance_id || '',
            channel_id: cfg.instance_id || '',
            user_id: userData.user.id,
            timestamp: new Date().toISOString(),
            note: 'Webhook test from dashboard',
          }),
        });
        const ptxt = await probe.text();
        return new Response(JSON.stringify({
          ok: probe.ok,
          status: probe.status,
          body: probe.ok
            ? `✅ Webhook URL respondeu (${probe.status}). Configure no painel umClique → Configurações → API & Webhooks → Novo Webhook Split apontando para:\n${targetUrl}\n\nResposta: ${ptxt.slice(0, 200)}`
            : `❌ Webhook não respondeu corretamente (${probe.status}): ${ptxt.slice(0, 300)}`,
          webhook_url: targetUrl,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (e) {
        return new Response(JSON.stringify({
          ok: false, status: 0,
          body: `❌ Falha ao alcançar o webhook: ${String(e).slice(0, 300)}`,
          webhook_url: targetUrl,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
      case 'botconversa':
        testUrl = `${baseUrl}/webhook/subscriber/`;
        headers['API-KEY'] = token;
        if (cfg.extra_headers) headers = { ...headers, ...cfg.extra_headers };
        break;
      case 'evolution':
      case 'evolution_go':
        testUrl = `${baseUrl}/instance/connectionState/${instance}`;
        headers.apikey = token;
        break;
      case 'ultramsg':
        testUrl = `${baseUrl}/${instance}/instance/status?token=${token}`;
        break;
      case 'wasender': {
        // GET /api/status with Bearer session key
        const r = await fetch(`${baseUrl}/api/status`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        const t = await r.text();
        let parsed: any = null; try { parsed = JSON.parse(t); } catch {}
        const status = parsed?.status || '';
        const ok = r.ok && (status === 'connected' || status === 'CONNECTED');
        let hint = '';
        if (r.status === 401) hint = '❌ API Key inválida. Vá em Dashboard → Sessions → copie a chave da sessão correta.';
        else if (status === 'need_scan') hint = '⚠ Sessão criada mas precisa escanear o QR Code no painel WasenderAPI antes de enviar.';
        else if (status === 'disconnected' || status === 'DISCONNECTED') hint = '⚠ Sessão desconectada. Reconecte no painel WasenderAPI.';
        else if (status === 'expired') hint = '⚠ Sessão expirada. Reconecte no painel WasenderAPI.';
        else if (ok) hint = '✅ Conectado! WasenderAPI pronto para enviar/receber.';
        else hint = `Status: ${status || r.status}. ${t.slice(0, 200)}`;
        return new Response(JSON.stringify({ ok, status: r.status, body: hint, session_status: status }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      case 'umclique': {
        // Validate API Key + channel via lightweight endpoint.
        // We attempt validate-whatsapp-number (cheap, returns 401 if API key invalid,
        // 200/400 if key valid). This avoids creating a real send.
        testUrl = `${baseUrl}/validate-whatsapp-number`;
        headers['X-API-Key'] = token;
        if (cfg.extra_headers) headers = { ...headers, ...cfg.extra_headers };
        // Use POST with a stub number — see logic below
        const r = await fetch(testUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ number: '5511999999999', locale: 'br' }),
        });
        const t = await r.text();
        // 401 = invalid api key. 403 = feature not available (still means key works!).
        // 200/400 = key OK. Anything 5xx is upstream issue.
        const apiKeyOk = r.status !== 401 && r.status !== 404;
        let hint = '';
        if (r.status === 401) hint = '❌ API Key inválida. Verifique em umClique → Configurações → API & Webhooks.';
        else if (r.status === 403) hint = '✅ API Key OK. Seu plano não inclui validação de números (não é problema para envio).';
        else if (r.status === 404) hint = '❌ Endpoint não encontrado. Confira a Base URL: deve ser https://cslsnijdeayzfpmwjtmw.supabase.co/functions/v1';
        else if (r.ok) hint = '✅ API Key e Base URL OK!';
        else hint = `⚠ Status ${r.status}: ${t.slice(0, 200)}`;
        // Now also test that the channel_id exists by trying a no-op send (will return Integration not found if channel wrong)
        let channelOk = true; let channelMsg = '';
        if (instance && apiKeyOk) {
          const r2 = await fetch(`${baseUrl}/public-send-message`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ channel_id: instance, to: '0', type: 'text', content: '__test__' }),
          });
          const t2 = await r2.text();
          if (/Integration not found or inactive/i.test(t2)) {
            channelOk = false;
            channelMsg = `❌ Channel ID "${instance}" não foi encontrado na sua conta umClique. Vá em Canais → 3 pontos → Detalhes do Canal → copie o "Instance ID" (W-API) ou "Phone Number ID" (Meta).`;
          } else {
            channelMsg = `✅ Channel ID reconhecido pela umClique.`;
          }
        } else if (!instance) {
          channelOk = false;
          channelMsg = '⚠ Channel ID vazio — preencha com o Instance ID (W-API) ou Phone Number ID (Meta).';
        }
        return new Response(JSON.stringify({
          ok: apiKeyOk && channelOk,
          status: r.status,
          body: `${hint}\n${channelMsg}`,
          api_key_ok: apiKeyOk,
          channel_ok: channelOk,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      default:
        testUrl = baseUrl;
    }
    try {
      const resp = await fetch(testUrl, { headers });
      const text = await resp.text();
      return new Response(JSON.stringify({ ok: resp.ok, status: resp.status, body: text.slice(0, 500) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (e) {
      const msg = String((e as any)?.message || e);
      let friendly = msg;
      if (/invalid peer certificate|UnknownIssuer|certificate/i.test(msg)) {
        friendly = `❌ Certificado SSL inválido em ${baseUrl}. Servidores Evolution precisam de um domínio com SSL válido (ex: https://api.seudominio.com via Cloudflare/Let's Encrypt). Não é possível usar HTTPS direto em IP (${baseUrl}). Use HTTP (http://IP:porta) se o servidor permitir, ou configure um domínio com certificado válido.`;
      } else if (/dns error|failed to lookup|ENOTFOUND|Name or service not known/i.test(msg)) {
        friendly = `❌ Não foi possível resolver ${baseUrl}. Verifique se a Base URL está correta e acessível publicamente.`;
      } else if (/Connection refused|tcp connect error/i.test(msg)) {
        friendly = `❌ Conexão recusada em ${baseUrl}. Verifique se o servidor está online e a porta correta.`;
      }
      return new Response(JSON.stringify({ ok: false, status: 0, body: friendly }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
