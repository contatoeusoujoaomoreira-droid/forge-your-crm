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
  } else if (provider === 'anthropic' && cfg?.api_key_encrypted) {
    endpoint = 'https://api.anthropic.com/v1/messages';
    apiKey = cfg.api_key_encrypted;
  } else if (provider === 'openrouter' && cfg?.api_key_encrypted) {
    endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    apiKey = cfg.api_key_encrypted;
  }

  let agentModel = normalizeLegacyModel(agent?.model);
  if (provider === 'openai' && agentModel.startsWith('openai/')) agentModel = agentModel.replace('openai/', '');
  if (provider === 'gemini' && agentModel.startsWith('google/')) agentModel = agentModel.replace('google/', '');

  let cfgModel = normalizeLegacyModel(cfg?.default_model);
  if (provider === 'openai' && cfgModel.startsWith('openai/')) cfgModel = cfgModel.replace('openai/', '');
  if (provider === 'gemini' && cfgModel.startsWith('google/')) cfgModel = cfgModel.replace('google/', '');

  const fallback = PROVIDER_DEFAULT_MODEL[provider] || PROVIDER_DEFAULT_MODEL.lovable;
  let model = modelMatchesProvider(provider, agentModel) ? agentModel : (modelMatchesProvider(provider, cfgModel) ? cfgModel : fallback);
  if (provider === 'anthropic' && !model.startsWith('claude-')) model = 'claude-3-5-haiku-20241022';
  if (provider === 'openrouter' && !model.includes('/')) model = 'openai/gpt-4o-mini';
  return { endpoint, apiKey, model, provider };
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

// Pontuação simples por palavras-chave + categoria + texto livre
function scoreKnowledgeItem(item: any, queryLower: string, queryTokens: string[]): number {
  let score = 0;
  const cat = (item.category || '').toLowerCase();
  if (cat && queryLower.includes(cat)) score += 10;
  const kws: string[] = Array.isArray(item.keywords) ? item.keywords : [];
  for (const kw of kws) {
    const k = (kw || '').toLowerCase().trim();
    if (!k) continue;
    if (queryLower.includes(k)) score += 6;
    else if (queryTokens.some(t => k.includes(t) || t.includes(k))) score += 2;
  }
  const title = (item.title || '').toLowerCase();
  for (const t of queryTokens) if (t.length > 2 && title.includes(t)) score += 3;
  const desc = (item.description || '').toLowerCase();
  for (const t of queryTokens) if (t.length > 3 && desc.includes(t)) score += 1;
  const content = (item.content || '').toLowerCase();
  for (const t of queryTokens) if (t.length > 4 && content.includes(t)) score += 0.5;
  // small boost if has media/links available (more useful response)
  if (Array.isArray(item.media_urls) && item.media_urls.length) score += 0.5;
  if (Array.isArray(item.external_links) && item.external_links.length) score += 0.5;
  return score;
}

function findRelevantKnowledge(items: any[], userText: string, topN = 5): any[] {
  const ql = (userText || '').toLowerCase();
  const tokens = ql.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  const scored = items.map(it => ({ it, s: scoreKnowledgeItem(it, ql, tokens) }));
  return scored.filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, topN).map(x => x.it);
}

// Heurísticas leves de intenção para handoff/qualificação
function detectIntent(text: string, agent: any): { handoff: boolean; qualified: boolean; wantsMedia: boolean } {
  const t = (text || '').toLowerCase();
  const handoffKws = (agent?.handoff_keywords || 'humano,atendente,pessoa,ajuda real,falar com alguém,vendedor').split(/[,;\n]/).map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  const handoff = handoffKws.some((k: string) => t.includes(k));
  const qualifiedKws = ['quero comprar','fechar','contrato','cartão','pix','quanto custa exatamente','agendar visita','marcar reunião','enviar proposta','cnpj','meu cpf'];
  const qualified = qualifiedKws.some(k => t.includes(k));
  const mediaKws = ['imagem','imagens','foto','fotos','catálogo','catalogo','drive','vídeo','video','link','mostra','manda','envia'];
  const wantsMedia = mediaKws.some(k => t.includes(k));
  return { handoff, qualified, wantsMedia };
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
    let providerType = 'lovable';

    if (body.agent_id) {
      const { data: agent } = await admin.from('ai_agents').select('*').eq('id', body.agent_id).eq('user_id', userId).maybeSingle();
      if (agent) {
        systemPrompt = buildSystemPrompt(agent);
        if (agent.ai_provider_config_id) {
          const { data: cfg } = await admin.from('ai_provider_configs').select('*').eq('id', agent.ai_provider_config_id).maybeSingle();
          const runtime = resolveAiRuntime(agent, cfg);
          endpoint = runtime.endpoint;
          apiKey = runtime.apiKey;
          model = runtime.model;
          providerType = (cfg?.provider as string) || 'lovable';
        } else {
          model = normalizeLegacyModel(agent.model) || model;
          // Infer provider from model id prefix
          if (model.startsWith('openai/') || model.startsWith('gpt-')) providerType = 'openai';
          else if (model.startsWith('google/') || model.startsWith('gemini-')) providerType = 'gemini';
          else if (model.startsWith('llama-') || model.startsWith('mixtral-')) providerType = 'groq';
          else if (model.startsWith('claude-')) providerType = 'anthropic';
        }
        // If user has own API key for this provider, swap in their endpoint+key
        const { data: ownKeys } = await admin.from('user_api_keys')
          .select('*').eq('user_id', userId).eq('provider', providerType).eq('is_active', true);
        const own = (ownKeys || []).find((k: any) => {
          const sc = (k.scope || 'all').split(',').map((s: string) => s.trim());
          return sc.includes('all') || sc.includes('chat');
        });
        if (own) {
          apiKey = own.api_key;
          if (providerType === 'openai') endpoint = 'https://api.openai.com/v1/chat/completions';
          else if (providerType === 'groq') endpoint = 'https://api.groq.com/openai/v1/chat/completions';
        }
        // === BASE DE CONHECIMENTO CONTEXTUAL ===
        // Pega todos os itens, faz scoring pela última mensagem do usuário,
        // e injeta os top-N como contexto. Recursos selecionados são retornados
        // ao chamador para envio automático (imagens/links nomeados).
        const { data: knowledge } = await admin.from('agent_knowledge')
          .select('id, title, category, description, keywords, content, media_urls, external_links, source_url')
          .eq('agent_id', body.agent_id);
        const lastUser = [...body.messages].reverse().find(m => m.role === 'user')?.content || '';
        let selected: any[] = [];
        if (knowledge?.length) {
          selected = findRelevantKnowledge(knowledge, lastUser, 5);
          // Fallback: se nada combinou, usa os 3 mais recentes (compatibilidade)
          const baseItems = selected.length ? selected : knowledge.slice(0, 3);
          const ctx = baseItems.map((k: any) => {
            const links = Array.isArray(k.external_links) ? k.external_links.map((l: any) => `  - ${l.title}: ${l.url}`).join('\n') : '';
            const imgs = Array.isArray(k.media_urls) && k.media_urls.length ? `  (${k.media_urls.length} imagem(ns) anexada(s) — disponível para envio)` : '';
            return [
              `# ${k.title}${k.category ? ` [${k.category}]` : ''}`,
              k.description ? `Descrição: ${k.description}` : '',
              Array.isArray(k.keywords) && k.keywords.length ? `Palavras-chave: ${k.keywords.join(', ')}` : '',
              k.content ? k.content.slice(0, 1500) : '',
              links ? `Links:\n${links}` : '',
              imgs,
            ].filter(Boolean).join('\n');
          }).join('\n\n---\n\n').slice(0, 6000);

          systemPrompt += `\n\nBASE DE CONHECIMENTO RELEVANTE PARA ESTA CONVERSA:\n${ctx}\n\nQuando o cliente pedir imagens, fotos ou catálogo, mencione que vai enviar e o sistema anexará automaticamente. Se houver mais de uma opção, organize em lista. Use as descrições e links acima de forma natural.`;
        }
        // Guarda para retorno
        (globalThis as any).__selectedKnowledge = selected;
      }
    }

    if (body.mode === 'summary') systemPrompt = 'Você resume conversas em 2-3 frases curtas, objetivas e em português.';
    if (body.mode === 'copilot') systemPrompt = 'Você é um copiloto de vendas. Dado o histórico de conversa, sugira 3 respostas curtas e diretas (uma por linha, prefixe com "•"). NÃO escreva mais nada além disso.';

    // Pre-charge credits and BLOCK if insufficient (super_admin / unlimited auto-skipped by RPC)
    if (body.mode !== 'copilot') {
      const preAction = body.mode === 'summary' ? 'chat_message_text' : 'chat_message_text';
      const { data: pre } = await admin.rpc('deduct_credits_by_action', {
        _user_id: userId,
        _action: preAction,
        _quantity: 1,
        _metadata: { agent_id: body.agent_id || null, stage: 'pre', model, model_provider: providerType, model_id: model },
      });
      if (pre && (pre as any).ok === false) {
        return new Response(JSON.stringify({ error: 'Créditos insuficientes. Solicite recarga ao administrador.', code: 'insufficient_credits' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

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
      const { data: cur } = await admin.from('ai_agents').select('total_tokens_used').eq('id', body.agent_id).maybeSingle();
      await admin.from('ai_agents').update({ total_tokens_used: (cur?.total_tokens_used || 0) + tokensUsed }).eq('id', body.agent_id);
    }
    // Top-up charge if reply was long
    if (body.mode !== 'copilot' && content && content.length > 400) {
      try {
        await admin.rpc('deduct_credits_by_action', {
          _user_id: userId, _action: 'chat_message_long', _quantity: 1,
          _metadata: { agent_id: body.agent_id || null, model, tokens: tokensUsed, stage: 'topup', model_provider: providerType, model_id: model },
        });
      } catch (e) { console.warn('topup credit deduction failed', e); }
    }
    // Anexos: imagens e links dos itens de KB selecionados (para envio automático)
    const selected: any[] = ((globalThis as any).__selectedKnowledge as any[]) || [];
    const attachments = {
      images: selected.flatMap(s => Array.isArray(s.media_urls) ? s.media_urls : []).slice(0, 8),
      links: selected.flatMap(s => Array.isArray(s.external_links) ? s.external_links : []).slice(0, 6),
      sources: selected.map(s => ({ id: s.id, title: s.title, category: s.category })),
    };
    // Intent (handoff/qualificação) para o caller (webhook ou UI) agir
    const lastUserText = [...body.messages].reverse().find(m => m.role === 'user')?.content || '';
    const intent = body.agent_id ? detectIntent(lastUserText, { handoff_keywords: undefined }) : { handoff: false, qualified: false, wantsMedia: false };

    return new Response(JSON.stringify({ content, tokens: tokensUsed, attachments, intent }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('ai-agent', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
