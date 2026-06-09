// OmniConect — integração WhatsApp via UAZAPI (https://docs.uazapi.com)
// Lifecycle: create (admintoken) -> connect/QR (token) -> status -> webhook -> disconnect -> delete
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/webhook-receiver`;

const sanitize = (u: string) => (u || '').replace(/\/+$/, '');
const OMNI_EVENTS = ['messages', 'messages_update', 'connection', 'chats', 'contacts'];
const webhookUrlFor = (configId?: string | null) => configId ? `${WEBHOOK_URL}?config_id=${encodeURIComponent(configId)}` : WEBHOOK_URL;

async function setOmniWebhook(baseUrl: string, instanceToken: string, configId?: string | null, customUrl?: string) {
  return await uaz(baseUrl, '/webhook', { token: instanceToken }, 'POST', {
    url: customUrl || webhookUrlFor(configId),
    events: OMNI_EVENTS,
  });
}

async function uaz(baseUrl: string, path: string, headers: Record<string, string>, method = 'GET', body?: any) {
  const url = `${sanitize(baseUrl)}${path}`;
  let lastErr: any = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 25000);
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Connection': 'close', ...headers },
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: auth } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = userData.user.id;
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);

    const body = await req.json();
    const action = body.action as string;
    const baseUrl = sanitize(body.base_url || 'https://free.uazapi.com');
    const adminToken = body.admin_token || '';
    const instanceName = (body.instance_name || `omni_${userId.slice(0, 6)}_${Date.now().toString(36)}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const instanceToken = body.instance_token || '';

    if (!/^https?:\/\//.test(baseUrl)) {
      return new Response(JSON.stringify({ ok: false, error: 'base_url inválida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'list') {
      if (!adminToken) return new Response(JSON.stringify({ ok: false, error: 'admin_token obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const r = await uaz(baseUrl, '/instance/all', { admintoken: adminToken }, 'GET');
      const instances = Array.isArray(r.json) ? r.json : (r.json?.instances || []);
      return new Response(JSON.stringify({ ok: r.ok, instances, raw: r.json }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'create') {
      if (!adminToken) return new Response(JSON.stringify({ ok: false, error: 'admin_token obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      let r = await uaz(baseUrl, '/instance/init', { admintoken: adminToken }, 'POST', { name: instanceName });
      if (!r.ok && (r.status === 404 || r.status === 405)) {
        r = await uaz(baseUrl, '/instance/create', { admintoken: adminToken }, 'POST', { name: instanceName });
      }

      // Handle "Maximum number of instances reached" → reuse an existing instance
      if (!r.ok && /maximum number of instances|limit/i.test(r.text)) {
        const listRes = await uaz(baseUrl, '/instance/all', { admintoken: adminToken }, 'GET');
        const all: any[] = Array.isArray(listRes.json) ? listRes.json : (listRes.json?.instances || []);
        const disconnected = all.find((i) => (i.status || '').toLowerCase() !== 'connected');
        const reuse = disconnected || all[0];
        if (reuse?.token) {
          const reuseToken = reuse.token;
          const reuseName = reuse.name || reuse.instanceName || instanceName;
          const patch: any = {
            api_type: 'omniconect', base_url: baseUrl, instance_id: reuseName, api_token: reuseToken,
            extra_headers: { admin_token: adminToken }, is_active: true, webhook_instance_ids: [reuseName],
          };
          if (body.default_agent_id) patch.default_agent_id = body.default_agent_id;
          if (body.default_pipeline_id) patch.default_pipeline_id = body.default_pipeline_id;
          if (body.default_stage_id) patch.default_stage_id = body.default_stage_id;
          let configId = body.config_id;
          if (configId) {
            await admin.from('whatsapp_configs').update(patch).eq('id', configId).eq('user_id', userId);
          } else {
            const ins = await admin.from('whatsapp_configs').insert({ ...patch, user_id: userId, label: body.label || `OmniConect ${String(reuseName).slice(-6)}`, auto_create_lead: true, ai_auto_reply: true }).select('id').single();
            if (ins.data) configId = (ins.data as any).id;
          }
          const wh = await setOmniWebhook(baseUrl, reuseToken, configId);
          const conn = await uaz(baseUrl, '/instance/connect', { token: reuseToken }, 'POST', {});
          const inst = conn.json?.instance || conn.json;
          return new Response(JSON.stringify({
            ok: true, reused: true, config_id: configId, instance_name: reuseName, instance_token: reuseToken,
            qrcode: inst?.qrcode || null, paircode: inst?.paircode || null,
            webhook: { ok: wh.ok, status: wh.status, body: (wh.text || '').slice(0, 300) },
            raw: conn.json,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ ok: false, status: r.status, error: 'Limite de instâncias atingido. Remova uma conexão antiga para liberar espaço.', body: r.text.slice(0, 600) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (!r.ok) return new Response(JSON.stringify({ ok: false, status: r.status, body: r.text.slice(0, 600) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const instToken = r.json?.token || r.json?.instance?.token || '';
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
        await admin.from('whatsapp_configs').update(patch).eq('id', configId).eq('user_id', userId);
      } else {
        const ins = await admin.from('whatsapp_configs').insert({ ...patch, user_id: userId, label: body.label || `OmniConect ${instanceName.slice(-6)}`, auto_create_lead: true, ai_auto_reply: true }).select('id').single();
        if (ins.data) configId = (ins.data as any).id;
      }

      const wh = await setOmniWebhook(baseUrl, instToken, configId);

      return new Response(JSON.stringify({
        ok: true, config_id: configId, instance_name: instanceName, instance_token: instToken,
        qrcode, paircode,
        webhook: { ok: wh.ok, status: wh.status, body: (wh.text || '').slice(0, 300) },
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
      return new Response(JSON.stringify({ ok: r.ok, qrcode, paircode, status, webhook: { ok: wh.ok, status: wh.status, body: (wh.text || '').slice(0, 300) }, raw: r.json }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
      return new Response(JSON.stringify({ ok: r.ok, status: r.status, body: r.text.slice(0, 600) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'disconnect') {
      if (!instanceToken) return new Response(JSON.stringify({ ok: false, error: 'instance_token obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const r = await uaz(baseUrl, '/instance/disconnect', { token: instanceToken }, 'POST');
      return new Response(JSON.stringify({ ok: r.ok, status: r.status, body: r.text.slice(0, 600) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'delete') {
      if (!instanceToken) return new Response(JSON.stringify({ ok: false, error: 'instance_token obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const r = await uaz(baseUrl, '/instance/', { token: instanceToken }, 'DELETE');
      return new Response(JSON.stringify({ ok: r.ok, status: r.status, body: r.text.slice(0, 600) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: false, error: 'action inválida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
