// Evolution API v2 (GO) — lifecycle: create instance, QR, status, webhook, logout, delete.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const sanitize = (u: string) => (u || '').replace(/\/+$/, '');
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/webhook-receiver`;

async function evoFetch(baseUrl: string, path: string, apikey: string, method = 'GET', body?: any) {
  try {
    const r = await fetch(`${sanitize(baseUrl)}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', apikey },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await r.text();
    let json: any = null; try { json = JSON.parse(text); } catch {}
    return { ok: r.ok, status: r.status, text, json };
  } catch (e) {
    const msg = String(e?.message || e);
    const friendly = /dns error|failed to lookup|Name or service not known|ENOTFOUND/i.test(msg)
      ? `Não foi possível resolver o endereço do servidor Evolution (${baseUrl}). Verifique se a Base URL está correta e acessível publicamente.`
      : `Falha ao conectar no servidor Evolution: ${msg}`;
    return { ok: false, status: 0, text: friendly, json: { error: friendly } };
  }
}

const PLACEHOLDER_HOSTS = /(sua-evolution|seu-servidor|example\.com|localhost|127\.0\.0\.1|changeme)/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: auth } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const userId = userData.user.id;

    const body = await req.json();
    const action = body.action as string;
    const baseUrl = sanitize(body.base_url || '');
    const globalKey = body.global_api_key || '';
    const instanceName = (body.instance_name || `obc_${userId.slice(0, 8)}_${Date.now().toString(36)}`).replace(/[^a-zA-Z0-9_-]/g, '_');

    if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
      return new Response(JSON.stringify({ ok: false, error: 'base_url inválida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);

    if (action === 'create') {
      // Create instance + integrated webhook (Evolution v2)
      const payload = {
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        webhook: {
          url: WEBHOOK_URL,
          byEvents: false,
          base64: true,
          events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'MESSAGES_UPDATE', 'SEND_MESSAGE'],
        },
      };
      const r = await evoFetch(baseUrl, '/instance/create', globalKey, 'POST', payload);
      if (!r.ok) return new Response(JSON.stringify({ ok: false, status: r.status, body: r.text }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const instanceToken = r.json?.hash?.apikey || r.json?.hash || r.json?.instance?.apikey || globalKey;
      const qrcode = r.json?.qrcode?.base64 || r.json?.qrcode || null;
      // Persist config
      const configId = body.config_id;
      const patch: any = {
        api_type: 'evolution_go',
        base_url: baseUrl,
        instance_id: instanceName,
        api_token: instanceToken,
        extra_headers: { ...(body.extra_headers || {}), globalApiKey: globalKey },
        is_active: true,
        webhook_instance_ids: [instanceName],
      };
      if (configId) {
        await admin.from('whatsapp_configs').update(patch).eq('id', configId).eq('user_id', userId);
      } else {
        const ins = await admin.from('whatsapp_configs').insert({ ...patch, user_id: userId, label: body.label || `Evolution GO ${instanceName.slice(-6)}`, auto_create_lead: true, ai_auto_reply: true }).select().single();
        if (ins.data) (patch as any).id = ins.data.id;
      }
      return new Response(JSON.stringify({ ok: true, instance_name: instanceName, instance_token: instanceToken, qrcode, raw: r.json }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'qr') {
      const inst = body.instance_name || instanceName;
      // Try instance-specific token first if provided
      const key = body.instance_token || globalKey;
      const r = await evoFetch(baseUrl, `/instance/connect/${inst}`, key);
      const qrcode = r.json?.base64 || r.json?.qrcode?.base64 || r.json?.code || null;
      return new Response(JSON.stringify({ ok: r.ok, qrcode, raw: r.json, status: r.status, body: r.text.slice(0, 500) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'status') {
      const inst = body.instance_name;
      const key = body.instance_token || globalKey;
      const r = await evoFetch(baseUrl, `/instance/connectionState/${inst}`, key);
      const state = r.json?.instance?.state || r.json?.state || null;
      return new Response(JSON.stringify({ ok: r.ok, state, raw: r.json }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'set_webhook') {
      const inst = body.instance_name;
      const key = body.instance_token || globalKey;
      const payload = {
        webhook: {
          enabled: true,
          url: WEBHOOK_URL,
          byEvents: false,
          base64: true,
          events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'MESSAGES_UPDATE', 'SEND_MESSAGE'],
        },
      };
      const r = await evoFetch(baseUrl, `/webhook/set/${inst}`, key, 'POST', payload);
      return new Response(JSON.stringify({ ok: r.ok, status: r.status, body: r.text.slice(0, 500) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'logout') {
      const inst = body.instance_name;
      const key = body.instance_token || globalKey;
      const r = await evoFetch(baseUrl, `/instance/logout/${inst}`, key, 'DELETE');
      return new Response(JSON.stringify({ ok: r.ok, status: r.status, body: r.text.slice(0, 500) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'delete') {
      const inst = body.instance_name;
      const r = await evoFetch(baseUrl, `/instance/delete/${inst}`, globalKey, 'DELETE');
      return new Response(JSON.stringify({ ok: r.ok, status: r.status, body: r.text.slice(0, 500) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: false, error: 'action inválida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
