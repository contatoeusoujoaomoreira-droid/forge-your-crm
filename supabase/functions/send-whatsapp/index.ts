import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface SendBody {
  client_id?: string;
  phone?: string;
  content: string;
  media_url?: string;
  media_type?: string;
}

const normalizePhone = (raw: string) => raw.replace(/\D/g, '');

const sanitizeBaseUrl = (url: string) =>
  (url || '').replace(/\/$/, '')
    .replace(/\/send-text$/, '')
    .replace(/\/send-image$/, '')
    .replace(/\/send-document$/, '');

async function dispatch(provider: string, cfg: any, phone: string, body: SendBody) {
  const baseUrl = sanitizeBaseUrl(cfg.base_url || '');
  const token = cfg.api_token || '';
  const instance = cfg.instance_id || '';
  const extra = cfg.extra_headers || {};
  const hasMedia = !!body.media_url;

  switch (provider) {
    case 'z-api': {
      const path = hasMedia ? '/send-image' : '/send-text';
      const url = baseUrl.includes('/instances/') ? `${baseUrl}${path}` : `${baseUrl}/instances/${instance}/token/${token}${path}`;
      const payload: any = { phone };
      if (hasMedia) { payload.image = body.media_url; payload.caption = body.content; }
      else { payload.message = body.content; }
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
      const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
      const text = await resp.text();
      return { ok: resp.ok, status: resp.status, body: text };
    }
    case 'evolution': {
      const url = `${baseUrl}/message/sendText/${instance}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: token },
        body: JSON.stringify({ number: phone, text: body.content }),
      });
      const text = await resp.text();
      return { ok: resp.ok, status: resp.status, body: text };
    }
    case 'ultramsg': {
      const url = `${baseUrl}/${instance}/messages/chat`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token, to: phone, body: body.content }).toString(),
      });
      const text = await resp.text();
      return { ok: resp.ok, status: resp.status, body: text };
    }
    case 'botconversa': {
      // BotConversa: POST {base}/webhook/subscriber/{phone}/send_message/  (API Key in header)
      const url = `${baseUrl}/webhook/subscriber/${phone}/send_message/`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'API-KEY': token, ...extra },
        body: JSON.stringify({ type: hasMedia ? 'image' : 'text', value: hasMedia ? body.media_url : body.content, caption: body.content }),
      });
      const text = await resp.text();
      return { ok: resp.ok, status: resp.status, body: text };
    }
    case 'custom': {
      const resp = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...extra },
        body: JSON.stringify({ phone, message: body.content, media_url: body.media_url }),
      });
      const text = await resp.text();
      return { ok: resp.ok, status: resp.status, body: text };
    }
    default:
      return { ok: false, status: 400, body: `Provider ${provider} não suportado` };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = userData.user.id;
    const body: SendBody = await req.json();
    if (!body.content && !body.media_url) {
      return new Response(JSON.stringify({ error: 'content ou media_url obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);

    // Resolve phone
    let phone = body.phone ? normalizePhone(body.phone) : '';
    let clientRow: any = null;
    if (body.client_id) {
      const { data } = await admin.from('chat_clients').select('*').eq('id', body.client_id).maybeSingle();
      clientRow = data;
      if (data?.phone) phone = normalizePhone(data.phone);
    }
    if (!phone) {
      return new Response(JSON.stringify({ error: 'Phone required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get config
    const { data: cfg } = await admin.from('whatsapp_configs').select('*')
      .eq('user_id', userId).eq('is_active', true).maybeSingle();

    let externalSent = false;
    let externalError: string | null = null;
    if (cfg) {
      try {
        const result = await dispatch(cfg.api_type, cfg, phone, body);
        externalSent = result.ok;
        if (!result.ok) externalError = `[${result.status}] ${result.body}`.slice(0, 500);
      } catch (e) {
        externalError = String(e).slice(0, 500);
      }
    } else {
      externalError = 'WhatsApp não configurado';
    }

    // Always persist message
    const { data: msg } = await admin.from('messages').insert({
      user_id: userId,
      client_id: clientRow?.id || body.client_id || null,
      direction: 'outbound',
      channel: 'whatsapp',
      content: body.content,
      media_url: body.media_url,
      media_type: body.media_type,
      status: externalSent ? 'sent' : (cfg ? 'failed' : 'pending'),
      sender_phone: phone,
      metadata: { external_error: externalError },
    }).select().single();

    return new Response(JSON.stringify({
      success: true, message: msg, external_sent: externalSent, external_error: externalError, has_config: !!cfg,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('send-whatsapp error', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
