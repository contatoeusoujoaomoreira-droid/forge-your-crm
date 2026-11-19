// Detecta mensagens que chegam de anúncio ou com intenção direta (qualquer segmento:
// produtos, lojas, imóveis, serviços). Quando detectado, o menu de boas-vindas é pulado.
const AD_PHRASES = [
  'vi o anuncio', 'vi seu anuncio', 'vi no anuncio', 'vi no instagram', 'vi no facebook', 'vi no site',
  'tenho interesse', 'tenho interesse no', 'tenho interesse na', 'quero saber mais', 'gostaria de saber mais',
  'gostaria de mais informacoes', 'quero mais informacoes', 'mais informacoes sobre', 'informacoes sobre',
  'ainda esta disponivel', 'esta disponivel', 'quero esse', 'quero este', 'quero comprar', 'quero alugar',
];
const FIELD_RE = /(^|\n|\s)(c[oó]digo|c[oó]d\.?|ref\.?|refer[eê]ncia|sku|produto|item|modelo|marca|endere[cç]o|edif[ií]cio|condom[ií]nio|empreendimento|pre[cç]o|valor|bairro)\s*[:#-]/i;
const CODE_RE = /\b(?=[a-z]*\d)[a-z]{1,5}[-_ ]?\d{2,8}\b|\b\d{3,8}[a-z]{0,3}\b|#\s?\d{2,}/i;

export function normalizeText(s: string) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function detectAdIntent(raw: string, rawPayload?: any): boolean {
  const text = String(raw || '');
  if (!text.trim()) return false;
  const p = JSON.stringify(rawPayload || {}).toLowerCase();
  if (/"(externaladreply|ctwa_clid|ctwaclid|conversionsource|sourceurl|referral)"/.test(p) || p.includes('fb_ads') || p.includes('ctwa')) return true;
  const n = normalizeText(text);
  if (/https?:\/\//.test(n)) return true;
  if (FIELD_RE.test(text)) return true;
  const bullets = (text.match(/[*▫️•✅📍🏠🔹➡️]/gu) || []).length;
  if (bullets >= 2 && text.length > 30) return true;
  if (AD_PHRASES.some((k) => n.includes(k))) return true;
  if (CODE_RE.test(n) && n.split(/\s+/).length <= 12) return true;
  return false;
}

export function matchCustomAdRules(raw: string, keywords: string, mode: string): boolean {
  const clean = (x: string) => normalizeText(x).replace(/[*_~▫️•]/gu, ' ').replace(/\s+/g, ' ').trim();
  const t = clean(raw);
  if (!t) return false;
  const list = String(keywords || '').split(/[\n,]/).map(clean).filter(Boolean);
  return list.some((k) => mode === 'exact' ? t === k : mode === 'starts' ? t.startsWith(k) : t.includes(k));
}

export function shouldAttendDirect(raw: string, payload: unknown, settings: any): boolean {
  if (matchCustomAdRules(raw, settings?.ad_keywords || '', settings?.ad_match_mode || 'contains')) return true;
  if (settings?.ad_auto_detect !== false && detectAdIntent(raw, payload)) return true;
  if (settings?.direct_open_requests === false) return false;
  const text = normalizeText(raw).trim();
  // Short greetings and menu choices must remain in the welcome menu.
  if (/^(oi|ola|bom dia|boa tarde|boa noite|tudo bem|[0-9]+|opt[0-9]+)[!?.\s]*$/.test(text)) return false;
  if (matchCustomAdRules(raw, settings?.keywords || '', 'contains')) return true;
  return /\b(quero|procuro|busco|preciso|gostaria|tem|voc[eê]s tem|voces vendem|quanto custa|qual o preco|consultar|buscar|comprar|alugar|estoque|disponibilidade)\b/.test(text)
    && text.split(/\s+/).length >= 2;
}

export function directRequestInstructions(settings: any): string {
  const mode = settings?.direct_open_requests !== false
    ? 'PEDIDOS ABERTOS: quando houver um pedido relacionado às integrações habilitadas, consulte usando os dados disponíveis, mesmo sem código e mesmo com apenas um critério. Não exija duas respostas antes de buscar. Use os resultados para esclarecer apenas o que faltar; saudação sem pedido continua no menu.'
    : 'PEDIDOS GENÉRICOS: quando faltar informação para escolher o item, faça uma pergunta curta de cada vez antes de buscar. Código, referência, link ou anúncio identificável sempre têm prioridade e devem ser consultados diretamente.';
  return `\n\nATENDIMENTO DIRETO (prioridade sobre qualificação): ${mode} Nunca repita perguntas já respondidas. Não invente dados, não confirme ações sem sucesso da ferramenta e não transfira para humano só por enviar um link ou receber uma solicitação que a integração cobre. As instruções abaixo não permitem ferramentas desativadas nem assuntos fora do atendimento.\nOrientações da empresa: ${String(settings?.direct_instructions || '').slice(0, 4000)}`;
}
