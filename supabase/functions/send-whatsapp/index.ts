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
  filename?: string;
  manual_takeover?: boolean;
  pause_minutes?: number | null; // null = permanent, number = explicit minutes (overrides agent config)
  template_name?: string;
  template_language?: string;
  template_variables?: any[];
  template_header?: any;
  template_buttons?: any[];
}

function mapUmcliqueMediaType(mediaType?: string, mediaUrl?: string): 'image' | 'video' | 'audio' | 'document' {
  const m = (mediaType || '').toLowerCase().trim();
  if (m.startsWith('image') || m === 'img' || m === 'photo' || m === 'picture') return 'image';
  if (m.startsWith('video') || m === 'mp4') return 'video';
  if (m.startsWith('audio') || m === 'voice' || m === 'ptt' || m === 'ogg' || m === 'mp3') return 'audio';
  if (m.startsWith('application') || m === 'document' || m === 'doc' || m === 'pdf' || m === 'file') return 'document';
  const url = (mediaUrl || '').toLowerCase();
  if (/\.(jpe?g|png|gif|webp|bmp)(\?|$)/.test(url)) return 'image';
  if (/\.(mp4|mov|webm|avi|mkv)(\?|$)/.test(url)) return 'video';
  if (/\.(mp3|ogg|wav|m4a|aac|opus)(\?|$)/.test(url)) return 'audio';
  if (/\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip)(\?|$)/.test(url)) return 'document';
  return 'image';
}

function mapOmniconectType(mediaType?: string, mediaUrl?: string): string {
  return mapUmcliqueMediaType(mediaType, mediaUrl);
}

const normalizePhone = (raw: string) => raw.replace(/\D/g, '');

const sanitizeBaseUrl = (url: string) =>
  (url || '').replace(/\/$/, '')
    .replace(/\/send-text$/, '')
    .replace(/\/send-image$/, '')
    .replace(/\/send-document$/, '');

const configMatchesClient = (cfg: any, client: any) => {
  const entry = String(client?.metadata?.entry_instance || client?.metadata?.instance_id || '').trim();
  if (!entry) return false;
  return cfg?.instance_id === entry || (Array.isArray(cfg?.webhook_instance_ids) && cfg.webhook_instance_ids.includes(entry));
};

async function resolveWhatsAppConfig(admin: any, userId: string, clientRow: any) {
  const { data: cfgs } = await admin.from('whatsapp_configs').select('*')
    .eq('user_id', userId).eq('is_active', true).order('updated_at', { ascending: false });
  const list = cfgs || [];
  return list.find((cfg: any) => configMatchesClient(cfg, clientRow)) || list[0] || null;
}

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
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(payload) });
      const text = await resp.text();
      return { ok: resp.ok, status: resp.status, body: text };
    }
    case 'wasender': {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, Accept: 'application/json', ...extra };
      let url = `${baseUrl}/api/send-message`;
      const payload: any = { to: phone };
      if (hasMedia) {
        const mt = (body.media_type || '').toLowerCase();
        const url_ = body.media_url;
        if (mt.startsWith('image') || /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url_!)) {
          url = `${baseUrl}/api/send-image`; payload.imageUrl = url_;
          if (body.content) payload.text = body.content;
        } else if (mt.startsWith('video') || /\.(mp4|mov|webm)(\?|$)/i.test(url_!)) {
          url = `${baseUrl}/api/send-video`; payload.videoUrl = url_;
          if (body.content) payload.text = body.content;
        } else if (mt.startsWith('audio') || /\.(mp3|ogg|m4a|opus|wav)(\?|$)/i.test(url_!)) {
          url = `${baseUrl}/api/send-audio`; payload.audioUrl = url_;
        } else {
          url = `${baseUrl}/api/send-document`; payload.documentUrl = url_;
          if (body.filename) payload.fileName = body.filename;
          if (body.content) payload.text = body.content;
        }
      } else {
        payload.text = body.content;
      }
      const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
      const text = await resp.text();
      return { ok: resp.ok, status: resp.status, body: text, sent_payload: payload };
    }
    case 'umclique': {
      const url = `${baseUrl}/public-send-message`;
      const isTemplate = !!body.template_name;
      const payload: any = { channel_id: instance, to: phone };
      if (isTemplate) {
        payload.type = 'template';
        payload.template_name = body.template_name;
        payload.template_language = body.template_language || 'pt_BR';
        if (body.template_variables) payload.template_variables = body.template_variables;
        if (body.template_header) payload.template_header = body.template_header;
        if (body.template_buttons) payload.template_buttons = body.template_buttons;
      } else if (hasMedia) {
        payload.type = mapUmcliqueMediaType(body.media_type, body.media_url);
        payload.url = body.media_url;
        if (body.content) payload.caption = body.content;
        if (payload.type === 'document' && body.filename) payload.filename = body.filename;
      } else {
        payload.type = 'text';
        payload.content = body.content;
      }
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': token, ...extra }, body: JSON.stringify(payload) });
      const text = await resp.text();
      return { ok: resp.ok, status: resp.status, body: text, sent_payload: payload };
    }
    case 'omniconect': {
      // UAZAPI: header `token: <instance_token>`
      const headers: Record<string, string> = { 'Content-Type': 'application/json', token };
      const parseExt = (txt: string) => { try { const j = JSON.parse(txt); return j?.id || j?.messageID || j?.messageId || j?.message?.id || j?.key?.id || null; } catch { return null; } };
      if (hasMedia) {
        const type = mapOmniconectType(body.media_type, body.media_url);
        const payload: any = { number: phone, type, file: body.media_url };
        if (body.content) payload.text = body.content;
        if (body.filename) payload.docName = body.filename;
        const resp = await fetch(`${baseUrl}/send/media`, { method: 'POST', headers, body: JSON.stringify(payload) });
        const txt = (await resp.text()).slice(0, 800);
        return { ok: resp.ok, status: resp.status, body: txt, sent_payload: payload, external_id: parseExt(txt) };
      }
      const payload = { number: phone, text: body.content };
      const resp = await fetch(`${baseUrl}/send/text`, { method: 'POST', headers, body: JSON.stringify(payload) });
      const txt = (await resp.text()).slice(0, 800);
      return { ok: resp.ok, status: resp.status, body: txt, sent_payload: payload, external_id: parseExt(txt) };
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

    let phone = body.phone ? normalizePhone(body.phone) : '';
    let clientRow: any = null;
    if (body.client_id) {
      const { data } = await admin.from('chat_clients').select('*').eq('id', body.client_id).maybeSingle();
      if (data && data.user_id !== userId) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      clientRow = data;
      if (data?.phone) phone = normalizePhone(data.phone);
    }
    if (!phone) {
      return new Response(JSON.stringify({ error: 'Phone required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const cfg = await resolveWhatsAppConfig(admin, userId, clientRow);

    let externalSent = false;
    let externalError: string | null = null;
    let externalStatus: number | null = null;
    let externalBody: string | null = null;
    let sentPayload: any = null;
    let externalId: string | null = null;
    if (cfg) {
      try {
        const result: any = await dispatch(cfg.api_type, cfg, phone, body);
        externalSent = result.ok;
        externalStatus = result.status ?? null;
        externalBody = (result.body || '').toString().slice(0, 1000);
        sentPayload = result.sent_payload ?? null;
        externalId = result.external_id ?? null;
        if (!result.ok) externalError = `[${result.status}] ${result.body}`.slice(0, 500);
      } catch (e) {
        externalError = String(e).slice(0, 500);
      }
    } else {
      externalError = 'WhatsApp não configurado';
    }

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
      external_message_id: externalId,
      metadata: {
        external_error: externalError,
        external_status: externalStatus,
        external_body: externalBody,
        provider: cfg?.api_type || null,
        sent_payload: sentPayload,
        instance_id: cfg?.instance_id || null,
        instance_label: cfg?.label || null,
      },
    }).select().single();

    if (clientRow?.id) {
      if (body.manual_takeover === true) {
        await admin.from('conversation_state').upsert({
          user_id: userId, client_id: clientRow.id,
          ai_active: false, mode: 'manual',
          last_human_reply_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'client_id' });
      } else {
        await admin.from('conversation_state').upsert({
          user_id: userId, client_id: clientRow.id,
          last_human_reply_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'client_id' });
      }
      try { await admin.rpc('schedule_handoff_resume', { _client_id: clientRow.id }); } catch (_) {}
      await admin.from('chat_clients').update({ last_outbound_at: new Date().toISOString() }).eq('id', clientRow.id);
      try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/cron-worker`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'handoff_human', user_id: userId, payload: { name: clientRow.name || phone } }),
        });
      } catch {}
    }

    if (externalSent) {
      const action = body.media_url ? 'image_vision' : 'chat_message_text';
      try {
        await admin.rpc('deduct_credits_by_action', {
          _user_id: userId, _action: action, _quantity: 1,
          _metadata: { phone, message_id: msg?.id, channel: 'whatsapp' },
        });
      } catch (e) { console.warn('credit deduction failed', e); }
    }

    return new Response(JSON.stringify({
      success: externalSent,
      message: msg,
      external_sent: externalSent,
      external_error: externalError,
      external_status: externalStatus,
      external_body: externalBody,
      sent_payload: sentPayload,
      has_config: !!cfg,
      provider: cfg?.api_type || null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('send-whatsapp error', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
