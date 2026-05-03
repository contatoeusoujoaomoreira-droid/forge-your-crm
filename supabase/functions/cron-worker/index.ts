// Cron worker - runs every minute via pg_cron, also fires on stage_change via DB trigger.
// Handles: handoff resume, follow-up rescue, appointment reminders, debounce flush, stage triggers.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

const sanitizeBaseUrl = (u: string) => (u || '').replace(/\/$/, '').replace(/\/(send-text|send-image|send-audio|send-document)$/, '');

async function sendWhatsAppText(cfg: any, phone: string, content: string) {
  const baseUrl = sanitizeBaseUrl(cfg.base_url || '');
  const token = cfg.api_token || '';
  const instance = cfg.instance_id || '';
  const extra = cfg.extra_headers || {};
  try {
    if (cfg.api_type === 'z-api') {
      const root = baseUrl.includes('/instances/') ? baseUrl : `${baseUrl}/instances/${instance}/token/${token}`;
      const r = await fetch(`${root}/send-text`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...extra }, body: JSON.stringify({ phone, message: content }) });
      return { ok: r.ok, status: r.status, body: (await r.text()).slice(0, 300) };
    }
    if (cfg.api_type === 'evolution') {
      const r = await fetch(`${baseUrl}/message/sendText/${instance}`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: token }, body: JSON.stringify({ number: phone, text: content }) });
      return { ok: r.ok, status: r.status, body: (await r.text()).slice(0, 300) };
    }
    if (cfg.api_type === 'umclique') {
      const r = await fetch(`${baseUrl}/public-send-message`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': token, ...extra }, body: JSON.stringify({ channel_id: instance, to: phone, type: 'text', content }) });
      return { ok: r.ok, status: r.status, body: (await r.text()).slice(0, 300) };
    }
    if (cfg.api_type === 'ultramsg') {
      const r = await fetch(`${baseUrl}/${instance}/messages/chat`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token, to: phone, body: content }).toString() });
      return { ok: r.ok, status: r.status, body: (await r.text()).slice(0, 300) };
    }
  } catch (e) { return { ok: false, status: 500, body: String(e).slice(0, 200) }; }
  return { ok: false, status: 400, body: 'unsupported provider' };
}

// AI runtime resolver (mirrors ai-agent/webhook-receiver) — supports Anthropic + OpenRouter
function resolveRuntime(cfg: any, agentModel?: string) {
  const provider = cfg?.provider || 'lovable';
  let endpoint = 'https://ai.gateway.lovable.dev/v1/chat/completions';
  let apiKey = LOVABLE_API_KEY;
  let model = agentModel || cfg?.default_model || 'google/gemini-2.5-flash';
  if (provider === 'openai' && cfg?.api_key_encrypted) { endpoint = 'https://api.openai.com/v1/chat/completions'; apiKey = cfg.api_key_encrypted; if (model.startsWith('openai/')) model = model.replace('openai/', ''); }
  else if (provider === 'groq' && cfg?.api_key_encrypted) { endpoint = 'https://api.groq.com/openai/v1/chat/completions'; apiKey = cfg.api_key_encrypted; }
  else if (provider === 'gemini' && cfg?.api_key_encrypted) { endpoint = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'; apiKey = cfg.api_key_encrypted; if (model.startsWith('google/')) model = model.replace('google/', ''); }
  else if (provider === 'anthropic' && cfg?.api_key_encrypted) { endpoint = 'https://api.anthropic.com/v1/chat/completions'; apiKey = cfg.api_key_encrypted; if (!model.startsWith('claude-')) model = 'claude-3-5-haiku-20241022'; }
  else if (provider === 'openrouter' && cfg?.api_key_encrypted) { endpoint = 'https://openrouter.ai/api/v1/chat/completions'; apiKey = cfg.api_key_encrypted; }
  return { endpoint, apiKey, model, provider };
}

async function callAi(systemPrompt: string, history: any[], rt: any) {
  const headers: Record<string, string> = { Authorization: `Bearer ${rt.apiKey}`, 'Content-Type': 'application/json' };
  // Anthropic via native API needs different shape; we use the OpenAI-compat /v1/chat/completions which Anthropic exposes
  if (rt.provider === 'anthropic') {
    headers['x-api-key'] = rt.apiKey;
    headers['anthropic-version'] = '2023-06-01';
    // Use messages API
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers,
      body: JSON.stringify({
        model: rt.model, max_tokens: 800, system: systemPrompt,
        messages: history.map((m: any) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
      }),
    });
    if (!r.ok) throw new Error(`AI ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const j = await r.json();
    return j.content?.[0]?.text || '';
  }
  if (rt.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://omnibuildercrm.online';
    headers['X-Title'] = 'Omni Builder CRM';
  }
  const r = await fetch(rt.endpoint, { method: 'POST', headers, body: JSON.stringify({ model: rt.model, messages: [{ role: 'system', content: systemPrompt }, ...history] }) });
  if (!r.ok) throw new Error(`AI ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content || '';
}

// Replace placeholders in templates: {nome} {hora} {data} {pin}
function fillTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

function pinCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Default events when no config exists yet
const DEFAULT_EVENTS: Record<string, boolean> = {
  appointment_created: true,
  appointment_cancelled: true,
  appointment_reminder: true,
  lead_stage_change: true,
  lead_won: true,
  handoff_human: true,
  order_created: true,
  form_submitted: true,
  followup_sent: false,
  ai_error: true,
};

async function notifyTeam(admin: any, userId: string, event: string, message: string) {
  const { data: cfg } = await admin.from('team_alerts_config').select('*').eq('user_id', userId).maybeSingle();
  let phones: string[] = [];
  let events = DEFAULT_EVENTS;
  let enabled = true;
  if (cfg) {
    enabled = cfg.is_enabled !== false;
    phones = Array.isArray(cfg.phones) ? cfg.phones : [];
    events = { ...DEFAULT_EVENTS, ...(cfg.events || {}) };
  } else {
    // legacy fallback: agents.notification_phone
    const { data: ag } = await admin.from('ai_agents').select('notification_phone').eq('user_id', userId).not('notification_phone', 'is', null).limit(1).maybeSingle();
    if (ag?.notification_phone) phones = [ag.notification_phone];
  }
  if (!enabled || !phones.length || events[event] === false) return 0;
  const { data: wcfg } = await admin.from('whatsapp_configs').select('*').eq('user_id', userId).eq('is_active', true).order('updated_at', { ascending: false }).limit(1).maybeSingle();
  if (!wcfg) return 0;
  let n = 0;
  for (const raw of phones) {
    const phone = String(raw || '').replace(/\D/g, '');
    if (!phone) continue;
    const r = await sendWhatsAppText(wcfg, phone, message);
    if (r.ok) n++;
  }
  return n;
}

// === HANDLERS ===

async function processHandoffResume(admin: any) {
  const { data, error } = await admin.rpc('resume_expired_handoffs');
  if (error) console.error('resume_expired_handoffs error', error);
  return data || 0;
}

async function processDebounceQueue(admin: any) {
  const { data: items } = await admin.from('message_debounce_queue')
    .select('*').eq('status', 'pending').lte('process_after', new Date().toISOString()).limit(20);
  if (!items?.length) return 0;
  let processed = 0;
  for (const it of items) {
    // Mark processing
    const { data: locked } = await admin.from('message_debounce_queue').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', it.id).eq('status', 'pending').select().maybeSingle();
    if (!locked) continue;
    try {
      // Forward to webhook-receiver as a synthetic batch — but easier: post to ai-agent flow inline.
      await fetch(`${SUPABASE_URL}/functions/v1/webhook-receiver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ __debounced__: true, debounce_id: it.id, user_id: it.user_id, client_id: it.client_id, agent_id: it.agent_id, messages: it.buffered_messages }),
      });
      await admin.from('message_debounce_queue').update({ status: 'done', updated_at: new Date().toISOString() }).eq('id', it.id);
      processed++;
    } catch (e) {
      await admin.from('message_debounce_queue').update({ status: 'failed', last_error: String(e).slice(0, 300), attempts: (it.attempts || 0) + 1, updated_at: new Date().toISOString() }).eq('id', it.id);
    }
  }
  return processed;
}

async function processReminders(admin: any) {
  // Find appointments in the next reminder window that haven't been notified
  const now = new Date();
  const inOneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const { data: appts } = await admin.from('appointments')
    .select('id, schedule_id, guest_name, guest_phone, guest_email, date, time, status, reminder_sent_at, reminder_pin')
    .is('reminder_sent_at', null)
    .eq('status', 'confirmed')
    .gte('date', now.toISOString().split('T')[0])
    .lte('date', inOneDay.toISOString().split('T')[0])
    .limit(50);
  if (!appts?.length) return 0;
  let sent = 0;
  for (const a of appts) {
    const { data: sched } = await admin.from('schedules')
      .select('user_id, title, reminder_enabled, reminder_minutes_before, reminder_message')
      .eq('id', a.schedule_id).maybeSingle();
    if (!sched?.reminder_enabled) continue;
    const apptAt = new Date(`${a.date}T${a.time}:00`);
    const diffMin = (apptAt.getTime() - now.getTime()) / 60000;
    if (diffMin < 0 || diffMin > (sched.reminder_minutes_before || 120)) continue;
    if (!a.guest_phone) continue;
    const { data: cfg } = await admin.from('whatsapp_configs').select('*').eq('user_id', sched.user_id).eq('is_active', true).order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (!cfg) continue;
    const pin = a.reminder_pin || pinCode();
    const tpl = sched.reminder_message || 'Olá {nome}! 👋 Lembrando do seu agendamento de {titulo} hoje às {hora}. Código: {pin}';
    const msg = fillTemplate(tpl, { nome: a.guest_name || 'Cliente', hora: a.time, data: a.date, titulo: sched.title, pin });
    const r = await sendWhatsAppText(cfg, a.guest_phone.replace(/\D/g, ''), msg);
    await admin.from('appointments').update({ reminder_sent_at: new Date().toISOString(), reminder_pin: pin }).eq('id', a.id);
    if (r.ok) sent++;
    // Notify owner too
    const { data: agent } = await admin.from('ai_agents').select('notification_phone').eq('user_id', sched.user_id).not('notification_phone', 'is', null).limit(1).maybeSingle();
    if (agent?.notification_phone) {
      await sendWhatsAppText(cfg, agent.notification_phone.replace(/\D/g, ''), `📅 Lembrete: ${a.guest_name} tem ${sched.title} às ${a.time}.`);
    }
  }
  return sent;
}

async function processFollowUps(admin: any) {
  // Find clients with last_inbound_at older than agent.followup_interval_minutes,
  // followup_enabled=true, and attempts < max_attempts
  const { data: candidates } = await admin.from('conversation_state')
    .select('id, user_id, client_id, assigned_agent_id, ai_active, mode, updated_at')
    .eq('ai_active', true).eq('mode', 'ai').not('assigned_agent_id', 'is', null).limit(100);
  if (!candidates?.length) return 0;
  let sent = 0;
  for (const cs of candidates) {
    const { data: agent } = await admin.from('ai_agents').select('*').eq('id', cs.assigned_agent_id).maybeSingle();
    if (!agent?.followup_enabled) continue;
    const { data: client } = await admin.from('chat_clients').select('id, name, phone, last_inbound_at, last_outbound_at').eq('id', cs.client_id).maybeSingle();
    if (!client?.phone) continue;
    const lastInbound = client.last_inbound_at ? new Date(client.last_inbound_at) : new Date(cs.updated_at);
    const lastOutbound = client.last_outbound_at ? new Date(client.last_outbound_at) : new Date(0);
    // Only follow up if lead actually went silent (no outbound newer than inbound is fine)
    const elapsedMin = (Date.now() - Math.max(lastInbound.getTime(), lastOutbound.getTime())) / 60000;
    if (elapsedMin < (agent.followup_interval_minutes || 120)) continue;

    // Get/create followup tracking
    let { data: tr } = await admin.from('followup_tracking').select('*').eq('client_id', client.id).eq('agent_id', agent.id).maybeSingle();
    if (!tr) {
      const { data: created } = await admin.from('followup_tracking').insert({ user_id: cs.user_id, client_id: client.id, agent_id: agent.id, status: 'scheduled' }).select().maybeSingle();
      tr = created;
    }
    if (!tr) continue;
    if (tr.status === 'stopped' || tr.attempts_sent >= (agent.followup_max_attempts || 3)) continue;
    if (tr.last_attempt_at && (Date.now() - new Date(tr.last_attempt_at).getTime()) / 60000 < (agent.followup_interval_minutes || 120)) continue;

    // Build rescue message
    const { data: cfg } = await admin.from('whatsapp_configs').select('*').eq('user_id', cs.user_id).eq('is_active', true).limit(1).maybeSingle();
    if (!cfg) continue;
    const { data: providerCfg } = agent.ai_provider_config_id
      ? await admin.from('ai_provider_configs').select('*').eq('id', agent.ai_provider_config_id).maybeSingle()
      : { data: null };
    const { data: history } = await admin.from('messages').select('direction, content').eq('client_id', client.id).order('created_at', { ascending: false }).limit(10);
    const ordered = (history || []).reverse().filter((m: any) => m.content);
    const aiHist = ordered.map((m: any) => ({ role: m.direction === 'inbound' ? 'user' : 'assistant', content: m.content }));
    let text = agent.followup_rescue_message || '';
    if (!text) {
      try {
        const rt = resolveRuntime(providerCfg, agent.model);
        const sys = `Você é ${agent.display_name || agent.name}. O cliente parou de responder há ${Math.round(elapsedMin)} minutos. Escreva 1 mensagem curta (até 200 chars), em português brasileiro, retomando a conversa de forma natural e útil. Não diga "estou aqui" — proponha um próximo passo concreto baseado no histórico. Tentativa #${(tr.attempts_sent || 0) + 1}.`;
        text = await callAi(sys, aiHist, rt);
      } catch (e) { console.error('followup ai fail', e); continue; }
    } else {
      text = fillTemplate(text, { nome: client.name || 'cliente' });
    }
    if (!text) continue;
    const r = await sendWhatsAppText(cfg, client.phone, text);
    await admin.from('messages').insert({ user_id: cs.user_id, client_id: client.id, direction: 'outbound', channel: 'whatsapp', content: text, status: r.ok ? 'sent' : 'failed', agent_id: agent.id, sender_phone: client.phone, metadata: { followup: true, attempt: (tr.attempts_sent || 0) + 1, external_status: r.status, external_body: r.body } });
    await admin.from('followup_tracking').update({ attempts_sent: (tr.attempts_sent || 0) + 1, last_attempt_at: new Date().toISOString(), next_attempt_at: new Date(Date.now() + (agent.followup_interval_minutes || 120) * 60000).toISOString(), status: ((tr.attempts_sent || 0) + 1) >= (agent.followup_max_attempts || 3) ? 'completed' : 'scheduled', updated_at: new Date().toISOString() }).eq('id', tr.id);
    if (r.ok) {
      sent++;
      await admin.from('chat_clients').update({ last_outbound_at: new Date().toISOString() }).eq('id', client.id);
    }
  }
  return sent;
}

async function processStageChange(admin: any, payload: any) {
  const { lead_id, user_id, new_stage_id } = payload;
  if (!lead_id || !new_stage_id) return 0;

  const { data: lead } = await admin.from('leads').select('*').eq('id', lead_id).maybeSingle();
  if (!lead) return 0;
  const { data: client } = await admin.from('chat_clients').select('*').eq('lead_id', lead_id).maybeSingle();
  const { data: triggers } = await admin.from('stage_triggers').select('*').eq('user_id', user_id).eq('stage_id', new_stage_id).eq('trigger_event', 'enter').eq('is_active', true);
  if (!triggers?.length) return 0;

  const { data: cfg } = await admin.from('whatsapp_configs').select('*').eq('user_id', user_id).eq('is_active', true).limit(1).maybeSingle();

  let count = 0;
  for (const t of triggers) {
    try {
      if (t.action_type === 'notify_whatsapp') {
        const phone = (t.action_config?.phone || '').replace(/\D/g, '');
        const msg = fillTemplate(t.action_config?.message || `🔔 Lead {nome} entrou na etapa.`, { nome: lead.name || 'Cliente', stage: new_stage_id });
        if (phone && cfg) await sendWhatsAppText(cfg, phone, msg);
      } else if (t.action_type === 'change_agent') {
        const newAgentId = t.action_config?.agent_id;
        if (newAgentId && client) {
          await admin.from('conversation_state').upsert({ user_id, client_id: client.id, assigned_agent_id: newAgentId, ai_active: true, mode: 'ai', updated_at: new Date().toISOString() }, { onConflict: 'client_id' });
        }
      } else if (t.action_type === 'move_stage') {
        const targetStage = t.action_config?.stage_id;
        if (targetStage) await admin.from('leads').update({ stage_id: targetStage }).eq('id', lead_id);
      } else if (t.action_type === 'send_message' && client?.phone && cfg) {
        const msg = fillTemplate(t.action_config?.message || '', { nome: lead.name || 'Cliente' });
        if (msg) {
          const r = await sendWhatsAppText(cfg, client.phone, msg);
          await admin.from('messages').insert({ user_id, client_id: client.id, direction: 'outbound', channel: 'whatsapp', content: msg, status: r.ok ? 'sent' : 'failed', sender_phone: client.phone, metadata: { stage_trigger: true, stage_id: new_stage_id } });
        }
      }
      count++;
    } catch (e) { console.error('stage trigger fail', t.id, e); }
  }

  // Also notify the owner via global agent.notification_phone if any
  const { data: anyAgent } = await admin.from('ai_agents').select('notification_phone').eq('user_id', user_id).not('notification_phone', 'is', null).limit(1).maybeSingle();
  if (anyAgent?.notification_phone && cfg) {
    await sendWhatsAppText(cfg, anyAgent.notification_phone.replace(/\D/g, ''), `🔔 Lead "${lead.name}" mudou de etapa no CRM.`);
  }
  return count;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);
  let body: any = {};
  try { body = await req.json(); } catch { /* cron invocation may not have body */ }

  // Targeted invocation from DB trigger
  if (body.event === 'stage_change') {
    const n = await processStageChange(admin, body);
    return new Response(JSON.stringify({ ok: true, stage_triggers: n }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Cron tick: run all maintenance tasks
  const [resumed, debounced, reminders, followups] = await Promise.all([
    processHandoffResume(admin).catch(e => { console.error('handoff', e); return 0; }),
    processDebounceQueue(admin).catch(e => { console.error('debounce', e); return 0; }),
    processReminders(admin).catch(e => { console.error('reminders', e); return 0; }),
    processFollowUps(admin).catch(e => { console.error('followups', e); return 0; }),
  ]);
  return new Response(JSON.stringify({ ok: true, resumed, debounced, reminders, followups }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
