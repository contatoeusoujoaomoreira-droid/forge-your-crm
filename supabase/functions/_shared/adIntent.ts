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
