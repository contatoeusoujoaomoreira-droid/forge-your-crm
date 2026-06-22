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
  else if (provider === 'groq' && cfg?.api_key_encrypted) { endpoint = 'https://api.groq.com/openai/v1/chat/completions'; apiKey = cfg.api_key_encrypted; }
  else if (provider === 'gemini' && cfg?.api_key_encrypted) { endpoint = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'; apiKey = cfg.api_key_encrypted; }
  else if (provider === 'anthropic' && cfg?.api_key_encrypted) { endpoint = 'https://api.anthropic.com/v1/messages'; apiKey = cfg.api_key_encrypted; }
  else if (provider === 'openrouter' && cfg?.api_key_encrypted) { endpoint = 'https://openrouter.ai/api/v1/chat/completions'; apiKey = cfg.api_key_encrypted; }
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

function buildSystemPrompt(agent: any, ctx: string, extras?: { adContext?: string; products?: string; faq?: string; clientInfo?: string }) {
  const tz = agent.timezone || 'America/Sao_Paulo';
  let nowStr = '';
  try {
    nowStr = new Intl.DateTimeFormat('pt-BR', {
      timeZone: tz, dateStyle: 'full', timeStyle: 'short',
    }).format(new Date());
  } catch { nowStr = new Date().toISOString(); }
  const priority = agent.knowledge_priority || 'default';
  const priorityMap: Record<string, string> = {
    default: '1) Produtos & Serviços, 2) FAQ, 3) Base de Conhecimento, 4) histórico, 5) CRM, 6) conhecimento geral do LLM.',
    faq_first: '1) FAQ, 2) Produtos & Serviços, 3) Base de Conhecimento, 4) histórico, 5) CRM, 6) conhecimento geral do LLM.',
    products_first: '1) Produtos & Serviços, 2) FAQ, 3) Base de Conhecimento, 4) histórico, 5) CRM, 6) conhecimento geral do LLM.',
    kb_first: '1) Base de Conhecimento, 2) Produtos & Serviços, 3) FAQ, 4) histórico, 5) CRM, 6) conhecimento geral do LLM.',
  };
  const antiHall = agent.anti_hallucination !== false;
  return [
    agent.system_prompt || 'Você é um assistente profissional no WhatsApp.',
    `Nome de apresentação: ${agent.display_name || agent.name || 'Agente'}`,
    `Personalidade: ${agent.personality || 'profissional'}`,
    `Estilo: ${agent.style || 'consultivo'}`,
    `Tom: ${agent.tone || 'cordial'}`,
    `Data/Hora atual (fuso ${tz}): ${nowStr}. Use sempre essa referência ao interpretar "hoje", "amanhã", "agora", etc.`,
    agent.rules ? `Regras e restrições:\n${agent.rules}` : '',
    agent.examples ? `Exemplos de conversa:\n${agent.examples}` : '',
    agent.objections ? `Objeções e respostas:\n${agent.objections}` : '',
    extras?.adContext ? `\n=== CONTEXTO DE ANÚNCIO (lead veio de campanha) ===\n${extras.adContext}\nUse esse contexto para reconhecer imediatamente o interesse do lead. Quando ele disser "do anúncio", "o anunciado", "esse imóvel/produto", ELE está se referindo ao produto acima — passe informações detalhadas dele e NÃO peça que descreva.` : '',
    extras?.products ? `\n=== PRODUTOS/SERVIÇOS DISPONÍVEIS ===\n${extras.products}` : '',
    extras?.faq ? `\n=== FAQ (Perguntas Frequentes — base de respostas) ===\n${extras.faq}\nIMPORTANTE: Interprete a intenção do lead, NÃO copie a pergunta cadastrada literalmente. Adapte a resposta para o tom da conversa e responda de forma natural.` : '',
    extras?.clientInfo ? `\n=== INFORMAÇÕES DO CLIENTE ===\n${extras.clientInfo}` : '',
    ctx ? `BASE DE CONHECIMENTO:\n${ctx}` : '',
    `\n=== ORDEM DE CONSULTA OBRIGATÓRIA ===\nAntes de responder, considere as fontes nesta ordem: ${priorityMap[priority] || priorityMap.default}\nSomente use seu conhecimento geral DEPOIS de verificar que a informação não existe nas fontes acima.`,
    antiHall ? `\n=== ANTI-ALUCINAÇÃO (OBRIGATÓRIO) ===\nSe a informação solicitada NÃO existir em Produtos & Serviços, FAQ, Base de Conhecimento ou no contexto da conversa, você NÃO deve inventar. Responda de forma segura, exemplo: "Não encontrei essa informação nas minhas referências atuais. Posso encaminhar sua dúvida para um atendente ou solicitar mais detalhes?"` : '',
    `\n=== POLÍTICA DE MÍDIA (OBRIGATÓRIO) ===\nVocê PODE receber e entender mensagens de áudio, imagens, vídeos, documentos, stickers e emojis enviados pelo lead.\n• Áudios são transcritos automaticamente e chegam até você como texto prefixado por "[ÁUDIO TRANSCRITO]". Trate exatamente como se o lead tivesse digitado o conteúdo da transcrição.\n• Imagens chegam com "[Descrição automática]" do conteúdo visual. Use-a como contexto real.\n• Documentos, vídeos e stickers chegam com a descrição/tipo do arquivo recebido.\n• NUNCA responda frases como "não consigo ouvir áudio", "não tenho acesso ao áudio", "não posso escutar mensagens de voz", "não consigo ver imagens" ou equivalentes. Essas respostas são PROIBIDAS.\n• Se um áudio chegou marcado com "[áudio recebido — transcrição indisponível]", peça gentilmente para o lead repetir por texto, mas NÃO afirme que você não consegue ouvir áudios — diga apenas que houve uma falha técnica momentânea na transcrição daquele áudio específico.`,
  ].filter(Boolean).join('\n\n');
}

// === Match FAQs to the current conversation ===
async function findMatchingFaqs(admin: any, userId: string, agentId: string | null, queryText: string) {
  try {
    let q = admin.from('agent_faq_items').select('id, question, answer, keywords, group_id, agent_id, is_active').eq('user_id', userId).eq('is_active', true);
    const { data: all } = await q;
    if (!all?.length) return [];
    const text = (queryText || '').toLowerCase();
    const words = text.split(/\W+/).filter((w: string) => w.length > 3);
    const scored = (all as any[]).map((it: any) => {
      let score = 0;
      if (it.agent_id && agentId && it.agent_id !== agentId) score -= 100;
      const q = String(it.question || '').toLowerCase();
      const kw: string[] = Array.isArray(it.keywords) ? it.keywords : [];
      for (const k of kw) if (k && text.includes(String(k).toLowerCase())) score += 6;
      for (const w of words) if (q.includes(w)) score += 2;
      // bigram overlap
      const qWords = q.split(/\W+/).filter((w: string) => w.length > 3);
      const inter = qWords.filter((w: string) => words.includes(w)).length;
      score += inter * 3;
      return { it, score };
    }).filter((x: any) => x.score > 0).sort((a: any, b: any) => b.score - a.score).slice(0, 5);
    return scored.map((x: any) => x.it);
  } catch (e) { console.warn('findMatchingFaqs error', e); return []; }
}

function formatFaqsForPrompt(faqs: any[]) {
  if (!faqs?.length) return '';
  return faqs.map((f: any) => `P: ${f.question}\nR: ${f.answer}`).join('\n\n---\n\n');
}

async function logConsultation(admin: any, userId: string, agentId: string | null, clientId: string | null, query: string, sources: any) {
  try {
    await admin.from('agent_consultation_logs').insert({
      user_id: userId, agent_id: agentId, client_id: clientId,
      query: String(query || '').slice(0, 2000),
      sources,
    });
  } catch (e) { console.warn('logConsultation failed', e); }
}

// === Match products to the current conversation ===
async function findMatchingProducts(admin: any, userId: string, agentId: string | null, queryText: string, attribution: any) {
  try {
    const { data: all } = await admin.from('products_services')
      .select('id,name,niche,segment,description,categories,keywords,price_label,ad_identifiers,ad_source,images,external_links,benefits,features,differentials,conditions,warranties,notes,agent_id')
      .eq('user_id', userId).eq('is_active', true);
    if (!all?.length) return [];
    const q = (queryText || '').toLowerCase();
    const adId = String(attribution?.content || attribution?.term || attribution?.campaign || attribution?.headline || '').toLowerCase();
    const scored = all.map((p: any) => {
      let score = 0;
      // Restrict to agent if linked
      if (p.agent_id && agentId && p.agent_id !== agentId) score -= 100;
      // Ad identifier match (strongest signal)
      if (adId && Array.isArray(p.ad_identifiers)) {
        if (p.ad_identifiers.some((id: string) => adId.includes(String(id).toLowerCase()))) score += 50;
      }
      // Keyword/category match
      if (q) {
        for (const k of (p.keywords || [])) if (k && q.includes(String(k).toLowerCase())) score += 5;
        for (const c of (p.categories || [])) if (c && q.includes(String(c).toLowerCase())) score += 3;
        if (p.name && q.includes(String(p.name).toLowerCase())) score += 8;
        if (p.niche && q.includes(String(p.niche).toLowerCase())) score += 4;
      }
      return { p, score };
    }).filter((x: any) => x.score > 0).sort((a: any, b: any) => b.score - a.score).slice(0, 4);
    return scored.map((x: any) => x.p);
  } catch (e) { console.warn('findMatchingProducts error', e); return []; }
}

function formatProductsForPrompt(prods: any[]) {
  if (!prods?.length) return '';
  return prods.map((p: any) => {
    return [
      `• ${p.name}${p.niche ? ` (${p.niche})` : ''}${p.price_label ? ` — ${p.price_label}` : ''}`,
      p.description ? `  Descrição: ${String(p.description).slice(0, 500)}` : '',
      p.benefits ? `  Benefícios: ${String(p.benefits).slice(0, 400)}` : '',
      p.features ? `  Características: ${String(p.features).slice(0, 400)}` : '',
      p.differentials ? `  Diferenciais: ${String(p.differentials).slice(0, 300)}` : '',
      p.conditions ? `  Condições: ${String(p.conditions).slice(0, 300)}` : '',
      p.warranties ? `  Garantias: ${String(p.warranties).slice(0, 200)}` : '',
      p.categories?.length ? `  Categorias: ${p.categories.join(', ')}` : '',
    ].filter(Boolean).join('\n');
  }).join('\n\n');
}

function formatAdContext(attribution: any, matchedProduct: any) {
  if (!attribution && !matchedProduct) return '';
  const lines: string[] = [];
  if (attribution?.source) lines.push(`Origem do anúncio: ${attribution.source}${attribution.medium ? ` / ${attribution.medium}` : ''}`);
  if (attribution?.campaign) lines.push(`Campanha: ${attribution.campaign}`);
  if (attribution?.content) lines.push(`ID do criativo: ${attribution.content}`);
  if (attribution?.headline) lines.push(`Título do anúncio: ${attribution.headline}`);
  if (attribution?.source_url) lines.push(`URL: ${attribution.source_url}`);
  if (matchedProduct) {
    lines.push(`\nProduto/serviço do anúncio: ${matchedProduct.name}`);
    if (matchedProduct.description) lines.push(`Descrição: ${String(matchedProduct.description).slice(0, 800)}`);
    if (matchedProduct.price_label) lines.push(`Preço: ${matchedProduct.price_label}`);
  }
  return lines.join('\n');
}

interface NormalizedMsg {
  phone: string;
  name?: string;
  content: string;
  external_message_id?: string;
  media_url?: string;
  media_type?: string;
  avatar_url?: string;
  from_me?: boolean;
  timestamp?: string;
}

function normalizeZApi(raw: any): NormalizedMsg {
  const phone = raw.phone || raw.from || raw.sender || '';
  const name = raw.senderName || raw.chatName || raw.notifyName;
  // Detect more media types: image, video, audio, document, sticker, reaction
  const mediaType = raw.image ? 'image'
    : raw.video ? 'video'
    : raw.audio ? 'audio'
    : raw.document ? 'document'
    : raw.sticker ? 'sticker'
    : raw.reaction ? 'reaction'
    : undefined;
  const mediaCaption = raw.image?.caption || raw.video?.caption || raw.document?.caption || '';
  const reactionEmoji = raw.reaction?.value || raw.reaction?.emoji || raw.reaction?.text;
  // Z-API interactive button reply: { buttonsResponseMessage: { message, buttonId } } or top-level fields
  const buttonReplyText = raw.buttonsResponseMessage?.message || raw.buttonReply?.label || raw.buttonReply?.message || raw.listResponseMessage?.message || raw.selectedButtonId || raw.buttonId;
  const text = buttonReplyText || raw.text?.message || raw.message?.text || raw.message || raw.body || raw.caption || mediaCaption || (reactionEmoji ? reactionEmoji : '');
  const moment = Number(raw.momment || raw.moment || raw.timestamp || 0);
  const isGroup = !!(raw.isGroup || raw.participantPhone || raw.groupId || (typeof raw.chatName === 'string' && raw.chatName !== name));
  return {
    phone: normalizePhone(phone),
    name,
    content: text || (mediaType ? `[${mediaType}]` : ''),
    external_message_id: raw.messageId || raw.messageID || raw.id || raw.key?.id,
    media_url: raw.image?.imageUrl || raw.video?.videoUrl || raw.audio?.audioUrl || raw.document?.documentUrl || raw.sticker?.stickerUrl,
    media_type: mediaType,
    avatar_url: raw.photo || raw.profilePicUrl || raw.profilePicture || raw.senderPhoto || raw.avatarUrl || raw.picture || raw.profile?.picture || raw.contact?.profilePicUrl,
    from_me: raw.fromMe === true || raw.fromMe === 'true',
    timestamp: moment ? new Date(moment).toISOString() : undefined,
    is_group: isGroup,
    reaction_emoji: reactionEmoji,
    document_filename: raw.document?.fileName || raw.document?.filename,
  } as any;
}

function normalizeEvolution(raw: any): NormalizedMsg {
  const data = raw.data || raw;
  const key = data.key || {};
  const msg = data.message || {};
  const phone = (key.remoteJid || '').split('@')[0];
  const isGroup = (key.remoteJid || '').includes('@g.us');
  const text = msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || msg.videoMessage?.caption || msg.documentMessage?.caption || '';
  const reactionEmoji = msg.reactionMessage?.text;
  const mediaType = msg.imageMessage ? 'image'
    : msg.videoMessage ? 'video'
    : msg.audioMessage ? 'audio'
    : msg.documentMessage ? 'document'
    : msg.stickerMessage ? 'sticker'
    : reactionEmoji ? 'reaction'
    : undefined;
  // UAZAPI/Evolution surface media url at top-level of data (mediaUrl/fileUrl) or inside the message node (url)
  const mediaUrl = data.mediaUrl || data.fileUrl || data.FileURL || data.media?.url
    || msg.imageMessage?.url || msg.videoMessage?.url || msg.audioMessage?.url
    || msg.documentMessage?.url || msg.stickerMessage?.url;
  return {
    phone: normalizePhone(phone),
    name: data.pushName,
    content: text || reactionEmoji || (mediaType ? `[${mediaType}]` : ''),
    external_message_id: key.id,
    from_me: key.fromMe === true,
    media_url: mediaUrl,
    media_type: mediaType,
    avatar_url: data.profilePicUrl || data.profilePicture || data.senderPhoto || data.avatarUrl || data.picture,
    is_group: isGroup,
    reaction_emoji: reactionEmoji,
    document_filename: msg.documentMessage?.fileName || data.fileName,
  } as any;
}

function mediaTypeFromMime(mime?: string, fallback?: string): string | undefined {
  const m = (mime || '').toLowerCase();
  const f = (fallback || '').toLowerCase();
  if (f.includes('reaction')) return 'reaction';
  if (m.includes('image') || f.includes('image') || f.includes('sticker')) return f.includes('sticker') ? 'sticker' : 'image';
  if (m.includes('video') || f.includes('video')) return 'video';
  if (m.includes('audio') || f.includes('audio') || f.includes('ptt')) return 'audio';
  if (m || f.includes('document') || f.includes('file')) return 'document';
  return undefined;
}

const compactExternalId = (id?: string) => {
  const v = String(id || '').trim();
  return v.includes(':') ? v.split(':').pop() : v;
};

function normalizeUmclique(raw: any): NormalizedMsg | null {
  const event = raw.event || {};
  const chat = raw.chat || raw.data?.chat || {};
  const message = raw.message || raw.data?.message || event.message || {};
  const isDownloaded = String(raw.type || '').toLowerCase().includes('filedownloaded');
  const fromMe = isDownloaded ? event.IsFromMe === true : (message.fromMe === true || message.from_me === true || message.isFromMe === true);
  const chatId = isDownloaded
    ? (event.Chat || event.chatid || event.Sender || '')
    : (message.chatid || message.chatId || chat.wa_chatid || chat.id || chat.phone || message.to || message.from || '');
  const phone = normalizePhone(chat.phone || chatId || message.sender || event.Sender || '');
  const name = chat.wa_contactName || chat.name || chat.wa_name || raw.name || message.pushName || message.senderName;
  const contentObj = message.content || {};
  const mime = isDownloaded ? event.MimeType : (contentObj.mimetype || contentObj.mimeType || message.mime_type);
  const msgType = message.type || raw.type || event.Type || chat.wa_lastMessageType;
  const mediaType = isDownloaded ? mediaTypeFromMime(mime, event.Type) : mediaTypeFromMime(mime, msgType);
  const fileUrl = isDownloaded ? event.FileURL : (contentObj.FileURL || contentObj.fileUrl || contentObj.url || contentObj.URL || message.media_url || message.mediaUrl);
  const text = message.text || message.body || message.caption || contentObj.caption || contentObj.text || raw.text || raw.body || '';
  const ts = isDownloaded ? event.Timestamp : (message.timestamp || chat.wa_lastMsgTimestamp || raw.timestamp);
  const timestamp = typeof ts === 'number'
    ? new Date(ts > 10_000_000_000 ? ts : ts * 1000).toISOString()
    : (typeof ts === 'string' && ts ? ts : undefined);
  const ids = isDownloaded ? event.MessageIDs : undefined;
  const externalId = compactExternalId(message.id || message.messageId || raw.message_id || raw.id || (Array.isArray(ids) ? ids[0] : undefined));
  if (!phone && !externalId) return null;
  return {
    phone,
    name,
    content: text || (mediaType ? `[${mediaType}]` : ''),
    external_message_id: externalId,
    media_url: fileUrl,
    media_type: mediaType,
    avatar_url: chat.imagePreview || chat.image || chat.avatar || chat.profilePicUrl || raw.avatar_url,
    from_me: fromMe,
    timestamp,
    is_group: chat.wa_isGroup === true || event.IsGroup === true || String(chatId).includes('@g.us'),
    document_filename: contentObj.fileName || contentObj.filename || event.FileName,
  } as any;
}

// Extract Click-to-WhatsApp Ads / referral metadata from inbound raw payload.
// Covers Meta/Z-API/Evolution variants: source_url, source_id, ctwa_clid, headline, body.
function extractReferral(raw: any): {
  ctwa_clid?: string; source_url?: string; source_id?: string; headline?: string; body?: string;
  source_type?: string; campaign?: string; content?: string; term?: string; medium?: string; source?: string;
} | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw.data || raw;
  const msg = data.message || raw.message || {};
  // Look in several common locations
  const candidates = [
    raw.referral, data.referral, msg.referral,
    msg.extendedTextMessage?.contextInfo?.externalAdReply,
    msg.imageMessage?.contextInfo?.externalAdReply,
    msg.videoMessage?.contextInfo?.externalAdReply,
    msg.conversation?.contextInfo?.externalAdReply,
    raw.contextInfo?.externalAdReply,
    data.contextInfo?.externalAdReply,
    raw.click_to_wa, data.click_to_wa,
  ].filter(Boolean);
  const ref = candidates[0];
  if (!ref) return null;
  const sourceUrl: string | undefined = ref.source_url || ref.sourceUrl || ref.url;
  let ctwa: string | undefined = ref.ctwa_clid || ref.ctwaClid || ref.click_id || ref.clickId;
  let utm: Record<string, string> = {};
  if (sourceUrl) {
    try {
      const u = new URL(sourceUrl);
      utm = {
        source: u.searchParams.get('utm_source') || '',
        medium: u.searchParams.get('utm_medium') || '',
        campaign: u.searchParams.get('utm_campaign') || '',
        content: u.searchParams.get('utm_content') || '',
        term: u.searchParams.get('utm_term') || '',
      };
      if (!ctwa) ctwa = u.searchParams.get('ctwa_clid') || undefined;
    } catch {}
  }
  return {
    ctwa_clid: ctwa,
    source_url: sourceUrl,
    source_id: ref.source_id || ref.sourceId || ref.ad_id,
    headline: ref.headline || ref.title,
    body: ref.body || ref.description,
    source_type: ref.source_type || ref.sourceType || (sourceUrl ? 'ad' : undefined),
    source: utm.source || 'facebook',
    medium: utm.medium || 'click_to_wa',
    campaign: utm.campaign || ref.campaign_id || ref.campaignId,
    content: utm.content || ref.adset_id || ref.adsetId,
    term: utm.term || ref.ad_id || ref.adId,
  };
}

function extractAvatarUrl(input: any): string | undefined {
  if (!input || typeof input !== 'object') return typeof input === 'string' && input.startsWith('http') ? input : undefined;
  const directKeys = ['photo', 'senderPhoto', 'profilePicUrl', 'profilePicture', 'profile_pic_url', 'avatarUrl', 'avatar_url', 'picture', 'image', 'imagePreview', 'imageUrl', 'img', 'imgUrl', 'thumb', 'thumbnail', 'link', 'url'];
  for (const key of directKeys) {
    const value = input?.[key];
    if (typeof value === 'string' && value.startsWith('http')) return value;
  }
  for (const value of Object.values(input)) {
    if (value && typeof value === 'object') {
      const nested = extractAvatarUrl(value);
      if (nested) return nested;
    }
  }
  return undefined;
}

// Status callback (delivered / read) — used to update ✓✓ ticks on existing messages.
function detectStatusCallback(raw: any): { external_message_id?: string; status: string } | null {
  // Z-API: { type: 'MessageStatusCallback', status: 'READ'|'RECEIVED'|'PLAYED', messageId }
  const t = (raw?.type || raw?.event || '').toString().toLowerCase();
  if (t.includes('status') && (raw.messageId || raw.id)) {
    const s = (raw.status || raw.ack || '').toString().toLowerCase();
    let mapped = 'sent';
    if (s.includes('read') || s.includes('played') || raw.ack === 3 || raw.ack === 4) mapped = 'read';
    else if (s.includes('receiv') || s.includes('deliver') || raw.ack === 2) mapped = 'delivered';
    return { external_message_id: raw.messageId || raw.id, status: mapped };
  }
  if (t.includes('readreceipt') || (raw.EventType === 'messages_update' && raw.event?.MessageIDs && !String(raw.type || '').toLowerCase().includes('filedownloaded'))) {
    const ids = raw.event?.MessageIDs || raw.MessageIDs;
    const statusText = String(raw.state || raw.event?.Type || raw.status || '').toLowerCase();
    const status = statusText.includes('read') ? 'read' : statusText.includes('deliver') ? 'delivered' : 'sent';
    return { external_message_id: compactExternalId(Array.isArray(ids) ? ids[0] : ids), status };
  }
  return null;
}

function normalizeWasender(raw: any): NormalizedMsg | null {
  // Wasender webhook: { event: "messages.received", data: { messages: { key, messageBody, message } } }
  const data = raw.data || {};
  const m = data.messages || data.message || {};
  const key = m.key || {};
  const phoneRaw = key.cleanedSenderPn || key.cleanedParticipantPn || (key.remoteJid || '').split('@')[0] || '';
  const phone = normalizePhone(phoneRaw);
  const isGroup = String(key.remoteJid || '').includes('@g.us');
  const messageObj = m.message || {};
  const mediaKeys: Record<string, string> = {
    imageMessage: 'image', videoMessage: 'video', audioMessage: 'audio',
    documentMessage: 'document', stickerMessage: 'sticker',
  };
  let mediaType: string | undefined;
  let mediaUrl: string | undefined;
  let filename: string | undefined;
  for (const [k, t] of Object.entries(mediaKeys)) {
    if (messageObj[k]) {
      mediaType = t;
      mediaUrl = messageObj[k].url || messageObj[k].directPath;
      filename = messageObj[k].fileName;
      break;
    }
  }
  const text = m.messageBody || messageObj.conversation || messageObj.extendedTextMessage?.text || messageObj.imageMessage?.caption || messageObj.videoMessage?.caption || messageObj.documentMessage?.caption || '';
  const ts = raw.timestamp ? Number(raw.timestamp) : 0;
  if (!phone && !key.id) return null;
  return {
    phone,
    name: m.pushName || data.pushName,
    content: text || (mediaType ? `[${mediaType}]` : ''),
    external_message_id: key.id,
    media_url: mediaUrl,
    media_type: mediaType,
    from_me: key.fromMe === true,
    timestamp: ts ? new Date(ts > 10_000_000_000 ? ts : ts * 1000).toISOString() : undefined,
    is_group: isGroup,
    document_filename: filename,
  } as any;
}

function normalizeOmniconect(raw: any): NormalizedMsg | null {
  // UAZAPI v2 webhook: { event: "messages", data: { key, message, pushName, messageTimestamp, ... } }
  const data = raw.data || raw.message || raw;
  if (!data) return null;
  // Some payloads use simplified shape: { from, text, type, media }
  if (data.from && (data.text || data.media || data.type)) {
    const phone = normalizePhone(String(data.from).split('@')[0] || '');
    return {
      phone, name: data.pushName || data.notifyName,
      content: data.text || (data.type ? `[${data.type}]` : ''),
      external_message_id: data.id || data.messageId,
      from_me: data.fromMe === true,
      media_url: data.media?.url || data.mediaUrl,
      media_type: data.type,
      is_group: String(data.from).includes('@g.us'),
    } as any;
  }
  // Baileys-shaped payload (key + message)
  return normalizeEvolution({ data });
}

function normalizeOmniChat(raw: any): NormalizedMsg | null {
  const chat = raw.chat || raw.data?.chat || {};
  const chatId = chat.wa_chatid || chat.chatid || chat.id || chat.phone || '';
  const isGroup = chat.wa_isGroup === true || String(chatId).includes('@g.us');
  const phoneSource = chat.phone || chat.wa_chatid || chat.wa_fastid?.split(':')?.pop() || chatId;
  const phone = normalizePhone(String(phoneSource || '').split('@')[0]);
  const text = chat.wa_lastMessageText || chat.wa_lastMessageTextVote || chat.lastMessageText || chat.last_message || '';
  const msgType = chat.wa_lastMessageType || chat.lastMessageType || chat.type || '';
  const mediaType = mediaTypeFromMime('', msgType);
  const tsRaw = Number(chat.wa_lastMsgTimestamp || chat.lastMessageTimestamp || chat.timestamp || 0);
  const eventMs = tsRaw ? (tsRaw > 10_000_000_000 ? tsRaw : tsRaw * 1000) : 0;
  if (eventMs && Date.now() - eventMs > 30 * 60 * 1000) return null;
  const timestamp = eventMs ? new Date(eventMs).toISOString() : undefined;
  const externalId = chat.wa_lastMessageId || chat.lastMessageId || (tsRaw ? `omni-chat:${raw.instanceName || raw.owner || ''}:${chatId || phone}:${tsRaw}:${msgType}` : undefined);
  const sender = String(chat.wa_lastMessageSender || chat.lastMessageSender || '');
  const owner = normalizePhone(String(raw.owner || chat.owner || ''));
  const fromMe = !!owner && normalizePhone(sender.split('@')[0]) === owner;
  const content = String(text || '').trim() || (mediaType ? `[${mediaType}]` : '');

  if (!phone || !content || phone === '0') return null;
  return {
    phone,
    name: chat.wa_contactName || chat.wa_name || chat.name || phone,
    content,
    external_message_id: externalId,
    media_type: mediaType,
    avatar_url: chat.imagePreview || chat.image || chat.avatar || chat.profilePicUrl,
    from_me: fromMe,
    timestamp,
    is_group: isGroup,
  } as any;
}

function detectAndNormalize(raw: any): NormalizedMsg | null {
  const eventType = String(raw.EventType || raw.event_type || '').toLowerCase();
  if (raw.instanceName && ['groups', 'presence', 'connection', 'contacts'].includes(eventType)) return null;
  if (raw.instanceName && eventType === 'chats' && raw.chat) return normalizeOmniChat(raw);
  // UAZAPI/OmniConect: event === 'messages' (singular 'messages' without dot suffix)
  if (typeof raw.event === 'string' && /^(messages|messages_upsert)$/i.test(raw.event) && (raw.data?.key || raw.data?.from || raw.data?.message)) return normalizeOmniconect(raw);
  // Wasender: event field with messages.received / data.messages structure
  if (typeof raw.event === 'string' && raw.event.startsWith('messages.') && raw.data?.messages) return normalizeWasender(raw);
  if (raw.instanceName || raw.owner || raw.chat || raw.message || raw.EventType || String(raw.type || '').includes('FileDownloaded')) return normalizeUmclique(raw);
  if (raw.type === 'ReceivedCallback' || raw.event === 'message' || raw.text || raw.messageId || raw.phone) return normalizeZApi(raw);
  if (raw.data?.key) return normalizeOmniconect(raw);
  if (raw.phone && raw.message) {
    return { phone: normalizePhone(raw.phone), name: raw.name, content: raw.message };
  }
  return null;
}

// Transcribe audio. Cascade: Groq Whisper → OpenAI Whisper → ElevenLabs Scribe → Lovable AI Gemini multimodal.
// Lovable AI is universal fallback (no user key needed).
async function transcribeAudio(audioUrl: string, providerCfg: any, openaiKey: string, elevenKey: string = '', _lovableKey: string = '', waCfg: any = null, externalId: string = ''): Promise<string> {
  try {
    let buf: ArrayBuffer | null = null;
    let ct = 'audio/ogg';

    // 1) UAZAPI/OmniConect-family: try /message/download — returns decrypted media.
    //    The raw mediaUrl is often a WhatsApp-encrypted .enc blob (random bytes),
    //    which makes Whisper hallucinate. /message/download returns the decrypted
    //    file. We attempt this whenever the provider exposes base_url + api_token
    //    (omniconect, free.uazapi.com, self-hosted UAZAPI all support it).
    const isEncUrl = /\.enc(\?|$)/i.test(audioUrl || '');
    if (externalId && waCfg?.api_token && waCfg?.base_url) {
      try {
        const root = String(waCfg.base_url).replace(/\/+$/, '').replace(/\/(send-text|send-image|send-document|status|profile-picture|chat).*$/, '');
        // UAZAPI native: ask for decrypted MP3 + automatic transcription using the instance/OpenAI key.
        const dlBody: any = {
          id: externalId,
          messageid: externalId,
          messageId: externalId,
          generate_mp3: true,
          return_link: true,
          return_base64: true,
          transcribe: true,
        };
        if (openaiKey) dlBody.openai_apikey = openaiKey;
        const dl = await fetch(`${root}/message/download`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', token: waCfg.api_token, apikey: waCfg.api_token },
          body: JSON.stringify(dlBody),
        });
        if (dl.ok) {
          const j = await dl.json().catch(() => null);
          // 1a) If UAZAPI already transcribed for us, use it directly (best path).
          const nativeTxt = (j?.transcription || j?.transcript || '').toString().trim();
          if (nativeTxt && nativeTxt.length > 1) {
            console.log('[STT] uazapi native transcription len=', nativeTxt.length);
            return nativeTxt;
          }
          const b64 = j?.fileBase64 || j?.base64 || j?.base64Data || j?.file || j?.data || j?.audio;
          const mime = j?.mimetype || j?.mimeType || 'audio/mpeg';
          if (typeof b64 === 'string' && b64.length > 500) {
            const clean = b64.includes(',') ? b64.split(',').pop()! : b64;
            const bin = atob(clean);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            buf = bytes.buffer;
            ct = mime;
            console.log(`[STT] /message/download ok bytes=${bytes.length} mime=${mime}`);
          } else if (j?.fileURL) {
            try {
              const fr = await fetch(j.fileURL);
              if (fr.ok) {
                buf = await fr.arrayBuffer();
                ct = fr.headers.get('content-type') || mime;
                console.log(`[STT] fileURL fetched bytes=${buf.byteLength}`);
              }
            } catch (e) { console.warn('[STT] fileURL fetch error', String(e).slice(0, 200)); }
          } else {
            console.warn('[STT] /message/download no usable payload keys=', Object.keys(j || {}).join(','));
          }
        } else {
          const errTxt = await dl.text().catch(() => '');
          console.warn('[STT] /message/download http', dl.status, errTxt.slice(0, 200));
        }
      } catch (e) { console.warn('[STT] /message/download error', String(e).slice(0, 200)); }
    }
    if (!buf && isEncUrl) {
      console.warn('[STT] encrypted .enc URL and no /message/download available — cannot transcribe', audioUrl.slice(0, 120));
      return '';
    }

    // 2) Fallback: direct URL download (may need provider token).
    if (!buf) {
      const headers: Record<string, string> = {};
      if (waCfg?.api_token) {
        headers['token'] = waCfg.api_token;
        headers['apikey'] = waCfg.api_token;
        headers['Authorization'] = `Bearer ${waCfg.api_token}`;
      }
      let audioResp = await fetch(audioUrl, { headers });
      if (!audioResp.ok && Object.keys(headers).length) audioResp = await fetch(audioUrl);
      if (!audioResp.ok) {
        console.warn('audio download failed', audioResp.status, audioUrl.slice(0, 120));
        return '';
      }
      buf = await audioResp.arrayBuffer();
      ct = audioResp.headers.get('content-type') || 'audio/ogg';
    }

    if (!buf || buf.byteLength < 1500) {
      console.warn('audio too small / invalid', buf?.byteLength);
      return '';
    }

    // Magic-bytes check — only proceed if the bytes look like a real audio container.
    // This blocks encrypted .enc payloads and HTML error pages from being sent to
    // Whisper, which is what was producing the random/hallucinated transcripts.
    const head = new Uint8Array(buf.slice(0, 12));
    const headStr = String.fromCharCode(...head);
    const isOgg = headStr.startsWith('OggS');
    const isMp3 = headStr.startsWith('ID3') || (head[0] === 0xFF && (head[1] & 0xE0) === 0xE0);
    const isWav = headStr.startsWith('RIFF');
    const isM4a = headStr.slice(4, 8) === 'ftyp';
    if (!isOgg && !isMp3 && !isWav && !isM4a) {
      console.warn('audio bytes not a known container, skipping transcription', Array.from(head).map((b) => b.toString(16)).join(' '));
      return '';
    }
    if (isOgg) ct = 'audio/ogg';
    else if (isMp3) ct = 'audio/mpeg';
    else if (isWav) ct = 'audio/wav';
    else if (isM4a) ct = 'audio/mp4';

    const blob = new Blob([buf], { type: ct });
    const fmt = isMp3 ? 'mp3' : isWav ? 'wav' : isM4a ? 'm4a' : 'ogg';

    // 1) Groq Whisper (fast + cheap) when user selected Groq
    if (providerCfg?.provider === 'groq' && providerCfg?.api_key_encrypted) {
      const fd = new FormData();
      fd.append('file', blob, `audio.${fmt}`);
      fd.append('model', 'whisper-large-v3-turbo');
      fd.append('language', 'pt');
      fd.append('temperature', '0');
      fd.append('response_format', 'json');
      const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST', headers: { Authorization: `Bearer ${providerCfg.api_key_encrypted}` }, body: fd,
      });
      if (r.ok) { const j = await r.json(); if (j.text) return j.text; }
      else console.error('groq whisper failed', (await r.text()).slice(0, 300));
    }

    // 2) OpenAI Whisper
    const oaKey = (providerCfg?.provider === 'openai' && providerCfg?.api_key_encrypted) || openaiKey;
    if (oaKey) {
      const fd = new FormData();
      fd.append('file', blob, `audio.${fmt}`);
      fd.append('model', 'whisper-1');
      fd.append('language', 'pt');
      fd.append('temperature', '0');
      fd.append('response_format', 'json');
      const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST', headers: { Authorization: `Bearer ${oaKey}` }, body: fd,
      });
      if (r.ok) { const j = await r.json(); if (j.text) return j.text; }
      else console.error('openai whisper failed', (await r.text()).slice(0, 300));
    }

    // 3) ElevenLabs Scribe
    if (elevenKey) {
      const fd = new FormData();
      fd.append('file', blob, `audio.${fmt}`);
      fd.append('model_id', 'scribe_v1');
      fd.append('language_code', 'por');
      const r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST', headers: { 'xi-api-key': elevenKey }, body: fd,
      });
      if (r.ok) { const j = await r.json(); if (j.text) return j.text; }
      else console.error('elevenlabs scribe failed', (await r.text()).slice(0, 300));
    }

    // 4) Lovable AI Gateway — Gemini 2.5 Flash multimodal (universal fallback, no user key needed).
    //    Safe now that the magic-bytes check above rejects encrypted .enc blobs / HTML errors
    //    that previously caused hallucinated transcripts.
    const lovableKey = Deno.env.get('LOVABLE_API_KEY') || '';
    if (lovableKey) {
      try {
        const bytes = new Uint8Array(buf);
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        const b64 = btoa(binary);
        const audioFormat = isMp3 ? 'mp3' : isWav ? 'wav' : isM4a ? 'm4a' : 'webm';
        const body = {
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are an accurate speech-to-text engine. Transcribe the audio verbatim in the original language (Brazilian Portuguese unless clearly another language). Output ONLY the transcription, with no commentary, no quotes, no prefixes. If the audio is silent or unintelligible, output exactly: [inaudível]' },
            { role: 'user', content: [
              { type: 'text', text: 'Transcreva este áudio literalmente.' },
              { type: 'input_audio', input_audio: { data: b64, format: audioFormat } },
            ]},
          ],
          temperature: 0,
        };
        const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (r.ok) {
          const j = await r.json();
          const text = (j?.choices?.[0]?.message?.content || '').trim();
          if (text && !/^\[?inaud[ií]vel\]?$/i.test(text)) return text;
        } else {
          console.error('lovable gemini stt failed', r.status, (await r.text()).slice(0, 300));
        }
      } catch (e) { console.error('lovable gemini stt error', e); }
    }

    return '';
  } catch (e) {
    console.error('transcribeAudio error', e);
    return '';
  }
}

// Describe image via the agent's selected vision provider.
async function describeImage(imageUrl: string, providerCfg: any, openaiKey: string): Promise<string> {
  try {
    const imageResp = await fetch(imageUrl);
    if (!imageResp.ok) return '';
    const ct = imageResp.headers.get('content-type') || 'image/jpeg';
    const bytes = new Uint8Array(await imageResp.arrayBuffer());
    let binary = '';
    const chunkSz = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSz) binary += String.fromCharCode(...bytes.subarray(i, i + chunkSz));
    const b64 = btoa(binary);

    // Gemini vision when user selected Gemini
    if ((providerCfg?.provider === 'gemini' || providerCfg?.provider === 'google') && providerCfg?.api_key_encrypted) {
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
    if (key) {
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
      if (r.ok) {
        const j = await r.json();
        const desc = j.choices?.[0]?.message?.content || '';
        if (desc) return desc;
      }
    }

    const lovableKey = Deno.env.get('LOVABLE_API_KEY') || '';
    if (lovableKey) {
      const lr = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: [
            { type: 'text', text: 'Descreva em português o conteúdo desta imagem com foco no atendimento do cliente. Seja objetivo.' },
            { type: 'image_url', image_url: { url: imageUrl } },
          ] }],
        }),
      });
      if (lr.ok) { const lj = await lr.json(); return lj.choices?.[0]?.message?.content || ''; }
    }
  } catch (e) {
    console.error('describeImage error', e);
    return '';
  }
}

// Generate audio. Priority:
//  - elevenlabs (if configured)
//  - openai (user key) — including 'omni' since Lovable Gateway does NOT support TTS
//  - elevenlabs as last resort if available
async function generateTtsBase64(text: string, voice: string, openaiKey: string, provider: string = 'omni', elevenKey: string = ''): Promise<string> {
  const input = text.slice(0, 4000);
  const toMp3DataUrl = async (resp: Response) => {
    const buf = new Uint8Array(await resp.arrayBuffer());
    let binary = ''; const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) binary += String.fromCharCode(...buf.subarray(i, i + chunk));
    return `data:audio/mpeg;base64,${btoa(binary)}`;
  };
  const tryEleven = async (vid: string) => {
    if (!elevenKey) return '';
    try {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: { 'xi-api-key': elevenKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input, model_id: 'eleven_multilingual_v2' }),
      });
      if (!r.ok) { console.error('ElevenLabs TTS failed', r.status, (await r.text()).slice(0,200)); return ''; }
      return await toMp3DataUrl(r);
    } catch (e) { console.error('ElevenLabs TTS error', e); return ''; }
  };
  const tryOpenAi = async (vid: string) => {
    if (!openaiKey) return '';
    try {
      const r = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'tts-1', voice: vid || 'alloy', input, response_format: 'mp3' }),
      });
      if (!r.ok) { console.error('OpenAI TTS failed', r.status, (await r.text()).slice(0,200)); return ''; }
      return await toMp3DataUrl(r);
    } catch (e) { console.error('OpenAI TTS error', e); return ''; }
  };

  // Provider preference
  if (provider === 'elevenlabs') {
    const a = await tryEleven(voice || '21m00Tcm4TlvDq8ikWAM');
    if (a) return a;
    // fallback to openai
    return await tryOpenAi('alloy');
  }
  // omni / openai: try OpenAI key first (real audio); if missing, try ElevenLabs
  const isOpenAiVoice = ['alloy','echo','fable','onyx','nova','shimmer','coral','sage','verse','ash'].includes(voice);
  const a = await tryOpenAi(isOpenAiVoice ? voice : 'alloy');
  if (a) return a;
  console.warn('TTS: no OpenAI key — falling back to ElevenLabs if available');
  return await tryEleven(elevenKey ? '21m00Tcm4TlvDq8ikWAM' : '');
}

// Returns true when the (provider,model) pair accepts OpenAI-style multimodal
// content arrays with `image_url` blocks. Used to decide whether to forward
// the original image to the LLM instead of (or in addition to) a textual
// description fallback.
function modelSupportsVision(provider: string, model: string): boolean {
  const m = (model || '').toLowerCase();
  if (provider === 'anthropic') return /claude-3|claude-3\.5|claude-3\.7|claude-4/.test(m);
  if (provider === 'openai') return /gpt-4o|gpt-4\.1|gpt-5|o1|o3|o4/.test(m) && !/mini-realtime|tts|whisper/.test(m);
  if (provider === 'gemini' || provider === 'google') return /gemini-(1\.5|2|2\.5|3)/.test(m);
  if (provider === 'groq') return /llama-3\.2-.*vision|llava|llama-4|llama-3\.3-70b-versatile-vision/.test(m);
  if (provider === 'openrouter') return /vision|gpt-4o|gemini|claude-3|llava/.test(m);
  // Lovable Gateway: gemini-* and gpt-4o/5 are multimodal
  if (provider === 'lovable') return /gemini-(2|2\.5|3)|gpt-4o|gpt-5/.test(m);
  return false;
}

type MmContent = string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
type MmMessage = { role: string; content: MmContent };

async function callAi(systemPrompt: string, history: MmMessage[], runtime: { endpoint: string; apiKey: string; model: string; provider?: string }, tools?: any[]) {
  const provider = runtime.provider || 'lovable';
  if (provider === 'anthropic') {
    // Anthropic uses a different body shape; flatten multimodal entries to text + image blocks.
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': runtime.apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: runtime.model, max_tokens: 800, system: systemPrompt,
        messages: history.map((m) => {
          const role = m.role === 'assistant' ? 'assistant' : 'user';
          if (typeof m.content === 'string') return { role, content: m.content };
          const parts = m.content.map((p) => p.type === 'image_url' && p.image_url?.url
            ? { type: 'image', source: { type: 'url', url: p.image_url.url } }
            : { type: 'text', text: p.text || '' });
          return { role, content: parts };
        }),
      }),
    });
    if (!r.ok) throw new Error(`AI ${r.status}: ${await r.text()}`);
    const j = await r.json();
    return { text: j.content?.[0]?.text || '', tool_calls: [] as any[] };
  }
  const headers: Record<string, string> = { Authorization: `Bearer ${runtime.apiKey}`, 'Content-Type': 'application/json' };
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://omnibuildercrm.online';
    headers['X-Title'] = 'Omni Builder CRM';
  }
  const body: any = { model: runtime.model, messages: [{ role: 'system', content: systemPrompt }, ...history] };
  if (tools && tools.length) { body.tools = tools; body.tool_choice = 'auto'; }
  const resp = await fetch(runtime.endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!resp.ok) throw new Error(`AI ${resp.status}: ${await resp.text()}`);
  const json = await resp.json();
  const choice = json.choices?.[0]?.message || {};
  return { text: choice.content || '', tool_calls: choice.tool_calls || [] };
}

// ============= Fase 3: Scheduling tools for AI function calling =============
const SCHEDULING_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'list_available_slots',
      description: 'Lista horários disponíveis em uma agenda em uma data ou intervalo. Use quando o cliente pedir horários, disponibilidade ou quiser marcar.',
      parameters: {
        type: 'object',
        properties: {
          schedule_slug_or_id: { type: 'string', description: 'Slug ou ID da agenda. Se não souber, deixe vazio para usar a primeira agenda ativa.' },
          date: { type: 'string', description: 'Data desejada YYYY-MM-DD. Opcional — se vazio, retorna próximos 7 dias.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_appointment',
      description: 'Confirma e agenda um horário para o cliente. Use APÓS o cliente escolher um slot específico.',
      parameters: {
        type: 'object',
        properties: {
          schedule_slug_or_id: { type: 'string' },
          date: { type: 'string', description: 'YYYY-MM-DD' },
          time: { type: 'string', description: 'HH:MM (24h)' },
          guest_name: { type: 'string' },
          guest_phone: { type: 'string' },
          guest_email: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['date', 'time'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_appointment',
      description: 'Cancela um agendamento existente do cliente atual.',
      parameters: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string' },
          reason: { type: 'string' },
        },
      },
    },
  },
];

async function resolveSchedule(admin: any, userId: string, slugOrId?: string) {
  if (slugOrId) {
    const { data: byId } = await admin.from('schedules').select('*').eq('user_id', userId).eq('id', slugOrId).maybeSingle();
    if (byId) return byId;
    const { data: bySlug } = await admin.from('schedules').select('*').eq('user_id', userId).eq('slug', slugOrId).maybeSingle();
    if (bySlug) return bySlug;
  }
  const { data } = await admin.from('schedules').select('*').eq('user_id', userId).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle();
  return data;
}

function generateDaySlots(schedule: any, dateStr: string, taken: Set<string>): string[] {
  const dow = new Date(dateStr + 'T12:00:00').getDay();
  const dowKeys = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const avail = schedule.availability || schedule.weekly_availability || {};
  const dayCfg = avail[dowKeys[dow]] || avail[String(dow)];
  if (!dayCfg || dayCfg.enabled === false) return [];
  const start = dayCfg.start || dayCfg.from || '09:00';
  const end = dayCfg.end || dayCfg.to || '18:00';
  const dur = Number(schedule.duration_minutes || schedule.slot_duration || 30);
  const slots: string[] = [];
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  while (mins + dur <= endMins) {
    const hh = String(Math.floor(mins / 60)).padStart(2, '0');
    const mm = String(mins % 60).padStart(2, '0');
    const t = `${hh}:${mm}`;
    if (!taken.has(t)) slots.push(t);
    mins += dur;
  }
  return slots;
}

async function execSchedulingTool(admin: any, userId: string, clientId: string, client: any, name: string, args: any): Promise<string> {
  try {
    if (name === 'list_available_slots') {
      const sch = await resolveSchedule(admin, userId, args.schedule_slug_or_id);
      if (!sch) return JSON.stringify({ error: 'Nenhuma agenda configurada' });
      const dates: string[] = [];
      if (args.date) dates.push(args.date);
      else {
        const today = new Date();
        for (let i = 0; i < 7; i++) {
          const d = new Date(today.getTime() + i * 86400000);
          dates.push(d.toISOString().slice(0, 10));
        }
      }
      const out: any[] = [];
      for (const d of dates) {
        const { data: appts } = await admin.from('appointments').select('time, status').eq('schedule_id', sch.id).eq('date', d).neq('status', 'cancelled');
        const taken = new Set<string>((appts || []).map((a: any) => String(a.time).slice(0, 5)));
        const slots = generateDaySlots(sch, d, taken);
        if (slots.length) out.push({ date: d, slots: slots.slice(0, 12) });
      }
      return JSON.stringify({ schedule: sch.title || sch.name, available: out });
    }
    if (name === 'create_appointment') {
      const sch = await resolveSchedule(admin, userId, args.schedule_slug_or_id);
      if (!sch) return JSON.stringify({ error: 'Nenhuma agenda configurada' });
      const { data: existing } = await admin.from('appointments').select('id').eq('schedule_id', sch.id).eq('date', args.date).eq('time', args.time).neq('status', 'cancelled').maybeSingle();
      if (existing) return JSON.stringify({ error: 'Horário já ocupado' });
      const { data: appt, error } = await admin.from('appointments').insert({
        schedule_id: sch.id,
        date: args.date,
        time: args.time,
        guest_name: args.guest_name || client.name || 'Cliente',
        guest_phone: args.guest_phone || client.phone,
        guest_email: args.guest_email || client.email,
        notes: args.notes || null,
        status: 'confirmed',
      }).select().maybeSingle();
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ ok: true, appointment_id: appt?.id, date: args.date, time: args.time, schedule: sch.title || sch.name });
    }
    if (name === 'cancel_appointment') {
      let id = args.appointment_id;
      if (!id) {
        const { data: last } = await admin.from('appointments').select('id, schedule_id, schedules!inner(user_id)').eq('guest_phone', client.phone).neq('status', 'cancelled').order('date', { ascending: false }).limit(1).maybeSingle();
        id = last?.id;
      }
      if (!id) return JSON.stringify({ error: 'Nenhum agendamento encontrado' });
      const { error } = await admin.from('appointments').update({ status: 'cancelled', cancel_reason: args.reason || null }).eq('id', id);
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ ok: true, cancelled: id });
    }
    return JSON.stringify({ error: 'Tool desconhecida' });
  } catch (e) {
    return JSON.stringify({ error: String(e).slice(0, 300) });
  }
}

async function callAiWithTools(
  admin: any, userId: string, clientId: string, client: any, agent: any,
  systemPrompt: string, history: { role: string; content: string }[],
  runtime: { endpoint: string; apiKey: string; model: string; provider?: string }
): Promise<string> {
  const enableTools = !!(agent.enable_scheduling_tools || agent.schedule_can_query || agent.schedule_can_book) && (runtime.provider !== 'anthropic');
  if (!enableTools) {
    const r = await callAi(systemPrompt, history, runtime);
    return r.text;
  }
  const conv: any[] = [{ role: 'system', content: systemPrompt }, ...history];
  for (let iter = 0; iter < 3; iter++) {
    const headers: Record<string, string> = { Authorization: `Bearer ${runtime.apiKey}`, 'Content-Type': 'application/json' };
    if (runtime.provider === 'openrouter') { headers['HTTP-Referer'] = 'https://omnibuildercrm.online'; headers['X-Title'] = 'Omni Builder CRM'; }
    const resp = await fetch(runtime.endpoint, {
      method: 'POST', headers,
      body: JSON.stringify({ model: runtime.model, messages: conv, tools: SCHEDULING_TOOLS, tool_choice: 'auto' }),
    });
    if (!resp.ok) throw new Error(`AI ${resp.status}: ${await resp.text()}`);
    const json = await resp.json();
    const msg = json.choices?.[0]?.message || {};
    const calls = msg.tool_calls || [];
    if (!calls.length) return msg.content || '';
    conv.push({ role: 'assistant', content: msg.content || '', tool_calls: calls });
    for (const tc of calls) {
      let parsedArgs: any = {};
      try { parsedArgs = JSON.parse(tc.function?.arguments || '{}'); } catch {}
      const result = await execSchedulingTool(admin, userId, clientId, client, tc.function?.name || '', parsedArgs);
      conv.push({ role: 'tool', tool_call_id: tc.id, content: result });
    }
  }
  return 'Não consegui completar o agendamento. Pode tentar novamente?';
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
    case 'umclique': {
      const resp = await fetch(`${baseUrl}/public-send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': token, ...extra },
        body: JSON.stringify({ channel_id: instance, to: phone, type: 'text', content }),
      });
      return { ok: resp.ok, status: resp.status, body: (await resp.text()).slice(0, 500) };
    }
    case 'wasender': {
      const resp = await fetch(`${baseUrl}/api/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, Accept: 'application/json', ...extra },
        body: JSON.stringify({ to: phone, text: content }),
      });
      return { ok: resp.ok, status: resp.status, body: (await resp.text()).slice(0, 500) };
    }
    case 'omniconect': {
      const resp = await fetch(`${baseUrl}/send/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token },
        body: JSON.stringify({ number: phone, text: content }),
      });
      const txt = (await resp.text()).slice(0, 800);
      let extId: string | undefined;
      try { const j = JSON.parse(txt); extId = j?.id || j?.messageID || j?.messageId || j?.message?.id || j?.key?.id; } catch {}
      return { ok: resp.ok, status: resp.status, body: txt, external_id: extId };
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
  if (cfg.api_type === 'umclique') {
    const resp = await fetch(`${baseUrl}/public-send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': token, ...extra },
      body: JSON.stringify({ channel_id: instance, to: phone, type: 'audio', url: audioDataUrl }),
    });
    return { ok: resp.ok, status: resp.status, body: (await resp.text()).slice(0, 500) };
  }
  if (cfg.api_type === 'wasender') {
    const resp = await fetch(`${baseUrl}/api/send-audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, Accept: 'application/json', ...extra },
      body: JSON.stringify({ to: phone, audioUrl: audioDataUrl }),
    });
    return { ok: resp.ok, status: resp.status, body: (await resp.text()).slice(0, 500) };
  }
  if (cfg.api_type === 'omniconect') {
    const resp = await fetch(`${baseUrl}/send/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', token },
      body: JSON.stringify({ number: phone, type: 'audio', file: audioDataUrl }),
    });
    return { ok: resp.ok, status: resp.status, body: (await resp.text()).slice(0, 500) };
  }
  return { ok: false, status: 400, body: 'Audio reply only supported on Z-API/umClique/Wasender/OmniConect' };
}

// Send single image via WhatsApp (Z-API supported, others fallback to text link)
async function sendWhatsAppImage(cfg: any, phone: string, imageUrl: string, caption?: string) {
  const baseUrl = sanitizeBaseUrl(cfg.base_url || '');
  const token = cfg.api_token || '';
  const instance = cfg.instance_id || '';
  const extra = cfg.extra_headers || {};
  try {
    if (cfg.api_type === 'z-api') {
      const root = baseUrl.includes('/instances/') ? baseUrl : `${baseUrl}/instances/${instance}/token/${token}`;
      const resp = await fetch(`${root}/send-image`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...extra },
        body: JSON.stringify({ phone, image: imageUrl, caption: caption || '' }),
      });
      return { ok: resp.ok, status: resp.status, body: (await resp.text()).slice(0, 300) };
    }
    if (cfg.api_type === 'umclique') {
      const resp = await fetch(`${baseUrl}/public-send-message`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': token, ...extra },
        body: JSON.stringify({ channel_id: instance, to: phone, type: 'image', url: imageUrl, caption: caption || '' }),
      });
      return { ok: resp.ok, status: resp.status, body: (await resp.text()).slice(0, 300) };
    }
    if (cfg.api_type === 'wasender') {
      const resp = await fetch(`${baseUrl}/api/send-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, Accept: 'application/json', ...extra },
        body: JSON.stringify({ to: phone, imageUrl, text: caption || '' }),
      });
      return { ok: resp.ok, status: resp.status, body: (await resp.text()).slice(0, 300) };
    }
    if (cfg.api_type === 'omniconect') {
      const resp = await fetch(`${baseUrl}/send/media`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', token },
        body: JSON.stringify({ number: phone, type: 'image', file: imageUrl, text: caption || '' }),
      });
      return { ok: resp.ok, status: resp.status, body: (await resp.text()).slice(0, 300) };
    }
  } catch (e) { console.error('image send fail', e); }
  // Fallback: send caption + link as text
  return await sendWhatsApp(cfg, phone, `${caption ? caption + '\n' : ''}${imageUrl}`);
}

// === KB CONTEXTUAL SEARCH (mirror of ai-agent logic) ===
function scoreKb(item: any, ql: string, tokens: string[]): number {
  let s = 0;
  const cat = (item.category || '').toLowerCase();
  if (cat && ql.includes(cat)) s += 10;
  const kws: string[] = Array.isArray(item.keywords) ? item.keywords : [];
  for (const kw of kws) {
    const k = (kw || '').toLowerCase().trim(); if (!k) continue;
    if (ql.includes(k)) s += 6;
    else if (tokens.some(t => k.includes(t) || t.includes(k))) s += 2;
  }
  const title = (item.title || '').toLowerCase();
  for (const t of tokens) if (t.length > 2 && title.includes(t)) s += 3;
  const desc = (item.description || '').toLowerCase();
  for (const t of tokens) if (t.length > 3 && desc.includes(t)) s += 1;
  const content = (item.content || '').toLowerCase();
  for (const t of tokens) if (t.length > 4 && content.includes(t)) s += 0.5;
  return s;
}
function findKb(items: any[], q: string, n = 5): any[] {
  const ql = (q || '').toLowerCase();
  const tokens = ql.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  return items.map(it => ({ it, s: scoreKb(it, ql, tokens) }))
    .filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, n).map(x => x.it);
}
function detectIntent(text: string, agent: any) {
  const t = (text || '').toLowerCase();
  // Default handoff keywords now require EXPLICIT request to talk to a human.
  // Avoids false positives like "pessoa" / "ajuda" that disabled the agent mid-conversation.
  const handoffKws = (agent?.handoff_keywords || 'falar com humano,quero um humano,atendente humano,falar com atendente,falar com pessoa,quero falar com alguém,vendedor humano').split(/[,;\n]/).map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  const handoff = handoffKws.some((k: string) => k && t.includes(k));
  const qualified = ['quero comprar','fechar negócio','quero fechar','enviar contrato','meu cpf é','meu cnpj é','pode mandar o pix','vou pagar agora'].some(k => t.includes(k));
  const wantsMedia = ['imagem','imagens','foto','fotos','catálogo','catalogo','drive','vídeo','video','link','mostra','manda','envia'].some(k => t.includes(k));
  return { handoff, qualified, wantsMedia };
}

// Send Z-API interactive button list. `buttons` is array of label strings (max 3).
async function sendWhatsAppButtons(cfg: any, phone: string, content: string, buttons: string[]) {
  const baseUrl = sanitizeBaseUrl(cfg.base_url || '');
  const token = cfg.api_token || '';
  const instance = cfg.instance_id || '';
  const extra = cfg.extra_headers || {};
  if (cfg.api_type === 'z-api') {
    const root = baseUrl.includes('/instances/') ? baseUrl : `${baseUrl}/instances/${instance}/token/${token}`;
    const buttonList = {
      buttons: buttons.slice(0, 3).map((label, i) => ({ id: String(i + 1), label })),
    };
    const resp = await fetch(`${root}/send-button-list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...extra },
      body: JSON.stringify({ phone, message: content, buttonList }),
    });
    if (resp.ok) return { ok: true, status: resp.status, body: (await resp.text()).slice(0, 500) };
    // Fallback to text + numbered list when buttons unsupported on instance
  }
  const numbered = `${content}\n\n${buttons.slice(0, 3).map((b, i) => `${i + 1}. ${b}`).join('\n')}\n\n_Responda com o número da opção._`;
  return await sendWhatsApp(cfg, phone, numbered);
}
async function sendPresence(cfg: any, phone: string, kind: 'composing' | 'recording') {
  try {
    const baseUrl = sanitizeBaseUrl(cfg.base_url || '');
    const token = cfg.api_token || '';
    const instance = cfg.instance_id || '';
    const extra = cfg.extra_headers || {};
    if (cfg.api_type === 'z-api') {
      const root = baseUrl.includes('/instances/') ? baseUrl : `${baseUrl}/instances/${instance}/token/${token}`;
      await fetch(`${root}/send-chat-state`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...extra }, body: JSON.stringify({ phone, state: kind }) }).catch(() => {});
    } else if (cfg.api_type === 'evolution') {
      await fetch(`${baseUrl}/chat/sendPresence/${instance}`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: token }, body: JSON.stringify({ number: phone, presence: kind, delay: 1500 }) }).catch(() => {});
    } else if (cfg.api_type === 'umclique' || cfg.api_type === 'um-clique') {
      // Um Clique: presence endpoint (composing | recording)
      const url = `${baseUrl}/v1/messages/presence`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...extra },
        body: JSON.stringify({ channel_id: instance, to: phone, presence: kind === 'composing' ? 'typing' : 'recording', duration_ms: 2500 }),
      }).catch(() => {});
    } else if (cfg.api_type === 'ultramsg') {
      // UltraMsg: chat/presence
      const url = `${baseUrl}/${instance}/chat/presence?token=${encodeURIComponent(token)}`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...extra },
        body: JSON.stringify({ chatId: phone, presence: kind === 'composing' ? 'typing' : 'recording' }),
      }).catch(() => {});
    }
  } catch (_) { /* ignore */ }
}

async function resolveAgent(admin: any, userId: string, client: any, lead: any, waCfg: any, convState: any, inboundText: string) {
  // 1) Agent already assigned in this conversation — keep it
  if (convState?.assigned_agent_id) return convState.assigned_agent_id;

  // 2) Active flow session takes precedence (its agent is implicit per node)
  try {
    const { data: flowSession } = await admin.from('conversation_flow_sessions')
      .select('id, variables').eq('client_id', client.id).eq('status', 'active').maybeSingle();
    const flowAgent = flowSession?.variables?.agent_id;
    if (flowAgent) return flowAgent;
  } catch (_e) { /* ignore */ }

  const { data: agents } = await admin.from('ai_agents').select('*').eq('user_id', userId).eq('is_active', true).order('created_at', { ascending: true });
  const active = agents || [];
  const text = (inboundText || '').toLowerCase();
  const tags = Array.isArray(lead?.tags) ? lead.tags.map((t: string) => String(t).toLowerCase()) : [];

  // 3) Orchestrator routing rules (new table, ordered by priority)
  try {
    const { data: rules } = await admin.from('agent_routing_rules')
      .select('*').eq('user_id', userId).eq('enabled', true).order('priority', { ascending: true });
    for (const r of (rules || [])) {
      const checks: boolean[] = [];
      // UTM filters
      const utm = r.utm_filters || {};
      const utmKeys = Object.keys(utm);
      if (utmKeys.length) {
        const utmOk = utmKeys.every((k) => String(lead?.[k] || '').toLowerCase() === String(utm[k] || '').toLowerCase());
        checks.push(utmOk);
      }
      // Keywords
      if (Array.isArray(r.keywords) && r.keywords.length) {
        checks.push(r.keywords.some((kw: string) => kw && text.includes(String(kw).toLowerCase())));
      }
      // Tags
      if (Array.isArray(r.tag_names) && r.tag_names.length) {
        checks.push(r.tag_names.some((t: string) => tags.includes(String(t).toLowerCase())));
      }
      // Pipeline / Stage
      if (r.pipeline_id) checks.push(r.pipeline_id === lead?.pipeline_id);
      if (r.stage_id) checks.push(r.stage_id === lead?.stage_id);
      // Meta Ads
      if (r.meta_campaign) checks.push(String(lead?.meta_campaign || '').toLowerCase() === String(r.meta_campaign).toLowerCase());
      if (r.meta_adset) checks.push(String(lead?.meta_adset || '').toLowerCase() === String(r.meta_adset).toLowerCase());
      if (r.meta_creative) checks.push(String(lead?.meta_creative || '').toLowerCase() === String(r.meta_creative).toLowerCase());

      if (!checks.length) continue;
      const matched = (r.match_type === 'all') ? checks.every(Boolean) : checks.some(Boolean);
      if (matched && r.agent_id) {
        return r.agent_id;
      }
    }
  } catch (e) { console.warn('[orchestrator] routing rules failed', e); }

  // 4) Legacy per-agent routing_rules (back-compat)
  for (const ag of active) {
    const rules = Array.isArray(ag.routing_rules) ? ag.routing_rules : [];
    const matched = rules.some((r: any) => {
      const kw = String(r.keyword || '').toLowerCase().trim();
      const kwOk = kw && text.includes(kw);
      const pipelineOk = !r.pipeline_id || r.pipeline_id === lead?.pipeline_id;
      const stageOk = !r.stage_id || r.stage_id === lead?.stage_id;
      return kwOk && pipelineOk && stageOk;
    });
    if (matched) return ag.id;
  }

  // 5) Pipeline / Stage on agent record
  const byStage = active.find((ag: any) =>
    (!!ag.stage_id && ag.stage_id === lead?.stage_id) ||
    (!!ag.pipeline_id && ag.pipeline_id === lead?.pipeline_id)
  );
  if (byStage) return byStage.id;

  // 6) Default agent flag
  const defaultAgent = active.find((ag: any) => ag.is_default === true);
  if (defaultAgent) return defaultAgent.id;

  // 7) WhatsApp config default → first active
  return waCfg?.default_agent_id || active[0]?.id || null;
}

async function resolveWhatsAppConfigForClient(admin: any, userId: string, client: any) {
  const entry = String(client?.metadata?.entry_instance || client?.metadata?.instance_id || '').trim();
  const { data: cfgs } = await admin.from('whatsapp_configs').select('*').eq('user_id', userId).eq('is_active', true).order('updated_at', { ascending: false });
  const list = cfgs || [];
  if (entry) {
    const exact = list.find((cfg: any) => cfg.instance_id === entry || (Array.isArray(cfg.webhook_instance_ids) && cfg.webhook_instance_ids.includes(entry)));
    if (exact) return exact;
  }
  return list[0] || null;
}

// Split a long reply into 1-3 natural chunks.
function splitMessage(text: string, max = 320): string[] {
  if (!text) return [];
  if (text.length <= max) return [text];
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + ' ' + s).trim().length > max && cur) { chunks.push(cur.trim()); cur = s; }
    else { cur = (cur ? cur + ' ' : '') + s; }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.slice(0, 4);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  let raw: any;
  try { raw = await req.json(); } catch { raw = {}; }

  const apiKey = req.headers.get('x-api-key') || url.searchParams.get('api_key') || raw.api_key;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);

  // === ONDA 1: Idempotência + persistência bruta (best-effort) ===
  if (!raw.__debounced__ && !raw.__test__) {
    try {
      const provider = String(raw.provider || raw.event || 'whatsapp').slice(0, 50);
      const candidateMessageId = String(
        raw?.message?.id || raw?.messageId || raw?.key?.id || raw?.data?.key?.id ||
        raw?.message_id || raw?.id || ''
      ).slice(0, 200);

      if (candidateMessageId) {
        const { data: already } = await admin
          .from('processed_messages')
          .select('provider').eq('provider', provider).eq('message_id', candidateMessageId).maybeSingle();
        if (already) {
          return new Response(JSON.stringify({ ok: true, duplicate: true, idempotent: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        await admin.from('processed_messages').insert({ provider, message_id: candidateMessageId }).then(() => null, () => null);
      }

      const eventHash = candidateMessageId || (await sha256(JSON.stringify(raw))).slice(0, 60);
      await admin.from('webhook_events').insert({
        provider, event_id: eventHash, payload: raw, status: 'received',
      }).then(() => null, () => null);
    } catch (_e) { /* never fail webhook on persistence */ }
  }

  let userId = '';
  let matchedConfig: any = null;

  // === DEBOUNCE FLUSH (called by cron-worker after grouping window) ===
  if (raw.__debounced__ === true && raw.user_id && raw.client_id) {
    // Require shared secret from internal caller when configured
    const CRON_SECRET = Deno.env.get('CRON_SECRET');
    if (CRON_SECRET) {
      const auth = req.headers.get('authorization') || '';
      const hdr = req.headers.get('x-cron-secret') || '';
      const ok = auth === `Bearer ${CRON_SECRET}` || hdr === CRON_SECRET || auth === `Bearer ${SUPABASE_SERVICE}`;
      if (!ok) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    try {
      const dUserId = String(raw.user_id);
      const dClientId = String(raw.client_id);
      const dAgentId = raw.agent_id ? String(raw.agent_id) : null;
      const buffered: any[] = Array.isArray(raw.messages) ? raw.messages : [];
      const merged = buffered.map((m) => m?.content || '').filter(Boolean).join('\n');
      if (!merged) return new Response(JSON.stringify({ ok: true, debounced: true, empty: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const { data: client } = await admin.from('chat_clients').select('*').eq('id', dClientId).maybeSingle();
      if (!client) return new Response(JSON.stringify({ ok: false, error: 'client_not_found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { data: cs } = await admin.from('conversation_state').select('*').eq('client_id', dClientId).maybeSingle();
      if (!cs?.ai_active || cs?.mode !== 'ai') return new Response(JSON.stringify({ ok: true, debounced: true, paused: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const agentIdToUse = dAgentId || cs.assigned_agent_id;
      if (!agentIdToUse) return new Response(JSON.stringify({ ok: true, debounced: true, no_agent: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { data: agent } = await admin.from('ai_agents').select('*').eq('id', agentIdToUse).maybeSingle();
      if (!agent) return new Response(JSON.stringify({ ok: true, debounced: true, no_agent: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { data: providerCfg } = agent.ai_provider_config_id
        ? await admin.from('ai_provider_configs').select('*').eq('id', agent.ai_provider_config_id).maybeSingle()
        : { data: null };
      const waCfg = await resolveWhatsAppConfigForClient(admin, dUserId, client);

      const { data: history } = await admin.from('messages').select('direction, content')
        .eq('client_id', dClientId).order('created_at', { ascending: false }).limit(20);
      const ordered = (history || []).reverse().filter((m: any) => m.content);
      const aiHistory = ordered.map((m: any) => ({ role: m.direction === 'inbound' ? 'user' : 'assistant', content: m.content }));
      // Append the merged debounced batch as the latest user turn
      aiHistory.push({ role: 'user', content: merged });

      const { data: knowledge } = await admin.from('agent_knowledge')
        .select('id, title, category, description, keywords, content, media_urls, external_links').eq('agent_id', agent.id);
      const selected = knowledge?.length ? findKb(knowledge, merged, 5) : [];
      const baseItems = selected.length ? selected : (knowledge || []).slice(0, 3);
      const ctx = baseItems.map((k: any) => [
        `# ${k.title}${k.category ? ` [${k.category}]` : ''}`,
        k.description ? `Descrição: ${k.description}` : '',
        Array.isArray(k.keywords) && k.keywords.length ? `Palavras-chave: ${k.keywords.join(', ')}` : '',
        k.content ? String(k.content).slice(0, 1500) : '',
      ].filter(Boolean).join('\n')).join('\n\n---\n\n').slice(0, 8000);

      const attribution = (client as any)?.metadata?.attribution || null;
      const products = await findMatchingProducts(admin, dUserId, agent.id, merged, attribution);
      const faqs = await findMatchingFaqs(admin, dUserId, agent.id, merged);
      const adContext = formatAdContext(attribution, products[0]);
      const productsBlock = formatProductsForPrompt(products);
      const faqBlock = formatFaqsForPrompt(faqs);
      const clientInfo = client?.name ? `Nome do contato: ${client.name}` : '';
      const sys = buildSystemPrompt(agent, ctx, { adContext, products: productsBlock, faq: faqBlock, clientInfo });
      await logConsultation(admin, dUserId, agent.id, dClientId, merged, {
        products: products.map((p: any) => ({ id: p.id, name: p.name })),
        faqs: faqs.map((f: any) => ({ id: f.id, question: f.question })),
        knowledge: baseItems.map((k: any) => ({ id: k.id, title: k.title })),
        priority: agent.knowledge_priority || 'default',
        path: 'debounced',
      });
      const runtime = resolveAiRuntime(agent, providerCfg);
      const reply = await callAiWithTools(admin, dUserId, dClientId, client, agent, sys, aiHistory, runtime);
      let delivery = { ok: false, status: 0, body: 'WhatsApp inativo' };
      if (reply && waCfg?.is_active && client.phone) {
        try { delivery = await sendWhatsApp(waCfg, client.phone, reply); } catch (e) { delivery = { ok: false, status: 500, body: String(e).slice(0, 300) }; }
      }
      await admin.from('messages').insert({
        user_id: dUserId, client_id: dClientId, lead_id: client.lead_id,
        direction: 'outbound', channel: 'whatsapp', content: reply || '',
        status: delivery.ok ? 'sent' : 'failed', agent_id: agent.id, sender_phone: client.phone,
        metadata: { debounced: true, batch_size: buffered.length, external_status: delivery.status, external_body: delivery.body },
      });
      await admin.rpc('deduct_credits', { _user_id: dUserId, _amount: 1, _kind: 'ai_response', _metadata: { agent_id: agent.id, debounced: true } });
      return new Response(JSON.stringify({ ok: true, debounced: true, sent: delivery.ok }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (e) {
      console.error('debounced flush error', e);
      return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  if (raw.__test__ === true) {
    const testUserId = String(raw.user_id || '').trim();
    if (testUserId) {
      await admin.from('webhook_logs').insert({ user_id: testUserId, direction: 'inbound', event: 'dashboard_webhook_test', source: 'whatsapp', payload: raw });
      return new Response(JSON.stringify({ ok: true, test: true, provider: raw.provider || 'whatsapp' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  if (apiKey) {
    const keyHash = await sha256(apiKey);
    const { data: keyRow } = await admin.from('api_keys').select('*').eq('key_hash', keyHash).eq('is_active', true).maybeSingle();
    if (!keyRow) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    await admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyRow.id);
    userId = keyRow.user_id;
  } else {
    const configId = url.searchParams.get('config_id') || raw.config_id;
    if (configId) {
      const { data: cfgById } = await admin.from('whatsapp_configs').select('*').eq('id', String(configId)).eq('is_active', true).maybeSingle();
      if (cfgById) { userId = cfgById.user_id; matchedConfig = cfgById; }
    }
    // Collect every possible identifier the provider may send in webhooks
    const candidateIds = Array.from(new Set([
      raw.instanceId, raw.instance_id, raw.instance, raw.instanceName,
      raw.channel_id, raw.channelId, raw.phone_number_id,
      raw.owner, raw.chat?.owner, raw.message?.owner,
      raw.data?.channel_id, raw.data?.instanceId, raw.data?.instance_id,
      raw.payload?.channel_id, raw.payload?.instance_id,
    ].map((v) => (v == null ? '' : String(v).trim())).filter(Boolean)));
    const instanceFromPayload = candidateIds[0] || '';

    if (!userId && candidateIds.length) {
      // Match against either instance_id OR webhook_instance_ids array (umClique sends a separate channel_id)
      const { data: cfgRows } = await admin.from('whatsapp_configs')
        .select('*')
        .or(`instance_id.in.(${candidateIds.map((v) => `"${v.replace(/"/g, '')}"`).join(',')}),webhook_instance_ids.ov.{${candidateIds.map((v) => `"${v.replace(/"/g, '')}"`).join(',')}}`)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1);
      const cfgByInstance = cfgRows?.[0];
      if (cfgByInstance) { userId = cfgByInstance.user_id; matchedConfig = cfgByInstance; }
      // Fallback: include inactive configs to still attribute the webhook
      if (!userId) {
        const { data: anyRows } = await admin.from('whatsapp_configs')
          .select('*')
          .or(`instance_id.in.(${candidateIds.map((v) => `"${v.replace(/"/g, '')}"`).join(',')}),webhook_instance_ids.ov.{${candidateIds.map((v) => `"${v.replace(/"/g, '')}"`).join(',')}}`)
          .order('updated_at', { ascending: false }).limit(1);
        const any = anyRows?.[0];
        if (any) { userId = any.user_id; matchedConfig = any; }
      }
      // AUTO-LEARN: if matched by instance_id but raw payload had a different channel_id,
      // store it in webhook_instance_ids so future calls match instantly.
      if (userId && matchedConfig) {
        const learned = candidateIds.filter((id) =>
          id !== matchedConfig.instance_id &&
          !(matchedConfig.webhook_instance_ids || []).includes(id)
        );
        if (learned.length) {
          try {
            await admin.from('whatsapp_configs')
              .update({ webhook_instance_ids: [...(matchedConfig.webhook_instance_ids || []), ...learned] })
              .eq('id', matchedConfig.id);
          } catch (e) { console.error('auto-learn webhook id failed', e); }
        }
      }
    }
    if (!userId) {
      // Log the orphan webhook so admins can debug
      try { await admin.from('webhook_logs').insert({ direction: 'inbound', source: 'whatsapp', payload: raw, error: `No matching instance: ${instanceFromPayload || '(empty)'}`, status_code: 401 }); } catch {}
      return new Response(JSON.stringify({ error: 'Missing API key or known WhatsApp instance', instance: instanceFromPayload }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  await admin.from('webhook_logs').insert({ user_id: userId, direction: 'inbound', source: 'whatsapp', payload: raw });

  // Status callback (delivered / read) — update existing message status (✓✓ ticks)
  const statusCb = detectStatusCallback(raw);
  if (statusCb?.external_message_id) {
    await admin.from('messages')
      .update({ status: statusCb.status })
      .eq('user_id', userId)
      .eq('external_message_id', statusCb.external_message_id);
    return new Response(JSON.stringify({ ok: true, status_update: statusCb.status }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const msg = detectAndNormalize(raw);
  if (!msg || !msg.phone) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  // Honra hide_group_messages: descarta totalmente mensagens vindas de grupos
  if ((msg as any).is_group === true && matchedConfig?.hide_group_messages === true) {
    return new Response(JSON.stringify({ ok: true, group_hidden: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const referral = extractReferral(raw);

  if (msg.external_message_id) {
    const { data: dup } = await admin.from('messages').select('id').eq('user_id', userId).eq('external_message_id', msg.external_message_id).maybeSingle();
    if (dup) {
      const patch: any = {};
      if (msg.media_url) patch.media_url = msg.media_url;
      if (msg.media_type) patch.media_type = msg.media_type;
      if (Object.keys(patch).length) await admin.from('messages').update(patch).eq('id', dup.id);
      return new Response(JSON.stringify({ ok: true, duplicate: true, enriched: Object.keys(patch).length > 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  let avatarUrl: string | undefined = (msg as any).avatar_url || extractAvatarUrl(raw) || undefined;

  // Try fetching profile picture from Z-API if we don't have one in the payload
  const fetchZapiProfilePic = async (): Promise<string | undefined> => {
    try {
      // 1) Try matched provider first (Z-API or OmniConect/UAZAPI)
      const providers: any[] = [];
      if (matchedConfig) providers.push(matchedConfig);
      const { data: extra } = await admin.from('whatsapp_configs')
        .select('api_type, base_url, api_token, instance_id, extra_headers, is_active, updated_at')
        .eq('user_id', userId)
        .in('api_type', ['z-api', 'omniconect'])
        .order('is_active', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(3);
      for (const p of extra || []) {
        if (!providers.find((x) => x.api_token === p.api_token && x.instance_id === p.instance_id)) providers.push(p);
      }

      for (const prov of providers) {
        const apiType = (prov.api_type || '').toLowerCase();
        const baseUrl = (prov.base_url || '').replace(/\/$/, '').replace(/\/(send-text|send-image|send-document|status|profile-picture|chat).*$/, '');
        if (apiType === 'z-api') {
          const root = baseUrl.includes('/instances/') ? baseUrl : `${baseUrl}/instances/${prov.instance_id}/token/${prov.api_token}`;
          const headers: Record<string,string> = { 'Content-Type': 'application/json', ...((prov as any).extra_headers || {}) };
          const attempts = [
            () => fetch(`${root}/profile-picture?phone=${msg.phone}`, { headers }),
            () => fetch(`${root}/profile-picture/${msg.phone}`, { headers }),
            () => fetch(`${root}/profile-picture`, { method: 'POST', headers, body: JSON.stringify({ phone: msg.phone }) }),
          ];
          for (const attempt of attempts) {
            const r = await attempt().catch(() => null);
            if (!r?.ok) continue;
            const text = await r.text();
            const j = (() => { try { return JSON.parse(text); } catch { return text; } })();
            const found = extractAvatarUrl(j);
            if (found) return found;
          }
        } else if (apiType === 'omniconect') {
          const root = baseUrl || 'https://free.uazapi.com';
          const headers: Record<string,string> = { 'Content-Type': 'application/json', token: prov.api_token || '' };
          const attempts = [
            () => fetch(`${root}/chat/GetNameAndImageURL`, { method: 'POST', headers, body: JSON.stringify({ number: msg.phone }) }),
            () => fetch(`${root}/chat/details`, { method: 'POST', headers, body: JSON.stringify({ number: msg.phone }) }),
          ];
          for (const attempt of attempts) {
            const r = await attempt().catch(() => null);
            if (!r?.ok) continue;
            const text = await r.text();
            const j = (() => { try { return JSON.parse(text); } catch { return text; } })();
            const found = extractAvatarUrl(j);
            if (found) return found;
          }
        }
      }
    } catch (_) { /* noop */ }
    return undefined;
  };

  // Check if client already exists & has avatar — avoid overwriting with null
  const { data: existingPre } = await admin.from('chat_clients').select('id, avatar_url, metadata')
    .eq('user_id', userId).eq('phone', msg.phone).maybeSingle();

  // Proactive sync: fetch avatar on every inbound if we don't have one yet (covers new contacts immediately)
  if (!avatarUrl && !existingPre?.avatar_url) {
    avatarUrl = await fetchZapiProfilePic();
  }

  const upsertPayload: any = {
    user_id: userId,
    phone: msg.phone,
    name: msg.name || existingPre?.['name' as any] || msg.phone,
    source: 'whatsapp',
    metadata: { ...(existingPre?.metadata || {}), is_group: (msg as any).is_group === true, provider: matchedConfig?.api_type || raw.provider || 'whatsapp', entry_instance: matchedConfig?.instance_id || raw.instanceName || raw.owner || null, first_context: (existingPre?.metadata || {})?.first_context || msg.content || null, ...(avatarUrl ? { profile_pic_url: avatarUrl } : {}), ...(referral ? { attribution: { ...(existingPre?.metadata?.attribution || {}), source: referral.source, medium: referral.medium, campaign: referral.campaign, content: referral.content, term: referral.term, ctwa_clid: referral.ctwa_clid, source_url: referral.source_url, headline: referral.headline, captured_at: new Date().toISOString() } } : {}) },
    updated_at: new Date().toISOString(),
  };
  // Only set avatar if we have a fresh one — never wipe existing
  if (avatarUrl) upsertPayload.avatar_url = avatarUrl;
  else if (existingPre?.avatar_url) upsertPayload.avatar_url = existingPre.avatar_url;

  const { data: upserted } = await admin.from('chat_clients').upsert(
    upsertPayload,
    { onConflict: 'user_id,phone' }
  ).select().single();
  let client: any = upserted;
  if (!client) {
    const { data: existing } = await admin.from('chat_clients').select('*')
      .eq('user_id', userId).eq('phone', msg.phone).maybeSingle();
    client = existing;
  }

  if (!client) {
    return new Response(JSON.stringify({ error: 'Could not resolve chat client' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Attribution: register a touchpoint for new WhatsApp leads or click-to-WA ads
  try {
    const isNewClient = !existingPre;
    const hasReferral = !!referral;
    if (isNewClient || hasReferral) {
      // Avoid duplicate touchpoint for same ctwa_clid
      let alreadyTracked = false;
      if (referral?.ctwa_clid) {
        const { data: existsTouch } = await admin.from('attribution_touchpoints')
          .select('id').eq('user_id', userId).eq('ctwa_clid', referral.ctwa_clid).limit(1).maybeSingle();
        if (existsTouch) alreadyTracked = true;
      }
      if (!alreadyTracked) {
        await admin.from('attribution_touchpoints').insert({
          user_id: userId,
          client_id: client.id,
          lead_id: client.lead_id || null,
          channel: 'whatsapp',
          source: referral?.source || null,
          medium: referral?.medium || null,
          campaign: referral?.campaign || null,
          content: referral?.content || null,
          term: referral?.term || null,
          ctwa_clid: referral?.ctwa_clid || null,
          landing_url: referral?.source_url || null,
          meta: {
            phone: msg.phone,
            first_message: (msg.content || '').slice(0, 240),
            referral_headline: referral?.headline || null,
            referral_source_id: (referral as any)?.source_id || null,
            instance: matchedConfig?.instance_id || null,
          },
        });
      }
    }
  } catch (_) { /* silent */ }


  // If message was sent FROM the user's own phone, decide whether to:
  //  (a) ignore it (because WE sent it via API — UAZAPI echoes outbound back as fromMe), or
  //  (b) mirror as outbound + take over (real manual reply from the user's WhatsApp app).
  if (msg.from_me) {
    // 1) Dedup against external id we already stored (sends save UAZAPI id)
    let isOurOwnSend = false;
    if (msg.external_message_id) {
      const { data: own } = await admin.from('messages').select('id')
        .eq('user_id', userId).eq('external_message_id', msg.external_message_id)
        .eq('direction', 'outbound').maybeSingle();
      if (own) isOurOwnSend = true;
    }
    // 2) Fallback: same content sent within last 90s for this client
    if (!isOurOwnSend) {
      const since = new Date(Date.now() - 90_000).toISOString();
      const { data: recent } = await admin.from('messages').select('id, content')
        .eq('user_id', userId).eq('client_id', client.id).eq('direction', 'outbound')
        .gte('created_at', since).order('created_at', { ascending: false }).limit(5);
      if ((recent || []).some((r: any) => (r.content || '').trim() === (msg.content || '').trim() && (msg.content || '').trim().length > 0)) {
        isOurOwnSend = true;
      }
    }
    if (isOurOwnSend) {
      return new Response(JSON.stringify({ ok: true, echo_skipped: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Real human reply from the phone — mirror as outbound
    await admin.from('messages').insert({
      user_id: userId,
      client_id: client.id,
      lead_id: client.lead_id,
      direction: 'outbound',
      channel: 'whatsapp',
      content: msg.content || (msg.media_type ? `[${msg.media_type}]` : ''),
      media_url: msg.media_url,
      media_type: msg.media_type,
      status: 'sent',
      external_message_id: msg.external_message_id,
      sender_phone: msg.phone,
      created_at: msg.timestamp || new Date().toISOString(),
      metadata: { sent_from_phone: true, mirror: true, raw_type: raw.type || raw.event || null },
    });

    // Only flip AI off if the assigned agent (or any active agent for this user) opts in
    let shouldDisableAi = true;
    try {
      const { data: csNow } = await admin.from('conversation_state').select('assigned_agent_id').eq('client_id', client.id).maybeSingle();
      const aid = csNow?.assigned_agent_id;
      if (aid) {
        const { data: ag } = await admin.from('ai_agents').select('disable_on_human_takeover').eq('id', aid).maybeSingle();
        if (ag && ag.disable_on_human_takeover === false) shouldDisableAi = false;
      }
    } catch {}
    if (shouldDisableAi) {
      const { data: csExisting } = await admin.from('conversation_state').select('*').eq('client_id', client.id).maybeSingle();
      if (csExisting) {
        await admin.from('conversation_state').update({
          ai_active: false, mode: 'manual', last_human_reply_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }).eq('id', csExisting.id);
      } else {
        await admin.from('conversation_state').insert({
          user_id: userId, client_id: client.id, ai_active: false, mode: 'manual', last_human_reply_at: new Date().toISOString(),
        });
      }
      try { await admin.rpc('schedule_handoff_resume', { _client_id: client.id }); } catch (_) {}
    }
    await admin.from('chat_clients').update({ updated_at: new Date().toISOString() }).eq('id', client.id);
    return new Response(JSON.stringify({ ok: true, mirrored: true, ai_disabled: shouldDisableAi }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }


  // Use matched config (multi-instance) if available; otherwise fallback to first active for the user
  const { data: waCfg } = matchedConfig
    ? { data: matchedConfig }
    : { data: await resolveWhatsAppConfigForClient(admin, userId, client) };

  // Auto-create lead, but NEVER for group messages and NEVER duplicate (dedupe by phone)
  const isGroupMsg = (msg as any).is_group === true;
  if (client && !client.lead_id && waCfg?.auto_create_lead && !isGroupMsg && msg.phone) {
    // Dedupe: any existing lead for this user+phone (regardless of pipeline)
    const { data: existingLead } = await admin.from('leads')
      .select('id, pipeline_id, stage_id')
      .eq('user_id', userId).eq('phone', msg.phone)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    let leadId = existingLead?.id || null;
    if (!leadId) {
      let stageId = waCfg.default_stage_id;
      if (!stageId) {
        const { data: firstStage } = await admin.from('pipeline_stages').select('id').eq('user_id', userId).order('position').limit(1).maybeSingle();
        stageId = firstStage?.id;
      }
      if (stageId) {
        const { data: lead } = await admin.from('leads').insert({
          user_id: userId, name: client.name || msg.phone, phone: msg.phone,
          stage_id: stageId, pipeline_id: waCfg.default_pipeline_id, source: 'whatsapp', status: 'new',
          notes: `Primeira interação WhatsApp: ${(msg.content || '').slice(0, 240)}`,
        }).select('id').single();
        leadId = lead?.id || null;
      }
    }
    if (leadId) {
      await admin.from('chat_clients').update({ lead_id: leadId }).eq('id', client.id);
      client.lead_id = leadId;
      // Backfill lead_id on the most recent attribution touchpoint for this client
      try {
        await admin.from('attribution_touchpoints')
          .update({ lead_id: leadId })
          .eq('user_id', userId).eq('client_id', client.id).is('lead_id', null);
      } catch {}
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

  let leadForRouting: any = null;
  if (client?.lead_id) {
    const { data: leadRow } = await admin.from('leads').select('id,pipeline_id,stage_id,status').eq('id', client.lead_id).maybeSingle();
    leadForRouting = leadRow;
  }
  agentId = await resolveAgent(admin, userId, client, leadForRouting, waCfg, convStateInit, msg.content || '');
  if (agentId && convStateInit?.assigned_agent_id !== agentId) {
    await admin.from('conversation_state').update({ assigned_agent_id: agentId, updated_at: new Date().toISOString() }).eq('client_id', client.id);
    convStateInit = { ...convStateInit, assigned_agent_id: agentId };
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
  // Force transcription when audio arrives. If "reply_to_audio_with_audio" is OFF,
  // the agent must still understand the audio (transcribe → respond as text).
  const mustTranscribe = msg.media_type === 'audio' && msg.media_url && (
    agent?.transcribe_audio !== false ||
    (agent?.voice_enabled && agent?.reply_to_audio_with_audio === false) ||
    !agent?.voice_enabled
  );
  if (mustTranscribe) {
    transcript = await transcribeAudio(msg.media_url, providerCfg, openaiKey, elevenKey, '', waCfg, msg.external_message_id || '');
    if (transcript) {
      inboundContent = `[ÁUDIO TRANSCRITO] ${transcript}`;
      await admin.rpc('deduct_credits', { _user_id: userId, _amount: 1, _kind: 'audio_transcription', _metadata: { provider: providerCfg?.provider || 'cascade' } });
    } else {
      console.warn('Audio transcription returned empty for', msg.media_url);
      inboundContent = '[áudio recebido — transcrição indisponível]';
    }
  }
  if (msg.media_type === 'image' && msg.media_url && (agent?.understand_images !== false)) {
    imageDescription = await describeImage(msg.media_url, providerCfg, openaiKey);
    if (imageDescription) {
      inboundContent = `[IMAGEM RECEBIDA]${msg.content ? ` Legenda: ${msg.content}` : ''}\n[Descrição automática]: ${imageDescription}`;
      await admin.rpc('deduct_credits', { _user_id: userId, _amount: 1, _kind: 'image_vision', _metadata: { provider: providerCfg?.provider || 'openai' } });
    } else {
      inboundContent = `[IMAGEM RECEBIDA]${msg.content ? ` Legenda: ${msg.content}` : ''}`;
    }
  }
  if (msg.media_type === 'video' && msg.media_url) {
    inboundContent = `[VÍDEO RECEBIDO]${msg.content ? ` Legenda: ${msg.content}` : ''}`;
  }
  if (msg.media_type === 'document' && msg.media_url) {
    const fn = (msg as any).document_filename || 'arquivo';
    inboundContent = `[DOCUMENTO RECEBIDO: ${fn}]${msg.content ? ` Legenda: ${msg.content}` : ''}`;
  }
  if (msg.media_type === 'sticker' && msg.media_url) {
    inboundContent = `[STICKER RECEBIDO]`;
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
      provider: waCfg?.api_type || matchedConfig?.api_type || 'whatsapp',
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
  await admin.from('chat_clients').update({ last_inbound_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', client.id);

  // === LEAD SCORING (behavior-based) ===
  try {
    let scoreDelta = 5; // baseline: respondeu
    const txt = (inboundContent || '').toLowerCase();
    if (msg.media_type === 'audio') scoreDelta += 5;
    if (msg.media_type === 'image') scoreDelta += 3;
    if ((inboundContent || '').length > 80) scoreDelta += 2;
    // Qualifying keywords (high intent)
    const hotKws = ['quero comprar','fechar','contrato','pix','cartão','quanto custa','agendar','marcar','proposta','cnpj','pagar','assinar','adquirir'];
    if (hotKws.some(k => txt.includes(k))) scoreDelta += 20;
    // Negative signals
    const coldKws = ['não tenho interesse','não quero','para de mandar','sair da lista','remover'];
    if (coldKws.some(k => txt.includes(k))) scoreDelta = -15;
    await admin.rpc('apply_lead_score', { _client_id: client.id, _delta: scoreDelta, _reason: 'inbound_message' });
  } catch (e) { console.warn('lead score apply failed', e); }

  await admin.from('notifications').insert({
    user_id: userId,
    type: 'message',
    title: `Nova mensagem de ${msg.name || msg.phone}`,
    message: inboundContent?.slice(0, 100),
    related_id: client?.id,
  });

  // ===== Conversation Flow runner (interactive buttons / collect / message) =====
  // Has higher priority than AI auto-reply when an active session exists OR a flow keyword matches.
  let flowHandled = false;
  try {
    const { data: existingSession } = await admin.from('conversation_flow_sessions')
      .select('*').eq('client_id', client.id).eq('status', 'active').maybeSingle();

    let session = existingSession;
    let flowDef: any = null;

    if (session) {
      const { data: f } = await admin.from('conversation_flows').select('*').eq('id', session.flow_id).maybeSingle();
      flowDef = f;
    } else {
      // Try to match a flow by trigger keyword (case-insensitive substring)
      // Only flows with trigger_mode = 'keyword' (or null/legacy) participate in auto keyword matching.
      const text = (inboundContent || '').toLowerCase().trim();
      const { data: flows } = await admin.from('conversation_flows').select('*')
        .eq('user_id', userId).eq('is_active', true);
      for (const f of flows || []) {
        const mode = (f.trigger_mode || 'keyword');
        if (mode !== 'keyword') continue; // campaign_only / manual flows never auto-trigger
        const kw = (f.trigger_keywords || '').toLowerCase().split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean);
        if (kw.length && kw.some((k: string) => text.includes(k))) { flowDef = f; break; }
      }
      if (flowDef) {
        const startNode = (flowDef.nodes || []).find((n: any) => n.id === 'start') || (flowDef.nodes || [])[0];
        if (startNode) {
          const { data: created } = await admin.from('conversation_flow_sessions').insert({
            user_id: userId, client_id: client.id, flow_id: flowDef.id,
            current_node_id: startNode.id, variables: {}, status: 'active',
          }).select().single();
          session = created;
        }
      }
    }

    if (session && flowDef) {
      flowHandled = true;
      const nodes: any[] = flowDef.nodes || [];
      const edges: any[] = flowDef.edges || [];
      let currentNodeId: string | null = session.current_node_id;
      const variables: Record<string, any> = { ...(session.variables || {}) };

      const findNode = (id: string | null) => nodes.find((n: any) => n.id === id) || null;
      const nextDefault = (id: string) => {
        const e = edges.find((x: any) => x.from === id && x.meta !== 'button');
        return e?.to || null;
      };

      // First, if waiting on buttons or collect, consume incoming message
      const cur = findNode(currentNodeId);
      if (cur?.type === 'buttons') {
        const list = (cur.data?.buttons || []) as any[];
        const text = (inboundContent || '').trim().toLowerCase();
        const idx = list.findIndex((b: any, i: number) => {
          const lbl = (typeof b === 'string' ? b : b.label || '').toLowerCase();
          return text === lbl || text === String(i + 1) || (lbl && text.includes(lbl));
        });
        if (idx >= 0) {
          const picked = list[idx];
          const target = (typeof picked === 'object' && picked.target) ? picked.target : nextDefault(currentNodeId!);
          variables[`${currentNodeId}_choice`] = typeof picked === 'string' ? picked : picked.label;
          currentNodeId = target;
        } else {
          // unknown reply: just re-send buttons with hint
          if (waCfg?.is_active) await sendWhatsAppButtons(waCfg, msg.phone, `Não entendi. ${cur.data?.content || 'Escolha uma opção:'}`, list.map((b: any) => typeof b === 'string' ? b : b.label));
          await admin.from('conversation_flow_sessions').update({ variables, updated_at: new Date().toISOString() }).eq('id', session.id);
          return new Response(JSON.stringify({ ok: true, flow: 'awaiting_button' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      } else if (cur?.type === 'collect') {
        variables[cur.data?.variable || 'value'] = inboundContent || '';
        currentNodeId = nextDefault(currentNodeId!);
      }

      // Walk forward, executing nodes until pause/end
      const maxSteps = 20;
      for (let step = 0; step < maxSteps && currentNodeId; step++) {
        const node = findNode(currentNodeId);
        if (!node) break;
        if (node.type === 'message') {
          if (waCfg?.is_active && node.data?.content) await sendWhatsApp(waCfg, msg.phone, String(node.data.content));
          await admin.from('messages').insert({ user_id: userId, client_id: client.id, direction: 'outbound', channel: 'whatsapp', content: node.data?.content || '', status: 'sent', sender_phone: msg.phone, metadata: { flow_node: node.id } });
          currentNodeId = nextDefault(currentNodeId);
        } else if (node.type === 'buttons') {
          const list = (node.data?.buttons || []) as any[];
          const labels = list.map((b: any) => typeof b === 'string' ? b : b.label).filter(Boolean);
          if (waCfg?.is_active) await sendWhatsAppButtons(waCfg, msg.phone, node.data?.content || 'Escolha uma opção:', labels);
          await admin.from('messages').insert({ user_id: userId, client_id: client.id, direction: 'outbound', channel: 'whatsapp', content: node.data?.content || '', status: 'sent', sender_phone: msg.phone, metadata: { flow_node: node.id, buttons: labels } });
          await admin.from('conversation_flow_sessions').update({ current_node_id: node.id, variables, updated_at: new Date().toISOString() }).eq('id', session.id);
          return new Response(JSON.stringify({ ok: true, flow: 'paused_buttons' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } else if (node.type === 'collect') {
          if (waCfg?.is_active && node.data?.question) await sendWhatsApp(waCfg, msg.phone, String(node.data.question));
          await admin.from('messages').insert({ user_id: userId, client_id: client.id, direction: 'outbound', channel: 'whatsapp', content: node.data?.question || '', status: 'sent', sender_phone: msg.phone, metadata: { flow_node: node.id } });
          await admin.from('conversation_flow_sessions').update({ current_node_id: node.id, variables, updated_at: new Date().toISOString() }).eq('id', session.id);
          return new Response(JSON.stringify({ ok: true, flow: 'paused_collect' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } else if (node.type === 'wait') {
          // soft wait: just advance
          currentNodeId = nextDefault(currentNodeId);
        } else if (node.type === 'end') {
          await admin.from('conversation_flow_sessions').update({ status: 'completed', current_node_id: node.id, variables, updated_at: new Date().toISOString() }).eq('id', session.id);
          return new Response(JSON.stringify({ ok: true, flow: 'completed' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } else {
          // condition / filter / ai / media / crm not yet executed deeply — just advance
          currentNodeId = nextDefault(currentNodeId);
        }
      }
      await admin.from('conversation_flow_sessions').update({ current_node_id: currentNodeId, variables, status: currentNodeId ? 'active' : 'completed', updated_at: new Date().toISOString() }).eq('id', session.id);
      return new Response(JSON.stringify({ ok: true, flow: 'advanced' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  } catch (e) {
    console.error('flow runner error', e);
  }

  // Skip AI in WhatsApp group chats unless agent explicitly opts in
  const isGroupChat = (msg as any).is_group === true;
  if (isGroupChat && agent && agent.respond_in_groups !== true) {
    return new Response(JSON.stringify({ ok: true, group_skipped: true, message_id: insertedMsg?.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // === DEBOUNCE ENQUEUE: agrupa rajadas curtas em vez de responder a cada msg ===
  // A janela de debounce respeita o TEMPO DE RESPOSTA configurado no agente
  // (response_delay_seconds). Se o usuário configurou 1s, espera 1s — não 8s.
  // debounce_seconds fica como teto máximo apenas quando response_delay_seconds = 0.
  const isOmniChatSnapshot = String(raw.EventType || raw.event_type || '').toLowerCase() === 'chats';
  // === DEBOUNCE: agrupa rajadas curtas em vez de responder a cada mensagem.
  // Aplica para TODOS os provedores (corrige duplicação no OmniConect/uazapi).
  if (!flowHandled && !isOmniChatSnapshot && (agent?.group_messages !== false) && convStateInit?.ai_active && convStateInit?.mode === 'ai') {
    try {
      const responseDelay = Number(agent.response_delay_seconds || 0);
      const fallbackDebounce = Number(agent.debounce_seconds || 8);
      // Janela efetiva = response_delay quando configurado, senão debounce_seconds, mínimo 1s, máximo 30s.
      const effectiveSec = Math.min(30, Math.max(1, responseDelay > 0 ? responseDelay : fallbackDebounce));
      const debounceMs = effectiveSec * 1000;
      console.log(`[FLOW] debounce window=${effectiveSec}s (response_delay=${responseDelay}, debounce_cfg=${fallbackDebounce})`);
      const processAfter = new Date(Date.now() + debounceMs).toISOString();
      const newEntry = { content: inboundContent, ts: new Date().toISOString(), external_id: msg.external_message_id || null };
      // ATOMIC enqueue: a Postgres-side RPC guarantees only one pending row per
      // client_id, so concurrent inbound messages always merge into the same
      // batch (fixes "oi / bom dia / tenho interesse" duplicating AI replies).
      const { error: enqErr } = await admin.rpc('enqueue_debounced_message', {
        _user_id: userId,
        _client_id: client.id,
        _agent_id: agent.id,
        _entry: newEntry,
        _process_after: processAfter,
      });
      if (enqErr) throw enqErr;
      try {
        const triggerDelay = debounceMs + 500;
        const triggerUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/cron-worker`;
        const triggerKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        // @ts-ignore EdgeRuntime is available in Deno Deploy
        (globalThis as any).EdgeRuntime?.waitUntil?.((async () => {
          await new Promise((r) => setTimeout(r, triggerDelay));
          await fetch(triggerUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${triggerKey}` }, body: JSON.stringify({ source: 'debounce-trigger' }) }).catch(() => {});
        })());
      } catch (e) { console.warn('waitUntil unavailable', e); }
      return new Response(JSON.stringify({ ok: true, message_id: insertedMsg?.id, debounced: true, process_after: processAfter }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (e) {
      console.error('debounce enqueue failed, falling back to direct AI', e);
      // fall through to immediate reply
    }
  }

  // AI auto-reply (skipped if flow handled the message)
  if (!flowHandled && waCfg?.ai_auto_reply !== false && convStateInit?.ai_active && convStateInit?.mode === 'ai' && agent) {
    try {
      const { data: history } = await admin.from('messages').select('direction, content')
        .eq('client_id', client.id).order('created_at', { ascending: false }).limit(20);
      const ordered = (history || []).reverse().filter((m: any) => m.content);
      const aiHistory = ordered.map((m: any) => ({
        role: m.direction === 'inbound' ? 'user' : 'assistant',
        content: m.content,
      }));
      // === KB CONTEXTUAL: busca por categoria/keywords da última msg do cliente ===
      const lastUserText = msg.content || ordered.filter((m: any) => m.direction === 'inbound').slice(-1)[0]?.content || '';
      const { data: knowledge } = await admin.from('agent_knowledge')
        .select('id, title, category, description, keywords, content, media_urls, external_links')
        .eq('agent_id', agent.id);
      const selected = knowledge?.length ? findKb(knowledge, lastUserText, 5) : [];
      const baseItems = selected.length ? selected : (knowledge || []).slice(0, 3);
      const ctx = baseItems.map((k: any) => {
        const links = Array.isArray(k.external_links) && k.external_links.length
          ? k.external_links.map((l: any) => `  - ${l.title}: ${l.url}`).join('\n') : '';
        const imgs = Array.isArray(k.media_urls) && k.media_urls.length
          ? `(${k.media_urls.length} imagem(ns) disponível(is) — sistema enviará automaticamente se o cliente pedir)` : '';
        return [
          `# ${k.title}${k.category ? ` [${k.category}]` : ''}`,
          k.description ? `Descrição: ${k.description}` : '',
          Array.isArray(k.keywords) && k.keywords.length ? `Palavras-chave: ${k.keywords.join(', ')}` : '',
          k.content ? String(k.content).slice(0, 1500) : '',
          links ? `Links:\n${links}` : '',
          imgs,
        ].filter(Boolean).join('\n');
      }).join('\n\n---\n\n').slice(0, 8000);

      const intent = detectIntent(lastUserText, agent);
      const attribution = (client as any)?.metadata?.attribution || null;
      const matchedProducts = await findMatchingProducts(admin, userId, agent.id, lastUserText, attribution);
      const matchedFaqs = await findMatchingFaqs(admin, userId, agent.id, lastUserText);
      const adContext = formatAdContext(attribution, matchedProducts[0]);
      const productsBlock = formatProductsForPrompt(matchedProducts);
      const faqBlock = formatFaqsForPrompt(matchedFaqs);
      const clientInfo = client?.name ? `Nome do contato: ${client.name}` : '';
      const sys = buildSystemPrompt(agent, ctx, { adContext, products: productsBlock, faq: faqBlock, clientInfo });
      await logConsultation(admin, userId, agent.id, client.id, lastUserText, {
        products: matchedProducts.map((p: any) => ({ id: p.id, name: p.name })),
        faqs: matchedFaqs.map((f: any) => ({ id: f.id, question: f.question })),
        knowledge: baseItems.map((k: any) => ({ id: k.id, title: k.title })),
        priority: agent.knowledge_priority || 'default',
        path: 'immediate',
      });
      const runtime = resolveAiRuntime(agent, providerCfg);
      // === VISÃO COMPUTACIONAL: passa a imagem direto pro modelo quando suportado ===
      // Substitui o conteúdo da última msg do usuário por blocos multimodais
      // [{text}, {image_url}] quando: msg atual é imagem, o agente permite
      // entender imagens, há media_url, e o modelo selecionado tem visão.
      if (
        msg.media_type === 'image' && msg.media_url &&
        agent?.understand_images !== false &&
        modelSupportsVision(runtime.provider || 'lovable', runtime.model) &&
        aiHistory.length > 0
      ) {
        const lastIdx = aiHistory.length - 1;
        const last = aiHistory[lastIdx];
        if (last.role === 'user') {
          const caption = msg.content && !String(msg.content).startsWith('[IMAGEM') ? String(msg.content) : '';
          (aiHistory[lastIdx] as any).content = [
            { type: 'text', text: caption ? `Imagem enviada pelo cliente. Legenda: ${caption}` : 'Imagem enviada pelo cliente. Analise e responda contextualmente.' },
            { type: 'image_url', image_url: { url: msg.media_url } },
          ];
        }
      }
      const reply = await callAiWithTools(admin, userId, client.id, client, agent, sys, aiHistory, runtime);
      if (reply) {
        let delivery = { ok: false, status: 0, body: 'WhatsApp inativo' };
        let voiceUsed = false;
        const voiceProv = agent.voice_provider || 'omni';
        // Omni / OpenAI TTS requires a real OpenAI key (Lovable Gateway has no TTS).
        // ElevenLabs requires its own key.
        const hasVoiceKey = voiceProv === 'elevenlabs' ? (!!elevenKey || !!openaiKey) : (!!openaiKey || !!elevenKey);
        const shouldReplyWithVoice = msg.media_type === 'audio' && agent.voice_enabled && agent.reply_to_audio_with_audio && hasVoiceKey;

        // Anexar links nomeados ao final do texto se existirem nos itens selecionados
        const linksToAppend = selected.flatMap((s: any) => Array.isArray(s.external_links) ? s.external_links : []).slice(0, 4);
        const replyWithLinks = linksToAppend.length
          ? `${reply}\n\n${linksToAppend.map((l: any) => `🔗 *${l.title}*: ${l.url}`).join('\n')}`
          : reply;

        if (waCfg?.is_active) {
          if (shouldReplyWithVoice) {
            if (agent.simulate_recording !== false) await sendPresence(waCfg, msg.phone, 'recording');
            const audioDataUrl = await generateTtsBase64(reply, agent.voice_id || 'alloy', openaiKey, voiceProv, elevenKey);
            if (audioDataUrl) {
              try { delivery = await sendWhatsAppAudio(waCfg, msg.phone, audioDataUrl) || delivery; voiceUsed = delivery.ok; }
              catch (e) { console.error('audio send fail', e); }
            }
            if (!voiceUsed) {
              try { delivery = await sendWhatsApp(waCfg, msg.phone, replyWithLinks) || delivery; }
              catch (e) { delivery = { ok: false, status: 500, body: String(e).slice(0, 500) }; }
            }
          } else {
            const chunks = (agent.split_long_messages !== false) ? splitMessage(replyWithLinks) : [replyWithLinks];
            const cfgDelaySec = Math.max(0, Math.min(300, Number(agent.response_delay_seconds) || 0));
            // Apply the configured response delay ONCE (before the first chunk),
            // not per chunk — previous behavior multiplied delay × N chunks.
            if (cfgDelaySec > 0) {
              if (agent.simulate_typing !== false) await sendPresence(waCfg, msg.phone, 'composing');
              await new Promise((r) => setTimeout(r, cfgDelaySec * 1000));
            }
            for (let i = 0; i < chunks.length; i++) {
              const chunk = chunks[i];
              if (i > 0 && agent.simulate_typing !== false) {
                // Small natural inter-chunk pause based on chunk length (max ~3s).
                await sendPresence(waCfg, msg.phone, 'composing');
                await new Promise((r) => setTimeout(r, Math.min(3000, 400 + chunk.length * 20)));
              } else if (i === 0 && cfgDelaySec === 0 && agent.simulate_typing !== false) {
                await sendPresence(waCfg, msg.phone, 'composing');
                await new Promise((r) => setTimeout(r, Math.min(3000, 400 + chunk.length * 20)));
              }
              try { delivery = await sendWhatsApp(waCfg, msg.phone, chunk) || delivery; }
              catch (e) { delivery = { ok: false, status: 500, body: String(e).slice(0, 500) }; console.error('whatsapp send failed', e); }
            }
          }

          // === ENVIAR IMAGENS dos itens selecionados se cliente pediu ou agente mencionou ===
          const replyMentionsMedia = /imagem|imagens|foto|fotos|envio|envia|mostra|catálogo|catalogo|drive/i.test(reply);
          if ((intent.wantsMedia || replyMentionsMedia) && selected.length) {
            const imagesToSend = selected.flatMap((s: any) =>
              (Array.isArray(s.media_urls) ? s.media_urls : []).slice(0, 3).map((url: string) => ({ url, caption: s.title }))
            ).slice(0, 6);
            for (const img of imagesToSend) {
              try {
                const sent = await sendWhatsAppImage(waCfg, msg.phone, img.url, img.caption);
                await admin.from('messages').insert({
                  user_id: userId, client_id: client.id, lead_id: client.lead_id,
                  direction: 'outbound', channel: 'whatsapp', content: img.caption || '',
                  media_url: img.url, media_type: 'image', status: sent.ok ? 'sent' : 'failed',
                  agent_id: agent.id, sender_phone: msg.phone,
                  metadata: { from_kb: true, external_status: sent.status },
                });
              } catch (e) { console.error('kb image send fail', e); }
            }
          }
        }

        await admin.from('messages').insert({
          user_id: userId, client_id: client.id, lead_id: client.lead_id,
          direction: 'outbound', channel: 'whatsapp', content: replyWithLinks,
          status: delivery.ok ? 'sent' : 'failed', agent_id: agent.id,
          sender_phone: msg.phone,
          external_message_id: (delivery as any).external_id || null,
          media_type: voiceUsed ? 'audio' : null,
          metadata: {
            external_status: delivery.status, external_body: delivery.body, voice: voiceUsed,
            kb_sources: selected.map((s: any) => ({ id: s.id, title: s.title, category: s.category })),
            intent,
            instance_id: waCfg?.instance_id || null,
            instance_label: waCfg?.label || null,
          },
        });

        // === HANDOFF: só desativa o agente em pedido EXPLÍCITO de humano.
        // Lead qualificado apenas notifica (agente continua atendendo até concluir).
        if (intent.handoff) {
          await admin.from('conversation_state').upsert({
            user_id: userId, client_id: client.id,
            ai_active: false, mode: 'manual',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'client_id' });
          await admin.from('notifications').insert({
            user_id: userId,
            type: 'handoff',
            title: '🙋 Cliente pediu atendimento humano',
            message: `${client.name || msg.phone}: "${(lastUserText || '').slice(0, 100)}"`,
            related_id: client.id,
            metadata: { phone: msg.phone, intent },
          });
        } else if (intent.qualified) {
          await admin.from('notifications').insert({
            user_id: userId,
            type: 'qualified',
            title: '✅ Lead qualificado',
            message: `${client.name || msg.phone}: "${(lastUserText || '').slice(0, 100)}"`,
            related_id: client.id,
            metadata: { phone: msg.phone, intent },
          });
        }

        // Credit deduction
        await admin.rpc('deduct_credits', { _user_id: userId, _amount: 1, _kind: 'ai_response', _metadata: { agent_id: agent.id, voice: voiceUsed, kb_used: selected.length } });
      }
    } catch (e) {
      console.error('AI reply failed', e);
    }
  }

  return new Response(JSON.stringify({ ok: true, message_id: insertedMsg?.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
