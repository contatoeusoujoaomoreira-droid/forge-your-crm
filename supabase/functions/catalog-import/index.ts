import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { isPublicHttpsUrl } from '../_shared/integrationPolicy.ts';

const MAX_BYTES = 8 * 1024 * 1024;
const privateIp = (ip: string) => {
  if (ip.includes(':')) return !/^[23]/i.test(ip) || ip.startsWith('2001:db8');
  const [a,b] = ip.split('.').map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || b === 2)) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19 || b === 51)) || (a === 203 && b === 0);
};
Deno.serve(async req => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);
  try {
    const serviceUrl = Deno.env.get('SUPABASE_URL'); const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceUrl || !serviceKey) return json({ error: 'Serviço indisponível' }, 503);
    const sb = createClient(serviceUrl, serviceKey);
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: auth, error } = await sb.auth.getUser(token);
    if (error || !auth.user) return json({ error: 'Sessão expirada' }, 401);
    const parsed = z.object({ url: z.string().max(2048) }).safeParse(await req.json());
    if (!parsed.success || !isPublicHttpsUrl(parsed.data.url)) return json({ error: 'Informe um endereço público HTTPS de feed XML.' }, 400);
    const url = new URL(parsed.data.url);
    if (url.port && url.port !== '443') return json({ error: 'Use a porta HTTPS padrão.' }, 400);
    const ips = (await Promise.all(['A','AAAA'].map(type => Deno.resolveDns(url.hostname, type as 'A' | 'AAAA').catch(() => [])))).flat();
    if (!ips.length || ips.some(privateIp)) return json({ error: 'Endereço de destino não permitido.' }, 400);
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(12000), headers: { Accept: 'application/xml,text/xml,application/rss+xml,application/atom+xml' } });
    if (!response.ok) return json({ error: 'O fornecedor não disponibilizou o arquivo. Confira o endereço e as permissões.' }, 400);
    if (Number(response.headers.get('content-length') || 0) > MAX_BYTES) return json({ error: 'O feed deve ter até 8 MB.' }, 400);
    const reader = response.body?.getReader(); if (!reader) return json({ error: 'Arquivo vazio.' }, 400);
    const parts: Uint8Array[] = []; let size = 0;
    while (true) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.length; if (size > MAX_BYTES) { await reader.cancel(); return json({ error: 'O feed deve ter até 8 MB.' }, 400); } parts.push(chunk.value); }
    const bytes = new Uint8Array(size); let offset = 0; for (const part of parts) { bytes.set(part, offset); offset += part.length; }
    const xml = new TextDecoder().decode(bytes);
    if (/<!DOCTYPE|<!ENTITY/i.test(xml)) return json({ error: 'XML com entidades externas não é permitido.' }, 400);
    return json({ xml });
  } catch { return json({ error: 'Não foi possível ler o feed. Use um XML público, sem redirecionamento, ou envie o arquivo.' }, 400); }
});