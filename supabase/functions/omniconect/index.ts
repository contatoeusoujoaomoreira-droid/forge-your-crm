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

async function uaz(baseUrl: string, path: string, headers: Record<string, string>, method = 'GET', body?: any) {
  const r = await fetch(`${sanitize(baseUrl)}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json: any = null; try { json = JSON.parse(text); } catch {}
  return { ok: r.ok, status: r.status, text, json };
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

    if (action === 'create') {
      if (!adminToken) return new Response(JSON.stringify({ ok: false, error: 'admin_token obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const r = await uaz(baseUrl, '/instance/create', { admintoken: adminToken }, 'POST', { name: instanceName });
      if (!r.ok) return new Response(JSON.stringify({ ok: false, status: r.status, body: r.text.slice(0, 600) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const instToken = r.json?.token || r.json?.instance?.token || '';
      const qrcode = r.json?.instance?.qrcode || null;
      const paircode = r.json?.instance?.paircode || null;

      // Persist config
      const patch: any = {
        api_type: 'omniconect',
        base_url: baseUrl,
        instance_id: instanceName,
        api_token: instToken,
        extra_headers: { admin_token: adminToken },
        is_active: true,
        webhook_instance_ids: [instanceName],
      };
      let configId = body.config_id;
      if (configId) {
        await admin.from('whatsapp_configs').update(patch).eq('id', configId).eq('user_id', userId);
      } else {
        const ins = await admin.from('whatsapp_configs').insert({ ...patch, user_id: userId, label: body.label || `OmniConect ${instanceName.slice(-6)}`, auto_create_lead: true, ai_auto_reply: true }).select('id').single();
        if (ins.data) configId = (ins.data as any).id;
      }

      // Auto-configure webhook
      await uaz(baseUrl, '/webhook', { token: instToken }, 'POST', {
        url: WEBHOOK_URL,
        events: ['messages', 'connection'],
        excludeMessages: ['fromMe'],
        addUrlEvents: false,
        addUrlTypesMessages: false,
      }).catch(() => {});

      return new Response(JSON.stringify({ ok: true, config_id: configId, instance_name: instanceName, instance_token: instToken, qrcode, paircode, raw: r.json }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
      return new Response(JSON.stringify({ ok: r.ok, qrcode, paircode, status, raw: r.json }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
      const r = await uaz(baseUrl, '/webhook', { token: instanceToken }, 'POST', {
        url: body.webhook_url || WEBHOOK_URL,
        events: body.events || ['messages', 'connection'],
        excludeMessages: body.excludeMessages || ['fromMe'],
        addUrlEvents: false,
        addUrlTypesMessages: false,
      });
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
