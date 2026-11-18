// Ferramentas externas (APIs de outros sistemas) usadas pelo agente de IA.
export function safeToolName(n: string) {
  return ('ext_' + (n || 'api').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_]+/g, '_')).slice(0, 60);
}

export function buildExternalToolDefs(tools: any[]) {
  return tools.map((t) => {
    const props: Record<string, any> = {};
    const required: string[] = [];
    for (const p of (Array.isArray(t.params) ? t.params : [])) {
      if (!p?.name) continue;
      props[p.name] = { type: p.type === 'number' ? 'number' : 'string', description: p.description || p.name };
      if (p.required) required.push(p.name);
    }
    if (t.kind === 'lead_push') {
      props.interesse = props.interesse || { type: 'string', description: 'Resumo do que o cliente procura' };
    }
    return {
      type: 'function',
      function: {
        name: safeToolName(t.name),
        description: (t.description || t.name).slice(0, 900),
        parameters: { type: 'object', properties: props, ...(required.length ? { required } : {}) },
      },
    };
  });
}

export async function execExternalTool(tool: any, args: Record<string, any>, lead?: { name?: string; phone?: string; email?: string }) {
  const method = String(tool.method || 'GET').toUpperCase();
  const headers: Record<string, string> = { Accept: 'application/json', ...(tool.headers || {}) };
  let url = String(tool.url || '');
  if (!/^https:\/\//i.test(url)) return JSON.stringify({ error: 'URL precisa começar com https://' });
  const payload: Record<string, any> = { ...(args || {}) };
  if (tool.kind === 'lead_push' && lead) {
    payload.nome = payload.nome || lead.name || '';
    payload.telefone = payload.telefone || lead.phone || '';
    if (lead.email) payload.email = payload.email || lead.email;
    payload.origem = payload.origem || 'Omni Builder CRM - WhatsApp';
  }
  const init: RequestInit = { method, headers };
  if (method === 'GET') {
    const u = new URL(url);
    for (const [k, v] of Object.entries(payload)) if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
    url = u.toString();
  } else {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(payload);
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal });
    const text = await r.text();
    return JSON.stringify({ status: r.status, ok: r.ok, data: text.slice(0, 6000) });
  } catch (e) {
    return JSON.stringify({ error: 'Falha ao acessar o sistema externo: ' + String(e).slice(0, 200) });
  } finally { clearTimeout(timer); }
}
