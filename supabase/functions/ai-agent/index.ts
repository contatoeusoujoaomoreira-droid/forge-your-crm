import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

interface Body {
  agent_id?: string;
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
  mode?: 'reply' | 'copilot' | 'summary';
}

const PROVIDER_DEFAULT_MODEL: Record<string, string> = {
  lovable: 'google/gemini-2.5-flash',
  openai: 'gpt-4o-mini',
  groq: 'llama-3.3-70b-versatile',
  gemini: 'gemini-2.0-flash',
};

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

  if (provider === 'openai' && cfg?.api_key_encrypted) {
    endpoint = 'https://api.openai.com/v1/chat/completions';
    apiKey = cfg.api_key_encrypted;
  } else if (provider === 'groq' && cfg?.api_key_encrypted) {
    endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    apiKey = cfg.api_key_encrypted;
  } else if (provider === 'gemini' && cfg?.api_key_encrypted) {
    endpoint = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    apiKey = cfg.api_key_encrypted;
  }

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

function buildSystemPrompt(agent: any) {
  return [
    agent.system_prompt || 'Você é um assistente útil e profissional.',
    `Nome de apresentação: ${agent.display_name || agent.name || 'Agente'}`,
    `Personalidade: ${agent.personality || 'profissional'}`,
    `Estilo: ${agent.style || 'consultivo'}`,
    `Tom: ${agent.tone || 'cordial'}`,
    agent.rules ? `Regras e restrições:\n${agent.rules}` : '',
    agent.examples ? `Exemplos de conversa:\n${agent.examples}` : '',
    agent.objections ? `Objeções e respostas:\n${agent.objections}` : '',
  ].filter(Boolean).join('\n\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error } = await userClient.auth.getUser();
    if (error || !userData?.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const userId = userData.user.id;

    const body: Body = await req.json();
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);

    let systemPrompt = 'Você é um assistente útil e profissional.';
    let model = 'google/gemini-2.5-flash';
    let apiKey = LOVABLE_API_KEY;
    let endpoint = 'https://ai.gateway.lovable.dev/v1/chat/completions';

    if (body.agent_id) {
      const { data: agent } = await admin.from('ai_agents').select('*').eq('id', body.agent_id).eq('user_id', userId).maybeSingle();
      if (agent) {
        systemPrompt = `${agent.system_prompt}\n\nPersonalidade: ${agent.personality || ''}\nTom: ${agent.tone || 'profissional'}`;
        model = agent.model || model;
        // Normalize deprecated/invalid model names
        if (model === 'google/gemini-3-flash-preview') model = 'google/gemini-2.5-flash';
        if (model === 'google/gemini-3-pro-preview' || model === 'google/gemini-3.1-pro-preview') model = 'google/gemini-2.5-pro';
        if (agent.ai_provider_config_id) {
          const { data: cfg } = await admin.from('ai_provider_configs').select('*').eq('id', agent.ai_provider_config_id).maybeSingle();
          if (cfg && cfg.provider !== 'lovable' && cfg.api_key_encrypted) {
            apiKey = cfg.api_key_encrypted;
            if (cfg.provider === 'openai') endpoint = 'https://api.openai.com/v1/chat/completions';
            if (cfg.provider === 'groq') endpoint = 'https://api.groq.com/openai/v1/chat/completions';
            if (cfg.default_model) model = cfg.default_model;
            // Provider-aware fallback: if model doesn't match provider, use a sensible default
            if (cfg.provider === 'groq' && (model.startsWith('google/') || model.startsWith('openai/'))) {
              model = 'llama-3.3-70b-versatile';
            }
            if (cfg.provider === 'openai' && model.startsWith('google/')) {
              model = 'gpt-4o-mini';
            }
          }
        }
        const { data: knowledge } = await admin.from('agent_knowledge').select('content').eq('agent_id', body.agent_id).limit(10);
        if (knowledge?.length) {
          systemPrompt += `\n\nBASE DE CONHECIMENTO:\n${knowledge.map(k => k.content).join('\n\n').slice(0, 4000)}`;
        }
      }
    }

    if (body.mode === 'summary') systemPrompt = 'Você resume conversas em 2-3 frases curtas, objetivas e em português.';
    if (body.mode === 'copilot') systemPrompt = 'Você é um copiloto de vendas. Dado o histórico de conversa, sugira 3 respostas curtas e diretas (uma por linha, prefixe com "•"). NÃO escreva mais nada além disso.';

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, ...body.messages] }),
    });
    if (resp.status === 429) return new Response(JSON.stringify({ error: 'Rate limit. Tente em alguns segundos.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: 'Créditos esgotados. Adicione créditos ao workspace.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (!resp.ok) {
      const err = await resp.text();
      return new Response(JSON.stringify({ error: `AI ${resp.status}: ${err}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const json = await resp.json();
    const content = json.choices?.[0]?.message?.content || '';
    const tokensUsed = json.usage?.total_tokens || 0;
    if (body.agent_id && tokensUsed) {
      await admin.rpc('noop').then(() => null).catch(() => null);
      // increment counter (best-effort)
      const { data: cur } = await admin.from('ai_agents').select('total_tokens_used').eq('id', body.agent_id).maybeSingle();
      await admin.from('ai_agents').update({ total_tokens_used: (cur?.total_tokens_used || 0) + tokensUsed }).eq('id', body.agent_id);
    }
    return new Response(JSON.stringify({ content, tokens: tokensUsed }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('ai-agent', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
