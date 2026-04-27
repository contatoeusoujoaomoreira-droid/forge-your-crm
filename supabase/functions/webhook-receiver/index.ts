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
  return { endpoint, apiKey, model };
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

const sanitizeBaseUrl = (u: string) => (u || '').replace(/\/$/, '').replace(/\/send-text$/, '').replace(/\/send-image$/, '');

async function sendWhatsApp(cfg: any, phone: string, content: string) {
  const baseUrl = sanitizeBaseUrl(cfg.base_url || '');
  const token = cfg.api_token || '';
  const instance = cfg.instance_id || '';
  const extra = cfg.extra_headers || {};
  switch (cfg.api_type) {
    case 'z-api': {
      const url = baseUrl.includes('/instances/') ? `${baseUrl}/send-text` : `${baseUrl}/instances/${instance}/token/${token}/send-text`;
      await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...extra }, body: JSON.stringify({ phone, message: content }) });
      return;
    }
    case 'evolution': {
      await fetch(`${baseUrl}/message/sendText/${instance}`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: token }, body: JSON.stringify({ number: phone, text: content }) });
      return;
    }
    case 'ultramsg': {
      await fetch(`${baseUrl}/${instance}/messages/chat`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token, to: phone, body: content }).toString() });
      return;
    }
    default: {
      await fetch(baseUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...extra }, body: JSON.stringify({ phone, message: content }) });
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  let raw: any;
  try { raw = await req.json(); } catch { raw = {}; }

  const apiKey = req.headers.get('x-api-key') || url.searchParams.get('api_key') || raw.api_key;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);
  let userId = '';

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
      const { data: cfgByInstance } = await admin.from('whatsapp_configs')
        .select('user_id')
        .eq('instance_id', instanceFromPayload)
        .eq('is_active', true)
        .maybeSingle();
      userId = cfgByInstance?.user_id || '';
    }
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing API key or known WhatsApp instance' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  await admin.from('webhook_logs').insert({ user_id: userId, direction: 'inbound', source: 'whatsapp', payload: raw });

  const msg = detectAndNormalize(raw);
  if (!msg || !msg.phone || msg.from_me) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Dedup
  if (msg.external_message_id) {
    const { data: dup } = await admin.from('messages').select('id').eq('user_id', userId).eq('external_message_id', msg.external_message_id).maybeSingle();
    if (dup) return new Response(JSON.stringify({ ok: true, duplicate: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Resolve/create client
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

  // Auto-create lead if config says so
  const { data: waCfg } = await admin.from('whatsapp_configs').select('*').eq('user_id', userId).maybeSingle();
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

  // Save inbound message
  const { data: insertedMsg, error: insertMsgErr } = await admin.from('messages').insert({
    user_id: userId,
    client_id: client?.id,
    lead_id: client?.lead_id,
    direction: 'inbound',
    channel: 'whatsapp',
    content: msg.content,
    media_url: msg.media_url,
    media_type: msg.media_type,
    status: 'received',
    external_message_id: msg.external_message_id,
    sender_phone: msg.phone,
    sender_name: msg.name,
    created_at: msg.timestamp || new Date().toISOString(),
    metadata: { provider: 'z-api', raw_type: raw.type || raw.event || null },
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

  // Notification
  await admin.from('notifications').insert({
    user_id: userId,
    type: 'message',
    title: `Nova mensagem de ${msg.name || msg.phone}`,
    message: msg.content?.slice(0, 100),
    related_id: client?.id,
  });

  // Get/init conversation_state
  let { data: convState } = await admin.from('conversation_state').select('*').eq('client_id', client.id).maybeSingle();
  if (!convState) {
    const { data: createdState } = await admin.from('conversation_state').insert({
      user_id: userId, client_id: client.id, ai_active: true, mode: 'ai',
    }).select().single();
    convState = createdState;
  }

  // AI response if active globally AND for this conversation
  if (waCfg?.ai_auto_reply !== false && convState?.ai_active && convState?.mode === 'ai') {
    let agentId = convState.assigned_agent_id || waCfg?.default_agent_id;
    if (!agentId) {
      const { data: defaultAgent } = await admin.from('ai_agents').select('id').eq('user_id', userId).eq('is_active', true).limit(1).maybeSingle();
      agentId = defaultAgent?.id;
    }
    if (agentId) {
      const { data: agent } = await admin.from('ai_agents').select('*').eq('id', agentId).eq('user_id', userId).eq('is_active', true).maybeSingle();
      if (agent) {
        try {
          const { data: history } = await admin.from('messages').select('direction, content')
            .eq('client_id', client.id).order('created_at', { ascending: false }).limit(20);
          const ordered = (history || []).reverse().filter((m: any) => m.content);
          const aiHistory = ordered.map((m: any) => ({
            role: m.direction === 'inbound' ? 'user' : 'assistant',
            content: m.content,
          }));
          const { data: knowledge } = await admin.from('agent_knowledge').select('content').eq('agent_id', agentId).limit(10);
          const ctx = (knowledge || []).map((k: any) => k.content).join('\n\n').slice(0, 4000);
          let providerCfg: any = null;
          if (agent.ai_provider_config_id) {
            const { data: cfg } = await admin.from('ai_provider_configs').select('*').eq('id', agent.ai_provider_config_id).eq('user_id', userId).eq('is_active', true).maybeSingle();
            providerCfg = cfg;
          }
          const sys = buildSystemPrompt(agent, ctx);
          const runtime = resolveAiRuntime(agent, providerCfg);
          const reply = await callAi(sys, aiHistory, runtime);
          if (reply) {
            // Persist outbound
            await admin.from('messages').insert({
              user_id: userId, client_id: client.id, lead_id: client.lead_id,
              direction: 'outbound', channel: 'whatsapp', content: reply,
              status: waCfg?.is_active ? 'sent' : 'pending', agent_id: agentId,
            });
            // Send via WhatsApp directly
            if (waCfg?.is_active) {
              try { await sendWhatsApp(waCfg, msg.phone, reply); }
              catch (e) { console.error('whatsapp send failed', e); }
            }
          }
        } catch (e) {
          console.error('AI reply failed', e);
        }
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, message_id: insertedMsg?.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
