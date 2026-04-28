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
  knowledge_id: string;
}

// Extract plain text from a PDF using Gemini multimodal (works for any size up to gateway limit)
async function extractWithGemini(base64: string, mime: string): Promise<string> {
  const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Extraia TODO o texto deste documento/imagem. Mantenha estrutura e quebras de parágrafo. Não resuma, transcreva fielmente. Se houver tabelas, formate em texto. Apenas o conteúdo, sem comentários.' },
          { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } },
        ],
      }],
    }),
  });
  if (!resp.ok) throw new Error(`Gemini ${resp.status}: ${await resp.text()}`);
  const j = await resp.json();
  return j.choices?.[0]?.message?.content || '';
}

async function extractFromUrl(url: string): Promise<string> {
  const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!resp.ok) throw new Error(`URL ${resp.status}`);
  const html = await resp.text();
  // basic HTML to text
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50000);
}

// Chunk large text into pieces under ~6k chars to keep model context healthy
function chunkText(text: string, size = 6000): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
  return chunks;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: uerr } = await userClient.auth.getUser();
    if (uerr || !userData?.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const userId = userData.user.id;

    const body: Body = await req.json();
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);
    const { data: kn } = await admin.from('agent_knowledge').select('*').eq('id', body.knowledge_id).eq('user_id', userId).maybeSingle();
    if (!kn) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Pre-charge credits for knowledge ingestion (super_admin / unlimited skipped)
    const { data: pre } = await admin.rpc('deduct_credits_by_action', {
      _user_id: userId, _action: 'knowledge_ingest', _quantity: 1,
      _metadata: { knowledge_id: kn.id, type: kn.type, mime: kn.mime_type || null },
    });
    if (pre && (pre as any).ok === false) {
      return new Response(JSON.stringify({ error: 'Créditos insuficientes para processar conhecimento.', code: 'insufficient_credits' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await admin.from('agent_knowledge').update({ status: 'processing', error: null }).eq('id', kn.id);

    let extracted = '';
    try {
      if (kn.type === 'url' && kn.source_url) {
        extracted = await extractFromUrl(kn.source_url);
      } else if (kn.type === 'file' && kn.file_path) {
        const { data: fileBlob, error: dlErr } = await admin.storage.from('agent-knowledge').download(kn.file_path);
        if (dlErr || !fileBlob) throw new Error(dlErr?.message || 'download failed');
        const mime = kn.mime_type || fileBlob.type || 'application/octet-stream';

        if (mime.startsWith('text/') || mime === 'application/json') {
          extracted = await fileBlob.text();
        } else if (mime.startsWith('image/') || mime === 'application/pdf') {
          const buf = new Uint8Array(await fileBlob.arrayBuffer());
          // base64 encode
          let bin = '';
          for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
          const b64 = btoa(bin);
          extracted = await extractWithGemini(b64, mime);
        } else if (mime.startsWith('video/') || mime.startsWith('audio/')) {
          extracted = `[Mídia ${mime} — ${kn.title}] Conteúdo será referenciado pelo agente.`;
        } else {
          // Try as text
          try { extracted = await fileBlob.text(); }
          catch { extracted = `[Arquivo ${mime}: ${kn.title}]`; }
        }
      } else {
        extracted = kn.content || '';
      }
    } catch (e) {
      console.error('extract failed', e);
      await admin.from('agent_knowledge').update({ status: 'error', error: String(e) }).eq('id', kn.id);
      return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Save: keep full content, also expose chunked versions when needed via splitting
    const chunks = chunkText(extracted);
    await admin.from('agent_knowledge').update({
      content: extracted,
      status: 'ready',
      error: null,
    }).eq('id', kn.id);

    return new Response(JSON.stringify({ ok: true, length: extracted.length, chunks: chunks.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('extract-knowledge', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
