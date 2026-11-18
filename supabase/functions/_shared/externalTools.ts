// Ferramentas externas (APIs de outros sistemas) usadas pelo agente de IA.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { API_METHODS, isPublicHttpsUrl } from './integrationPolicy.ts';
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
  if (!API_METHODS.includes(method)) return JSON.stringify({ error: 'Método não permitido' });
  const admin = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');
  const { data: credentials, error: credentialError } = await admin.from('external_tool_credentials').select('headers').eq('tool_id', tool.id).maybeSingle();
  if (credentialError) return JSON.stringify({ error: 'Não foi possível carregar a credencial protegida.' });
  const headers: Record<string, string> = { Accept: 'application/json', ...(credentials?.headers || {}) };
  let url = String(tool.url || '');
  if (!isPublicHttpsUrl(url)) return JSON.stringify({ error: 'Informe um endereço HTTPS público.' });
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
    const r = await fetch(url, { ...init, redirect: 'error', signal: ctrl.signal });
    const text = await r.text();
    let safeText = text;
    for (const value of Object.values(credentials?.headers || {})) {
      if (typeof value === 'string' && value) {
        safeText = safeText.split(value).join('[credencial protegida]');
        if (value.startsWith('Bearer ')) safeText = safeText.split(value.slice(7)).join('[credencial protegida]');
      }
    }
    return JSON.stringify({ status: r.status, ok: r.ok, data: safeText.slice(0, 6000) });
  } catch (e) {
    return JSON.stringify({ error: 'O sistema externo não respondeu ou tentou redirecionar a solicitação.' });
  } finally { clearTimeout(timer); }
}
