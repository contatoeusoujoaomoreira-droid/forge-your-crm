// OmniConect — integração WhatsApp via UAZAPI (https://docs.uazapi.com)
// Lifecycle: create (admintoken) -> connect/QR (token) -> status -> webhook -> disconnect -> delete
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { isPublicHttpsUrl, canRemoveLocalConnection } from '../_shared/integrationPolicy.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/webhook-receiver`;

const sanitize = (u: string) => (u || '').replace(/\/+$/, '');
const OMNI_EVENTS = ['messages', 'messages_update', 'connection', 'chats', 'contacts'];
const webhookUrlFor = (configId?: string | null) => configId ? `${WEBHOOK_URL}?config_id=${encodeURIComponent(configId)}` : WEBHOOK_URL;

// Lê a configuração de webhook atual da instância (aceita objeto ou array)
async function getOmniWebhook(baseUrl: string, instanceToken: string) {
  const r = await uaz(baseUrl, '/webhook', { token: instanceToken }, 'GET');
  const j = r.json;
  const list = Array.isArray(j) ? j : (Array.isArray(j?.webhooks) ? j.webhooks : (j ? [j] : []));
  return { ok: r.ok, status: r.status, list, raw: j };
}

// Configura E ativa o webhook da instância. Tenta variações de payload aceitas
// pelas diferentes versões da UAZAPI e valida lendo a config de volta.
async function setOmniWebhook(baseUrl: string, instanceToken: string, configId?: string | null, customUrl?: string) {
  const url = customUrl || webhookUrlFor(configId);
  const payloads: any[] = [
    { enabled: true, url, events: OMNI_EVENTS, excludeMessages: [], addUrlEvents: false, addUrlTypesMessages: false, action: 'add' },
    { enabled: true, url, events: OMNI_EVENTS },
    { url, events: OMNI_EVENTS },
  ];
  let last: any = { ok: false, status: 0, text: 'no_attempt', json: null };
  for (const body of payloads) {
    last = await uaz(baseUrl, '/webhook', { token: instanceToken }, 'POST', body);
    if (last.ok) break;
    if (last.status === 404 || last.status === 405) {
      last = await uaz(baseUrl, '/instance/updateWebhook', { token: instanceToken }, 'POST', body);
      if (last.ok) break;
    }
  }
  // Verificação: confirma que a URL está registrada e habilitada
  const check = await getOmniWebhook(baseUrl, instanceToken);
  const found = check.list.find((w: any) => (w?.url || '') === url);
  const enabled = !!found && (found.enabled !== false);
  return {
    ok: last.ok, status: last.status, text: last.text, json: last.json,
    url, verified: !!found, enabled, events: found?.events || OMNI_EVENTS, current: check.list,
  };
}


async function uaz(baseUrl: string, path: string, headers: Record<string, string>, method = 'GET', body?: any) {
  const url = `${sanitize(baseUrl)}${path}`;
  let lastErr: any = null;
  for (let attempt = 0; attempt < (method === 'GET' ? 3 : 1); attempt++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 25000);
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Connection': 'close', ...headers },
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal, redirect: 'error',
      });
      clearTimeout(t);
      const text = await r.text();
      let json: any = null; try { json = JSON.parse(text); } catch {}
      return { ok: r.ok, status: r.status, text, json };
    } catch (e: any) {
      lastErr = e;
      const msg = String(e?.message || e);
      if (!/http2|SendRequest|connection|reset|ECONNRESET|timeout|aborted|network/i.test(msg)) break;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  return { ok: false, status: 0, text: String(lastErr?.message || lastErr || 'network_error'), json: null };
}

// Converte respostas de erro (HTML de proxy, 401, 5xx) numa mensagem legível
function explain(r: { ok: boolean; status: number; text: string; json: any }, baseUrl: string) {
  const raw = (r.text || '').trim();
  const isHtml = raw.startsWith('<');
  if (r.status === 0) {
    return { error: `Não foi possível alcançar ${baseUrl}. Verifique a URL do servidor.`, hint: 'O servidor não respondeu (timeout/DNS). Confirme o endereço na aba OmniConect.' };
  }
  if (r.status === 502 || r.status === 503 || r.status === 504) {
    return { error: `Servidor UAZAPI (${baseUrl}) indisponível no momento (HTTP ${r.status}).`, hint: 'O servidor está fora do ar ou o subdomínio mudou. Atualize a URL do servidor na aba OmniConect e tente novamente.' };
  }
  if (r.status === 401 || r.status === 403) {
    return { error: 'Admin Token inválido ou sem permissão neste servidor.', hint: 'Copie novamente o Admin Token no painel UAZAPI e salve na aba OmniConect.' };
  }
  if (r.status === 404) {
    return { error: `Endpoint não encontrado em ${baseUrl} (404).`, hint: 'A URL do servidor pode estar incorreta.' };
  }
  const detail = r.json?.error || r.json?.message || (isHtml ? '' : raw.slice(0, 300));
  return { error: detail || `Erro HTTP ${r.status} no servidor UAZAPI.`, hint: isHtml ? 'O servidor respondeu com uma página de erro (proxy). Verifique a URL do servidor.' : undefined };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: auth } } });
    const jwt = auth.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(jwt);
    const userId = claimsData?.claims?.sub as string | undefined;
    if (claimsErr || !userId || claimsData?.claims?.role !== 'authenticated') {
      return new Response(JSON.stringify({ ok: false, error: 'Sessão expirada. Entre novamente.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);

    const body = await req.json();
    const action = body.action as string;
    let baseUrl = sanitize(body.base_url || '');
    const adminToken = body.admin_token || '';
    const instanceName = (body.instance_name || `omni_${userId.slice(0, 6)}_${Date.now().toString(36)}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    let instanceToken = body.instance_token || '';
    if (action === 'delete') {
      if (typeof body.config_id !== 'string') return new Response(JSON.stringify({ ok: false, error: 'Selecione uma conexão salva para excluir.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { data: cfg } = await admin.from('whatsapp_configs').select('id, base_url, api_token, api_type').eq('id', body.config_id).eq('user_id', userId).maybeSingle();
      if (!cfg || cfg.api_type !== 'omniconect') return new Response(JSON.stringify({ ok: false, error: 'Conexão não encontrada nesta conta.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      baseUrl = sanitize(cfg.base_url); instanceToken = cfg.api_token;
    }

    if (!isPublicHttpsUrl(baseUrl)) {
      return new Response(JSON.stringify({ ok: false, error: 'base_url inválida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'list' || action === 'ping') {
      if (!adminToken) return new Response(JSON.stringify({ ok: false, error: 'admin_token obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const r = await uaz(baseUrl, '/instance/all', { admintoken: adminToken }, 'GET');
      if (!r.ok) {
        return new Response(JSON.stringify({ ok: false, status: r.status, ...explain(r, baseUrl) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const instances = Array.isArray(r.json) ? r.json : (r.json?.instances || []);
      return new Response(JSON.stringify({ ok: true, instances, raw: r.json }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'create') {
      if (!adminToken) return new Response(JSON.stringify({ ok: false, error: 'admin_token obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      // Health-check antes de criar: evita mensagens de erro em HTML de proxy
      const health = await uaz(baseUrl, '/instance/all', { admintoken: adminToken }, 'GET');
      if (!health.ok) {
        return new Response(JSON.stringify({ ok: false, status: health.status, ...explain(health, baseUrl) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      let r = await uaz(baseUrl, '/instance/create', { admintoken: adminToken }, 'POST', { name: instanceName });
      if (!r.ok && (r.status === 404 || r.status === 405)) {
        r = await uaz(baseUrl, '/instance/init', { admintoken: adminToken }, 'POST', { name: instanceName });
      }


      // Nunca reutilizar outra instância do servidor: ela pode pertencer a outro cliente.
      if (!r.ok && (r.status === 429 || /maximum number of instances|limit/i.test(r.text))) {
        return new Response(JSON.stringify({ ok: false, status: r.status, error: 'Limite de instâncias atingido. Exclua uma conexão antiga antes de criar outra.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (!r.ok) return new Response(JSON.stringify({ ok: false, status: r.status, ...explain(r, baseUrl), body: r.text.slice(0, 600) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const instToken = r.json?.token || r.json?.instance?.token || '';
      if (!instToken) return new Response(JSON.stringify({ ok: false, error: 'O servidor criou uma resposta sem token de instância.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const qrcode = r.json?.instance?.qrcode || r.json?.qrcode || null;
      const paircode = r.json?.instance?.paircode || r.json?.paircode || null;

      const patch: any = {
        api_type: 'omniconect', base_url: baseUrl, instance_id: instanceName, api_token: instToken,
        extra_headers: { admin_token: adminToken }, is_active: true, webhook_instance_ids: [instanceName],
      };
      if (body.default_agent_id) patch.default_agent_id = body.default_agent_id;
      if (body.default_pipeline_id) patch.default_pipeline_id = body.default_pipeline_id;
      if (body.default_stage_id) patch.default_stage_id = body.default_stage_id;
      let configId = body.config_id;
      if (configId) {
        const saved = await admin.from('whatsapp_configs').update(patch).eq('id', configId).eq('user_id', userId).select('id').single();
        if (saved.error) throw new Error('Não foi possível salvar a conexão criada.');
      } else {
        const ins = await admin.from('whatsapp_configs').insert({ ...patch, user_id: userId, label: body.label || `OmniConect ${instanceName.slice(-6)}`, auto_create_lead: true, ai_auto_reply: false }).select('id').single();
        if (ins.error || !ins.data) throw new Error('Não foi possível salvar a conexão criada.');
        configId = ins.data.id;
      }

      const wh = await setOmniWebhook(baseUrl, instToken, configId);

      return new Response(JSON.stringify({
        ok: true, config_id: configId, instance_name: instanceName, instance_token: instToken,
        qrcode, paircode,
        webhook: { ok: wh.ok, status: wh.status, url: wh.url, verified: wh.verified, enabled: wh.enabled, events: wh.events, body: (wh.text || '').slice(0, 300) },
        raw: r.json,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'qr' || action === 'connect') {
      if (!instanceToken) return new Response(JSON.stringify({ ok: false, error: 'instance_token obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const payload: any = {};
      if (body.phone) payload.phone = body.phone;
      const r = await uaz(baseUrl, '/instance/connect', { token: instanceToken }, 'POST', payload);
      const inst = r.json?.instance || r.json;
      const qrcode = inst?.qrcode || r.json?.qrcode || null;
      const paircode = inst?.paircode || r.json?.paircode || null;
      const status = inst?.status || r.json?.status || null;
      let configId = body.config_id || null;
      if (!configId) {
        const { data: cfg } = await admin.from('whatsapp_configs').select('id, instance_id, webhook_instance_ids').eq('user_id', userId).eq('api_token', instanceToken).order('updated_at', { ascending: false }).limit(1).maybeSingle();
        configId = cfg?.id || null;
        if (cfg?.id) {
          const ids = Array.from(new Set([...(cfg.webhook_instance_ids || []), cfg.instance_id].filter(Boolean)));
          await admin.from('whatsapp_configs').update({ api_type: 'omniconect', base_url: baseUrl, is_active: true, webhook_instance_ids: ids }).eq('id', cfg.id);
        }
      }
      const wh = await setOmniWebhook(baseUrl, instanceToken, configId);
      return new Response(JSON.stringify({ ok: r.ok, qrcode, paircode, status, webhook: { ok: wh.ok, status: wh.status, url: wh.url, verified: wh.verified, enabled: wh.enabled, events: wh.events, body: (wh.text || '').slice(0, 300) }, raw: r.json }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'status') {
      if (!instanceToken) return new Response(JSON.stringify({ ok: false, error: 'instance_token obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const r = await uaz(baseUrl, '/instance/status', { token: instanceToken }, 'GET');
      const inst = r.json?.instance || r.json;
      const status = inst?.status || r.json?.status || null;
      return new Response(JSON.stringify({ ok: r.ok, status, connected: status === 'connected', raw: r.json }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'set_webhook') {
      if (!instanceToken) return new Response(JSON.stringify({ ok: false, error: 'instance_token obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const r = await setOmniWebhook(baseUrl, instanceToken, body.config_id || null, body.webhook_url);
      return new Response(JSON.stringify({
        ok: r.ok && r.verified, http_ok: r.ok, status: r.status, url: r.url,
        verified: r.verified, enabled: r.enabled, events: r.events, current: r.current,
        error: r.verified ? undefined : 'Webhook não confirmado no servidor UAZAPI.',
        body: (r.text || '').slice(0, 600),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'webhook_status') {
      if (!instanceToken) return new Response(JSON.stringify({ ok: false, error: 'instance_token obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const expected = body.webhook_url || webhookUrlFor(body.config_id || null);
      const chk = await getOmniWebhook(baseUrl, instanceToken);
      const found = chk.list.find((w: any) => (w?.url || '') === expected);
      return new Response(JSON.stringify({
        ok: chk.ok, expected_url: expected, verified: !!found,
        enabled: !!found && found.enabled !== false, events: found?.events || [], current: chk.list,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }


    if (action === 'disconnect') {
      if (!instanceToken) return new Response(JSON.stringify({ ok: false, error: 'instance_token obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const r = await uaz(baseUrl, '/instance/disconnect', { token: instanceToken }, 'POST');
      return new Response(JSON.stringify({ ok: r.ok, status: r.status, body: r.text.slice(0, 600) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'delete') {
      if (!instanceToken) return new Response(JSON.stringify({ ok: false, error: 'instance_token obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const r = await uaz(baseUrl, '/instance', { token: instanceToken }, 'DELETE');
      if (!canRemoveLocalConnection(r)) return new Response(JSON.stringify({ ok: false, status: r.status, ...explain(r, baseUrl), hint: 'A conexão foi mantida para você tentar excluir novamente.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const removed = await admin.from('whatsapp_configs').delete().eq('id', body.config_id).eq('user_id', userId);
      if (removed.error) throw new Error('Instância removida no servidor, mas não foi possível remover o cadastro local.');
      return new Response(JSON.stringify({ ok: true, remote_deleted: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: false, error: 'action inválida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Não foi possível concluir a operação. Confira sua sessão e a configuração do servidor.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
