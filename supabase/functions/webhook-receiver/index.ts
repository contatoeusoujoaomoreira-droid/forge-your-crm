import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

const PROVIDER_DEFAULT_MODEL: Record<string, string> = {
  lovable: 'google/gemini-2.5-flash',
  openai: 'gpt-4o-mini',
  groq: 'llama-3.3-70b-versatile',
  gemini: 'gemini-2.0-flash',
};

async function sha256(str: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const normalizePhone = (raw: string) => (raw || '').replace(/\D/g, '');

const normalizeLegacyModel = (model?: string | null) => {
  const m = (model || '').trim();
  if (!m) return '';
  if (m === 'google/gemini-3-flash-preview') return 'google/gemini-2.5-flash';
  if (m === 'google/gemini-3-pro-preview' || m === 'google/gemini-3.1-pro-preview') return 'google/gemini-2.5-pro';
  if (m === 'gemini-2.0-flash-exp') return 'gemini-2.0-flash';
  return m;
};

const modelMatchesProvider = (provider: string, model: string) => {
  if (provider === 'lovable') return model.startsWith('google/') || model.startsWith('openai/');
  if (provider === 'openai') return model.startsWith('gpt-') || model.startsWith('o');
  if (provider === 'groq') return model.startsWith('llama-') || model.startsWith('mixtral-');
  if (provider === 'gemini') return model.startsWith('gemini-');
  return true;
};

function resolveAiRuntime(agent: any, cfg?: any) {
  const provider = cfg?.provider || 'lovable';
  let endpoint = 'https://ai.gateway.lovable.dev/v1/chat/completions';
  let apiKey = LOVABLE_API_KEY;
  if (provider === 'openai' && cfg?.api_key_encrypted) { endpoint = 'https://api.openai.com/v1/chat/completions'; apiKey = cfg.api_key_encrypted; }
  if (provider === 'groq' && cfg?.api_key_encrypted) { endpoint = 'https://api.groq.com/openai/v1/chat/completions'; apiKey = cfg.api_key_encrypted; }
  if (provider === 'gemini' && cfg?.api_key_encrypted) { endpoint = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'; apiKey = cfg.api_key_encrypted; }
  let agentModel = normalizeLegacyModel(agent?.model);
  if (provider === 'openai' && agentModel.startsWith('openai/')) agentModel = agentModel.replace('openai/', '');
  if (provider === 'gemini' && agentModel.startsWith('google/')) agentModel = agentModel.replace('google/', '');
  let cfgModel = normalizeLegacyModel(cfg?.default_model);
  if (provider === 'openai' && cfgModel.startsWith('openai/')) cfgModel = cfgModel.replace('openai/', '');
  if (provider === 'gemini' && cfgModel.startsWith('google/')) cfgModel = cfgModel.replace('google/', '');
  const fallback = PROVIDER_DEFAULT_MODEL[provider] || PROVIDER_DEFAULT_MODEL.lovable;
  const model = modelMatchesProvider(provider, agentModel) ? agentModel : (modelMatchesProvider(provider, cfgModel) ? cfgModel : fallback);
  return { endpoint, apiKey, model, provider };
}

function buildSystemPrompt(agent: any, ctx: string) {
  return [
    agent.system_prompt || 'Você é um assistente profissional no WhatsApp.',
    `Nome de apresentação: ${agent.display_name || agent.name || 'Agente'}`,
    `Personalidade: ${agent.personality || 'profissional'}`,
    `Estilo: ${agent.style || 'consultivo'}`,
    `Tom: ${agent.tone || 'cordial'}`,
    agent.rules ? `Regras e restrições:\n${agent.rules}` : '',
    agent.examples ? `Exemplos de conversa:\n${agent.examples}` : '',
    agent.objections ? `Objeções e respostas:\n${agent.objections}` : '',
    ctx ? `BASE DE CONHECIMENTO:\n${ctx}` : '',
  ].filter(Boolean).join('\n\n');
}

interface NormalizedMsg {
  phone: string;
  name?: string;
  content: string;
  external_message_id?: string;
  media_url?: string;
  media_type?: string;
  from_me?: boolean;
  timestamp?: string;
}

function normalizeZApi(raw: any): NormalizedMsg {
  const phone = raw.phone || raw.from || raw.sender || '';
  const name = raw.senderName || raw.chatName || raw.notifyName;
  const mediaType = raw.image ? 'image' : raw.video ? 'video' : raw.audio ? 'audio' : raw.document ? 'document' : undefined;
  const mediaCaption = raw.image?.caption || raw.video?.caption || raw.document?.caption || '';
  const text = raw.text?.message || raw.message?.text || raw.message || raw.body || raw.caption || mediaCaption || '';
  const moment = Number(raw.momment || raw.moment || raw.timestamp || 0);
  return {
    phone: normalizePhone(phone),
    name,
    content: text || (mediaType ? `[${mediaType}]` : ''),
    external_message_id: raw.messageId || raw.messageID || raw.id || raw.key?.id,
    media_url: raw.image?.imageUrl || raw.video?.videoUrl || raw.audio?.audioUrl || raw.document?.documentUrl,
    media_type: mediaType,
    from_me: raw.fromMe === true || raw.fromMe === 'true',
    timestamp: moment ? new Date(moment).toISOString() : undefined,
  };
}

function normalizeEvolution(raw: any): NormalizedMsg {
  const data = raw.data || raw;
  const key = data.key || {};
  const msg = data.message || {};
  const phone = (key.remoteJid || '').split('@')[0];
  const text = msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || '';
  return {
    phone: normalizePhone(phone),
    name: data.pushName,
    content: text,
    external_message_id: key.id,
    from_me: key.fromMe === true,
  };
}

function detectAndNormalize(raw: any): NormalizedMsg | null {
  if (raw.type === 'ReceivedCallback' || raw.event === 'message' || raw.text || raw.messageId || raw.phone) return normalizeZApi(raw);
  if (raw.data?.key) return normalizeEvolution(raw);
  if (raw.phone && raw.message) {
    return { phone: normalizePhone(raw.phone), name: raw.name, content: raw.message };
  }
  return null;
}

// Transcribe audio. Tries the agent's selected provider first (Groq Whisper, OpenAI Whisper),
// then falls back to OpenAI key. Returns text or '' on failure.
async function transcribeAudio(audioUrl: string, providerCfg: any, openaiKey: string): Promise<string> {
  try {
    const audioResp = await fetch(audioUrl);
    if (!audioResp.ok) return '';
    const buf = await audioResp.arrayBuffer();
    const blob = new Blob([buf], { type: 'audio/ogg' });

    // Groq Whisper (fast + cheap) when user selected Groq
    if (providerCfg?.provider === 'groq' && providerCfg?.api_key_encrypted) {
      const fd = new FormData();
      fd.append('file', blob, 'audio.ogg');
      fd.append('model', 'whisper-large-v3-turbo');
      fd.append('language', 'pt');
      const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${providerCfg.api_key_encrypted}` },
        body: fd,
      });
      if (r.ok) { const j = await r.json(); return j.text || ''; }
      console.error('groq whisper failed', await r.text());
    }

    // OpenAI Whisper fallback
    const key = (providerCfg?.provider === 'openai' && providerCfg?.api_key_encrypted) || openaiKey;
    if (!key) return '';
    const fd = new FormData();
    fd.append('file', blob, 'audio.ogg');
    fd.append('model', 'whisper-1');
    fd.append('language', 'pt');
    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: fd,
    });
    if (!r.ok) { console.error('whisper failed', await r.text()); return ''; }
    const j = await r.json();
    return j.text || '';
  } catch (e) {
    console.error('transcribeAudio error', e);
    return '';
  }
}

// Describe image via the agent's selected vision provider.
async function describeImage(imageUrl: string, providerCfg: any, openaiKey: string): Promise<string> {
  try {
    // Gemini vision when user selected Google
    if (providerCfg?.provider === 'google' && providerCfg?.api_key_encrypted) {
      const imgResp = await fetch(imageUrl);
      const ct = imgResp.headers.get('content-type') || 'image/jpeg';
      const b64 = btoa(String.fromCharCode(...new Uint8Array(await imgResp.arrayBuffer())));
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${providerCfg.api_key_encrypted}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [
          { text: 'Descreva brevemente em português o conteúdo desta imagem (1-2 frases).' },
          { inline_data: { mime_type: ct, data: b64 } },
        ]}]}),
      });
      if (r.ok) { const j = await r.json(); return j.candidates?.[0]?.content?.parts?.[0]?.text || ''; }
    }

    const key = (providerCfg?.provider === 'openai' && providerCfg?.api_key_encrypted) || openaiKey;
    if (!key) return '';
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Descreva brevemente em português o conteúdo desta imagem (1-2 frases, foco no que é relevante para atendimento de cliente).' },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        }],
        max_tokens: 200,
      }),
    });
    if (!r.ok) return '';
    const j = await r.json();
    return j.choices?.[0]?.message?.content || '';
  } catch (e) {
    console.error('describeImage error', e);
    return '';
  }
}

// Generate audio (Omni native via LOVABLE/OpenAI, OpenAI direct, or ElevenLabs)
async function generateTtsBase64(text: string, voice: string, openaiKey: string, provider: string = 'omni', elevenKey: string = ''): Promise<string> {
  try {
    const input = text.slice(0, 4000);
    if (provider === 'elevenlabs' && elevenKey) {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: { 'xi-api-key': elevenKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input, model_id: 'eleven_multilingual_v2' }),
      });
      if (!r.ok) { console.error('ElevenLabs TTS failed', await r.text()); return ''; }
      const buf = new Uint8Array(await r.arrayBuffer());
      let binary = ''; const chunk = 0x8000;
      for (let i = 0; i < buf.length; i += chunk) binary += String.fromCharCode(...buf.subarray(i, i + chunk));
      return `data:audio/mpeg;base64,${btoa(binary)}`;
    }
    // Omni native uses LOVABLE_API_KEY against OpenAI; fallback to user openaiKey
    const key = (provider === 'omni' && LOVABLE_API_KEY) ? LOVABLE_API_KEY : openaiKey;
    if (!key) return '';
    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'tts-1', voice: voice || 'alloy', input, response_format: 'mp3' }),
    });
    if (!r.ok) {
      // Fallback to user openaiKey if omni gateway fails
      if (provider === 'omni' && openaiKey && openaiKey !== key) {
        const r2 = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'tts-1', voice: voice || 'alloy', input, response_format: 'mp3' }),
        });
        if (!r2.ok) { console.error('TTS fallback failed', await r2.text()); return ''; }
        const buf = new Uint8Array(await r2.arrayBuffer());
        let binary = ''; const chunk = 0x8000;
        for (let i = 0; i < buf.length; i += chunk) binary += String.fromCharCode(...buf.subarray(i, i + chunk));
        return `data:audio/mpeg;base64,${btoa(binary)}`;
      }
      console.error('TTS failed', await r.text()); return '';
    }
    const buf = new Uint8Array(await r.arrayBuffer());
    let binary = ''; const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) binary += String.fromCharCode(...buf.subarray(i, i + chunk));
    return `data:audio/mpeg;base64,${btoa(binary)}`;
  } catch (e) {
    console.error('TTS error', e);
    return '';
  }
}

async function callAi(systemPrompt: string, history: { role: string; content: string }[], runtime: { endpoint: string; apiKey: string; model: string }) {
  const resp = await fetch(runtime.endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${runtime.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: runtime.model,
      messages: [{ role: 'system', content: systemPrompt }, ...history],
    }),
  });
  if (!resp.ok) throw new Error(`AI ${resp.status}: ${await resp.text()}`);
  const json = await resp.json();
  return json.choices?.[0]?.message?.content || '';
}

const sanitizeBaseUrl = (u: string) => (u || '').replace(/\/$/, '').replace(/\/send-text$/, '').replace(/\/send-image$/, '').replace(/\/send-audio$/, '');

async function sendWhatsApp(cfg: any, phone: string, content: string) {
  const baseUrl = sanitizeBaseUrl(cfg.base_url || '');
  const token = cfg.api_token || '';
  const instance = cfg.instance_id || '';
  const extra = cfg.extra_headers || {};
  switch (cfg.api_type) {
    case 'z-api': {
      const root = baseUrl.includes('/instances/') ? baseUrl : `${baseUrl}/instances/${instance}/token/${token}`;
      const resp = await fetch(`${root}/send-text`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...extra }, body: JSON.stringify({ phone, message: content }) });
      return { ok: resp.ok, status: resp.status, body: (await resp.text()).slice(0, 500) };
    }
    case 'evolution': {
      const resp = await fetch(`${baseUrl}/message/sendText/${instance}`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: token }, body: JSON.stringify({ number: phone, text: content }) });
      return { ok: resp.ok, status: resp.status, body: (await resp.text()).slice(0, 500) };
    }
    case 'ultramsg': {
      const resp = await fetch(`${baseUrl}/${instance}/messages/chat`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token, to: phone, body: content }).toString() });
      return { ok: resp.ok, status: resp.status, body: (await resp.text()).slice(0, 500) };
    }
    default: {
      const resp = await fetch(baseUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...extra }, body: JSON.stringify({ phone, message: content }) });
      return { ok: resp.ok, status: resp.status, body: (await resp.text()).slice(0, 500) };
    }
  }
}

async function sendWhatsAppAudio(cfg: any, phone: string, audioDataUrl: string) {
  const baseUrl = sanitizeBaseUrl(cfg.base_url || '');
  const token = cfg.api_token || '';
  const instance = cfg.instance_id || '';
  const extra = cfg.extra_headers || {};
  if (cfg.api_type === 'z-api') {
    const root = baseUrl.includes('/instances/') ? baseUrl : `${baseUrl}/instances/${instance}/token/${token}`;
    const resp = await fetch(`${root}/send-audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...extra },
      body: JSON.stringify({ phone, audio: audioDataUrl }),
    });
    return { ok: resp.ok, status: resp.status, body: (await resp.text()).slice(0, 500) };
  }
  // Other providers: fall back to text — caller already has text reply
  return { ok: false, status: 400, body: 'Audio reply only supported on Z-API' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  let raw: any;
  try { raw = await req.json(); } catch { raw = {}; }

  const apiKey = req.headers.get('x-api-key') || url.searchParams.get('api_key') || raw.api_key;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);
  let userId = '';
  let matchedConfig: any = null;

  if (apiKey) {
    const keyHash = await sha256(apiKey);
    const { data: keyRow } = await admin.from('api_keys').select('*').eq('key_hash', keyHash).eq('is_active', true).maybeSingle();
    if (!keyRow) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    await admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyRow.id);
    userId = keyRow.user_id;
  } else {
    const instanceFromPayload = String(raw.instanceId || raw.instance_id || raw.instance || raw.instanceName || '').trim();
    if (instanceFromPayload) {
      // Use limit(1) instead of maybeSingle so duplicate instance_ids never break routing
      const { data: cfgRows } = await admin.from('whatsapp_configs')
        .select('*')
        .eq('instance_id', instanceFromPayload)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1);
      const cfgByInstance = cfgRows?.[0];
      if (cfgByInstance) { userId = cfgByInstance.user_id; matchedConfig = cfgByInstance; }
      // Fallback: try inactive configs as a last resort to still log who owns it
      if (!userId) {
        const { data: anyRows } = await admin.from('whatsapp_configs')
          .select('*').eq('instance_id', instanceFromPayload)
          .order('updated_at', { ascending: false }).limit(1);
        const any = anyRows?.[0];
        if (any) { userId = any.user_id; matchedConfig = any; }
      }
    }
    if (!userId) {
      // Log the orphan webhook so admins can debug
      try { await admin.from('webhook_logs').insert({ direction: 'inbound', source: 'whatsapp', payload: raw, error: `No matching instance: ${instanceFromPayload || '(empty)'}`, status_code: 401 }); } catch {}
      return new Response(JSON.stringify({ error: 'Missing API key or known WhatsApp instance', instance: instanceFromPayload }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  await admin.from('webhook_logs').insert({ user_id: userId, direction: 'inbound', source: 'whatsapp', payload: raw });

  const msg = detectAndNormalize(raw);
  if (!msg || !msg.phone || msg.from_me) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (msg.external_message_id) {
    const { data: dup } = await admin.from('messages').select('id').eq('user_id', userId).eq('external_message_id', msg.external_message_id).maybeSingle();
    if (dup) return new Response(JSON.stringify({ ok: true, duplicate: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  let { data: client } = await admin.from('chat_clients').select('*')
    .eq('user_id', userId).eq('phone', msg.phone).maybeSingle();
  if (!client) {
    const { data: created, error: createClientErr } = await admin.from('chat_clients').insert({
      user_id: userId, phone: msg.phone, name: msg.name || msg.phone, source: 'whatsapp',
    }).select().single();
    if (createClientErr) {
      const { data: existing } = await admin.from('chat_clients').select('*')
        .eq('user_id', userId).eq('phone', msg.phone).maybeSingle();
      client = existing;
    } else {
      client = created;
    }
  } else {
    await admin.from('chat_clients').update({
      name: msg.name || client.name,
      updated_at: new Date().toISOString(),
      source: client.source || 'whatsapp',
    }).eq('id', client.id);
  }

  if (!client) {
    return new Response(JSON.stringify({ error: 'Could not resolve chat client' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Use matched config (multi-instance) if available; otherwise fallback to first active for the user
  const { data: waCfg } = matchedConfig
    ? { data: matchedConfig }
    : await admin.from('whatsapp_configs').select('*').eq('user_id', userId).eq('is_active', true).order('created_at').limit(1).maybeSingle();

  if (client && !client.lead_id && waCfg?.auto_create_lead) {
    let stageId = waCfg.default_stage_id;
    if (!stageId) {
      const { data: firstStage } = await admin.from('pipeline_stages').select('id').eq('user_id', userId).order('position').limit(1).maybeSingle();
      stageId = firstStage?.id;
    }
    if (stageId) {
      const { data: lead } = await admin.from('leads').insert({
        user_id: userId, name: client.name || msg.phone, phone: msg.phone,
        stage_id: stageId, pipeline_id: waCfg.default_pipeline_id, source: 'whatsapp', status: 'new',
      }).select().single();
      if (lead) {
        await admin.from('chat_clients').update({ lead_id: lead.id }).eq('id', client.id);
        client.lead_id = lead.id;
      }
    }
  }

  // Resolve agent + provider config (need OpenAI key for whisper/vision/tts)
  let agentId: string | null = null;
  let agent: any = null;
  let providerCfg: any = null;
  let { data: convStateInit } = await admin.from('conversation_state').select('*').eq('client_id', client.id).maybeSingle();
  if (!convStateInit) {
    const { data: createdState } = await admin.from('conversation_state').insert({
      user_id: userId, client_id: client.id, ai_active: true, mode: 'ai',
    }).select().single();
    convStateInit = createdState;
  }

  agentId = convStateInit?.assigned_agent_id || waCfg?.default_agent_id || null;
  if (!agentId) {
    const { data: defaultAgent } = await admin.from('ai_agents').select('id').eq('user_id', userId).eq('is_active', true).limit(1).maybeSingle();
    agentId = defaultAgent?.id;
  }
  if (agentId) {
    const { data: ag } = await admin.from('ai_agents').select('*').eq('id', agentId).eq('user_id', userId).maybeSingle();
    agent = ag;
    if (agent?.ai_provider_config_id) {
      const { data: cfg } = await admin.from('ai_provider_configs').select('*').eq('id', agent.ai_provider_config_id).eq('user_id', userId).maybeSingle();
      providerCfg = cfg;
    }
  }

  // Determine an OpenAI key to use for media (whisper/vision/tts) — also fetch ElevenLabs key
  let openaiKey = '';
  let elevenKey = '';
  if (providerCfg?.provider === 'openai' && providerCfg?.api_key_encrypted) openaiKey = providerCfg.api_key_encrypted;
  if (!openaiKey) {
    const { data: anyOpenAi } = await admin.from('ai_provider_configs')
      .select('api_key_encrypted').eq('user_id', userId).eq('provider', 'openai')
      .not('api_key_encrypted', 'is', null).limit(1).maybeSingle();
    if (anyOpenAi?.api_key_encrypted) openaiKey = anyOpenAi.api_key_encrypted;
  }
  {
    const { data: anyEleven } = await admin.from('ai_provider_configs')
      .select('api_key_encrypted').eq('user_id', userId).eq('provider', 'elevenlabs')
      .not('api_key_encrypted', 'is', null).limit(1).maybeSingle();
    if (anyEleven?.api_key_encrypted) elevenKey = anyEleven.api_key_encrypted;
  }

  // If audio + transcription enabled, transcribe and append to content
  let transcript = '';
  let imageDescription = '';
  let inboundContent = msg.content;
  if (msg.media_type === 'audio' && msg.media_url && openaiKey && (agent?.transcribe_audio !== false)) {
    transcript = await transcribeAudio(msg.media_url, openaiKey);
    if (transcript) inboundContent = transcript;
  }
  if (msg.media_type === 'image' && msg.media_url && openaiKey && (agent?.understand_images !== false)) {
    imageDescription = await describeImage(msg.media_url, openaiKey);
    if (imageDescription) inboundContent = `${msg.content || '[imagem]'}\n[Descrição automática]: ${imageDescription}`;
  }

  const { data: insertedMsg, error: insertMsgErr } = await admin.from('messages').insert({
    user_id: userId,
    client_id: client?.id,
    lead_id: client?.lead_id,
    direction: 'inbound',
    channel: 'whatsapp',
    content: inboundContent,
    media_url: msg.media_url,
    media_type: msg.media_type,
    status: 'received',
    external_message_id: msg.external_message_id,
    sender_phone: msg.phone,
    sender_name: msg.name,
    created_at: msg.timestamp || new Date().toISOString(),
    metadata: {
      provider: 'z-api',
      raw_type: raw.type || raw.event || null,
      transcript: transcript || undefined,
      image_description: imageDescription || undefined,
      original_caption: msg.content !== inboundContent ? msg.content : undefined,
    },
  }).select().single();
  if (insertMsgErr) {
    if (String(insertMsgErr.code) === '23505') {
      return new Response(JSON.stringify({ ok: true, duplicate: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.error('message insert failed', insertMsgErr);
    await admin.from('webhook_logs').insert({ user_id: userId, direction: 'inbound', source: 'whatsapp', payload: raw, error: insertMsgErr.message, status_code: 500 });
    return new Response(JSON.stringify({ error: 'Could not save inbound message' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  await admin.from('chat_clients').update({ updated_at: new Date().toISOString() }).eq('id', client.id);

  await admin.from('notifications').insert({
    user_id: userId,
    type: 'message',
    title: `Nova mensagem de ${msg.name || msg.phone}`,
    message: inboundContent?.slice(0, 100),
    related_id: client?.id,
  });

  // AI auto-reply
  if (waCfg?.ai_auto_reply !== false && convStateInit?.ai_active && convStateInit?.mode === 'ai' && agent) {
    try {
      const { data: history } = await admin.from('messages').select('direction, content')
        .eq('client_id', client.id).order('created_at', { ascending: false }).limit(20);
      const ordered = (history || []).reverse().filter((m: any) => m.content);
      const aiHistory = ordered.map((m: any) => ({
        role: m.direction === 'inbound' ? 'user' : 'assistant',
        content: m.content,
      }));
      const { data: knowledge } = await admin.from('agent_knowledge').select('content').eq('agent_id', agent.id).limit(20);
      const ctx = (knowledge || []).map((k: any) => k.content).join('\n\n').slice(0, 8000);
      const sys = buildSystemPrompt(agent, ctx);
      const runtime = resolveAiRuntime(agent, providerCfg);
      const reply = await callAi(sys, aiHistory, runtime);
      if (reply) {
        let delivery = { ok: false, status: 0, body: 'WhatsApp inativo' };
        let voiceUsed = false;
        // If incoming was audio AND voice is enabled AND we have an openai key, reply with audio
        const shouldReplyWithVoice = msg.media_type === 'audio' && agent.voice_enabled && agent.reply_to_audio_with_audio && openaiKey;
        if (waCfg?.is_active) {
          if (shouldReplyWithVoice) {
            const audioDataUrl = await generateTtsBase64(reply, agent.voice_id || 'alloy', openaiKey);
            if (audioDataUrl) {
              try { delivery = await sendWhatsAppAudio(waCfg, msg.phone, audioDataUrl) || delivery; voiceUsed = delivery.ok; }
              catch (e) { console.error('audio send fail', e); }
            }
            if (!voiceUsed) {
              try { delivery = await sendWhatsApp(waCfg, msg.phone, reply) || delivery; }
              catch (e) { delivery = { ok: false, status: 500, body: String(e).slice(0, 500) }; }
            }
          } else {
            try { delivery = await sendWhatsApp(waCfg, msg.phone, reply) || delivery; }
            catch (e) { delivery = { ok: false, status: 500, body: String(e).slice(0, 500) }; console.error('whatsapp send failed', e); }
          }
        }
        await admin.from('messages').insert({
          user_id: userId, client_id: client.id, lead_id: client.lead_id,
          direction: 'outbound', channel: 'whatsapp', content: reply,
          status: delivery.ok ? 'sent' : 'failed', agent_id: agent.id,
          sender_phone: msg.phone,
          media_type: voiceUsed ? 'audio' : null,
          metadata: { external_status: delivery.status, external_body: delivery.body, voice: voiceUsed },
        });
      }
    } catch (e) {
      console.error('AI reply failed', e);
    }
  }

  return new Response(JSON.stringify({ ok: true, message_id: insertedMsg?.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
